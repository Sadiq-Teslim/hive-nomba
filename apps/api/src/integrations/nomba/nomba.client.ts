import axios, { AxiosInstance } from "axios";
import { env, features } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { koboToNaira } from "../../utils/money.js";

/**
 * Nomba client.
 *
 * Auth: client-credentials -> short-lived bearer token (cached until expiry).
 * Core action for the MVP: create a hosted checkout (payment link) for an order.
 *
 * When Nomba credentials are not configured, this client returns a deterministic
 * mock payment link so the full WhatsApp -> AI -> payment loop can be demoed
 * locally. Swap in real credentials to go live.
 */

interface TokenState {
  token: string;
  expiresAt: number; // epoch ms
}

export interface CheckoutResult {
  checkoutUrl: string;
  providerRef: string;
  mocked: boolean;
}

const http: AxiosInstance = axios.create({
  baseURL: env.NOMBA_BASE_URL,
  timeout: 15000,
});

let tokenState: TokenState | null = null;

async function getToken(): Promise<string> {
  const now = Date.now();
  if (tokenState && tokenState.expiresAt > now + 30_000) return tokenState.token;

  const res = await http.post(
    "/v1/auth/token/issue",
    {
      grant_type: "client_credentials",
      client_id: env.NOMBA_CLIENT_ID,
      client_secret: env.NOMBA_PRIVATE_KEY,
    },
    { headers: { accountId: env.NOMBA_ACCOUNT_ID } },
  );

  const data = res.data?.data ?? res.data;
  const token: string = data.access_token;
  // Nomba returns an absolute expiry; fall back to ~25 min if absent.
  const expiresAt = data.expiresAt ? new Date(data.expiresAt).getTime() : now + 25 * 60_000;
  tokenState = { token, expiresAt };
  return token;
}

export interface CreateCheckoutInput {
  orderReference: string;
  amountKobo: number;
  currency?: string;
  customerEmail?: string;
  customerName?: string;
  callbackUrl: string;
}

export async function createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
  if (!features.nomba) {
    // Mock mode — lets the demo run without live credentials.
    const providerRef = `MOCK-${input.orderReference}`;
    const checkoutUrl = `${env.PUBLIC_BASE_URL}/mock/checkout/${input.orderReference}`;
    logger.warn({ orderReference: input.orderReference }, "Nomba not configured — returning mock checkout link");
    return { checkoutUrl, providerRef, mocked: true };
  }

  const token = await getToken();
  const res = await http.post(
    "/v1/checkout/order",
    {
      order: {
        orderReference: input.orderReference,
        callbackUrl: input.callbackUrl,
        customerEmail: input.customerEmail,
        customerId: input.customerName,
        amount: koboToNaira(input.amountKobo),
        currency: input.currency ?? "NGN",
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        accountId: env.NOMBA_ACCOUNT_ID,
      },
    },
  );

  // Nomba returns HTTP 200 even for business errors — the real status is in `code`.
  if (res.data?.code && res.data.code !== "00") {
    logger.error({ body: res.data }, "Nomba checkout business error");
    throw new Error(`Nomba: ${res.data.description ?? res.data.code}`);
  }

  const data = res.data?.data ?? res.data;
  const checkoutUrl = data.checkoutLink ?? data.checkout_url;
  if (!checkoutUrl) {
    logger.error({ status: res.status, body: res.data }, "Nomba checkout returned no link");
    throw new Error("Nomba did not return a checkout link");
  }
  return {
    checkoutUrl,
    providerRef: data.orderReference ?? input.orderReference,
    mocked: false,
  };
}

export interface CheckoutStatus {
  found: boolean;
  paid: boolean;
  status?: string;
  txnId?: string; // Nomba transaction id of the successful payment (for refunds)
  mocked: boolean;
  raw?: unknown;
}

/**
 * Actively query Nomba for an order's payment status, using OUR order reference
 * (the one we sent at checkout, e.g. HIVE-7Q2K9F — Nomba echoes it as
 * `orderReference`). This is our source of truth for reconciliation: we don't
 * rely on webhooks alone, since they can be unconfigured or dropped (esp. sandbox).
 *
 * Endpoint returns { data: { results: [ { orderReference, status, amount, ... } ] } }.
 * A payment is confirmed when any result for this order has status SUCCESS.
 */
export async function getCheckoutStatus(orderReference: string): Promise<CheckoutStatus> {
  if (!features.nomba) return { found: false, paid: false, mocked: true };

  const token = await getToken();
  const res = await http.get("/v1/transactions/accounts", {
    params: { orderReference },
    headers: { Authorization: `Bearer ${token}`, accountId: env.NOMBA_ACCOUNT_ID },
  });

  const results: any[] = res.data?.data?.results ?? [];
  // Be defensive: only consider transactions actually tied to this order.
  const mine = results.filter((t) => t?.orderReference === orderReference);
  const success = mine.find((t) => String(t?.status).toUpperCase() === "SUCCESS");

  if (!success) logger.debug({ orderReference, count: mine.length }, "Nomba: no SUCCESS transaction yet");
  return {
    found: mine.length > 0,
    paid: Boolean(success),
    status: success ? "SUCCESS" : mine[0]?.status,
    txnId: success?.id,
    mocked: false,
    raw: res.data,
  };
}

export interface VirtualAccount {
  accountNumber: string;
  bankName: string;
  accountName: string;
  mocked: boolean;
}

/**
 * Create a dedicated Nomba virtual account for an order, so the customer can pay
 * by bank transfer. `accountRef` should be the order reference so the inbound
 * transfer can be tied back to the order.
 */
export async function createVirtualAccount(accountRef: string, accountName: string): Promise<VirtualAccount> {
  if (!features.nomba) {
    return { accountNumber: "0000000000", bankName: "Nomba (mock)", accountName, mocked: true };
  }
  const token = await getToken();
  const res = await http.post(
    "/v1/accounts/virtual",
    { accountRef, accountName },
    { headers: { Authorization: `Bearer ${token}`, accountId: env.NOMBA_ACCOUNT_ID } },
  );
  if (res.data?.code && res.data.code !== "00") {
    throw new Error(`Nomba: ${res.data.description ?? res.data.code}`);
  }
  const d = res.data?.data ?? {};
  return {
    accountNumber: d.bankAccountNumber,
    bankName: d.bankName,
    accountName: d.bankAccountName ?? accountName,
    mocked: false,
  };
}

/** Find the Nomba transaction id for a paid order (needed to issue a refund). */
export async function getTransactionId(orderReference: string): Promise<string | null> {
  const status = await getCheckoutStatus(orderReference);
  return status.txnId ?? null;
}

/** Refund a paid checkout transaction by its Nomba transaction id. */
export async function refundCheckout(transactionId: string): Promise<{ ok: boolean; message: string; mocked: boolean }> {
  if (!features.nomba) return { ok: true, message: "Refund triggered (mock)", mocked: true };
  const token = await getToken();
  const res = await http.post(
    "/v1/checkout/refund",
    { transactionId },
    { headers: { Authorization: `Bearer ${token}`, accountId: env.NOMBA_ACCOUNT_ID } },
  );
  const ok = res.data?.code === "00" || res.data?.status === true;
  return { ok, message: res.data?.description ?? (ok ? "Refund triggered" : "Refund failed"), mocked: false };
}
