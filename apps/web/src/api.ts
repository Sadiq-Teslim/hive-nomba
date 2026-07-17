// Typed client for the Hive dashboard API. All data here is real — served by
// @hive/api from the same Postgres the WhatsApp agent writes to.

export interface Merchant {
  id: string;
  businessName: string | null;
  phone: string;
  onboarded: boolean;
  verificationStatus: VerificationStatus;
  whatsappConnectionStatus: WhatsAppConnectionStatus;
  setupState: MerchantSetupState;
  storefrontSlug: string | null;
  storefrontCode: string | null;
}

export type VerificationStatus = "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
export type WhatsAppConnectionStatus =
  | "NOT_CONNECTED"
  | "WAITING_FOR_ACTIVATION"
  | "CONNECTED"
  | "CODE_EXPIRED"
  | "CONNECTION_FAILED";
export type MerchantSetupState =
  | "AWAITING_ACTIVATION"
  | "CONFIRMING_BUSINESS"
  | "CONFIGURING_FULFILMENT"
  | "CONFIGURING_POLICY"
  | "READY_TO_ADD_PRODUCT"
  | "ACTIVE";

export interface TopProduct {
  name: string;
  units: number;
  revenueKobo: number;
}

export interface Analytics {
  windowDays: number;
  revenueKobo: number;
  orderCount: number;
  avgOrderKobo: number;
  pendingOrders: number;
  totalProducts: number;
  totalCustomers: number;
  topProducts: TopProduct[];
}

export interface Overview {
  merchant: {
    id: string;
    businessName: string | null;
    verificationStatus: VerificationStatus;
    trustLevel: string;
    whatsappConnectionStatus: WhatsAppConnectionStatus;
    setupState: MerchantSetupState;
  };
  analytics: Analytics;
}

export interface SetupStatus {
  merchant: {
    id: string;
    businessName: string | null;
    category: string | null;
    verificationStatus: VerificationStatus;
    trustLevel: string;
    whatsappConnectionStatus: WhatsAppConnectionStatus;
    setupState: MerchantSetupState;
    deliveryOption: "DELIVERY" | "PICKUP" | "BOTH" | null;
    deliveryLocations: string | null;
    returnPolicy: string | null;
  };
  checklist: { key: string; label: string; complete: boolean }[];
  activation: { codePreview: string; expiresAt: string; usedAt: string | null; expired: boolean } | null;
  share: {
    storeUrl: string | null;
    whatsappUrl: string | null;
    qrPayload: string | null;
    storeCode: string | null;
    greeting: string | null;
  };
}

export interface Product {
  id: string;
  name: string;
  price: string;
  priceKobo: number;
  stock: number;
  active: boolean;
  imageUrl: string | null;
}

export type OrderStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PAID"
  | "ACCEPTED"
  | "PROCESSING"
  | "READY_FOR_PICKUP"
  | "DISPATCHED"
  | "DELIVERED"
  | "FULFILLED"
  | "CANCELLED"
  | "REFUND_REQUESTED"
  | "REFUNDED"
  | "DISPUTED";

export interface Order {
  reference: string;
  status: OrderStatus;
  total: string;
  totalKobo: number;
  customer: string | null;
  items: { name: string; quantity: number }[];
  createdAt: string;
}

export interface RiskEvent {
  id: string;
  eventType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reason: string;
  status: string;
  createdAt: string;
}

export interface Dispute {
  id: string;
  status: string;
  reason: string;
  description: string | null;
  order: string | null;
  customer: string | null;
  createdAt: string;
}

export interface Handover {
  id: string;
  phone: string;
  reason: string;
  status: "REQUESTED" | "ACTIVE";
  createdAt: string;
}

/**
 * API origin. Empty in dev (Vite proxies /api → the backend). In production set
 * VITE_API_BASE to the deployed API URL (e.g. https://hive-api.onrender.com).
 */
export const API_ORIGIN = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

const BASE = `${API_ORIGIN}/api/dashboard`;

const authHeaders = (): Record<string, string> => {
  const token = window.localStorage.getItem("hive_session_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  merchants: () => get<Merchant[]>("/merchants"),
  overview: (id: string) => get<Overview>(`/merchants/${id}/overview`),
  products: (id: string) => get<Product[]>(`/merchants/${id}/products`),
  orders: (id: string) => get<Order[]>(`/merchants/${id}/orders`),
  setup: (id: string) => get<SetupStatus>(`/merchants/${id}/setup`),
  riskEvents: (id: string) => get<RiskEvent[]>(`/merchants/${id}/risk-events`),
  disputes: (id: string) => get<Dispute[]>(`/merchants/${id}/disputes`),
  handovers: (id: string) => get<Handover[]>(`/merchants/${id}/handovers`),
  replyHandover: async (id: string, handoverId: string, text: string) => {
    const res = await fetch(`${BASE}/merchants/${id}/handovers/${handoverId}/reply`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ text }) });
    if (!res.ok) throw new Error("Could not send the WhatsApp reply.");
    return res.json();
  },
  returnHandover: async (id: string, handoverId: string) => {
    const res = await fetch(`${BASE}/merchants/${id}/handovers/${handoverId}/return`, { method: "PATCH", headers: authHeaders() });
    if (!res.ok) throw new Error("Could not return this conversation to Hive.");
    return res.json();
  },
};

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_ORIGIN}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(typeof data.error === "string" ? data.error : `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const onboardingApi = {
  account: (body: { fullName: string; email: string; phone: string; password: string }) =>
    post<{ merchant: { id: string }; session: { token: string; expiresAt: string } }>("/onboarding/account", body),
  login: (body: { email: string; password: string }) =>
    post<{ merchant: { id: string; businessName: string | null }; session: { token: string; expiresAt: string } }>("/onboarding/login", body),
  business: async (merchantId: string, body: Record<string, unknown>) => {
    const res = await fetch(`${API_ORIGIN}/api/onboarding/${merchantId}/business`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(typeof data.error === "string" ? data.error : "Could not save business details.");
    }
    return res.json();
  },
  activationCode: (merchantId: string) =>
    post<{ code: string; expiresAt: string; hiveWhatsAppNumber: string }>(`/onboarding/${merchantId}/activation-code`),
};

export function saveMerchantSession(merchantId: string, token: string) {
  window.localStorage.setItem("hive_merchant_id", merchantId);
  window.localStorage.setItem("hive_session_token", token);
}

export interface PublicShop {
  id: string;
  businessName: string;
  category: string | null;
  greeting: string;
  storeCode: string;
  whatsappUrl: string;
}

export const publicApi = {
  shop: async (slug: string) => {
    const res = await fetch(`${API_ORIGIN}/api/shops/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error(res.status === 404 ? "This store link is invalid or no longer active." : `${res.status} ${res.statusText}`);
    const data = (await res.json()) as {
      merchant: { id: string; businessName: string | null; category: string | null };
      share: { storeCode: string | null; whatsappUrl: string | null; greeting: string | null };
    };
    if (!data.merchant.businessName || !data.share.storeCode || !data.share.whatsappUrl) {
      throw new Error("This store is not ready to receive buyers.");
    }
    return {
      id: data.merchant.id,
      businessName: data.merchant.businessName,
      category: data.merchant.category,
      greeting: data.share.greeting ?? `Hi, I'm Hive, ${data.merchant.businessName}'s shopping assistant.`,
      storeCode: data.share.storeCode,
      whatsappUrl: data.share.whatsappUrl,
    } satisfies PublicShop;
  },
};

/** Format kobo (minor units) as ₦ currency. */
export function naira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(kobo / 100);
}
