import crypto from "node:crypto";
import { env, features } from "../../config/env.js";
import { logger } from "../../config/logger.js";

/**
 * Verify a Nomba webhook signature. Nomba signs the raw request body with your
 * webhook secret (HMAC-SHA256). We compare against the signature header.
 *
 * If no secret is configured (local/mock mode), verification is skipped.
 */
export function verifyNombaSignature(rawBody: Buffer, signature?: string): boolean {
  if (!features.nomba || !env.NOMBA_WEBHOOK_SECRET) return true; // mock/local
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", env.NOMBA_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    logger.warn("Nomba signature length mismatch");
    return false;
  }
}

/** Normalize the various shapes Nomba may send into a flat event. */
export interface NombaEvent {
  type: string;
  /**
   * Every candidate id we can find in the payload. Nomba returns its OWN
   * orderReference (a UUID) at checkout - different from our HIVE-xxx ref - so we
   * collect all of them and let the handler match against either our order
   * reference or the stored Nomba providerRef.
   */
  references: string[];
  status?: string;
  isSuccess: boolean;
}

export function parseNombaEvent(body: any): NombaEvent {
  const type: string = body?.event_type ?? body?.type ?? "";
  const data = body?.data ?? body;

  const candidates = [
    data?.order?.orderReference,
    data?.orderReference,
    data?.merchant?.orderReference,
    data?.transaction?.merchantTxRef,
    data?.transaction?.transactionId,
    data?.reference,
    data?.transactionId,
  ];
  const references = [...new Set(candidates.filter((v): v is string => typeof v === "string" && v.length > 0))];

  const status: string | undefined = data?.transaction?.status ?? data?.status;

  const isSuccess =
    /payment_success|payment\.success|success|paid/i.test(type) ||
    /success|paid|successful/i.test(status ?? "");

  return { type, references, status, isSuccess };
}
