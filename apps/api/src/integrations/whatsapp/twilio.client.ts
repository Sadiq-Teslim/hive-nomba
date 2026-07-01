import crypto from "node:crypto";
import axios from "axios";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

/**
 * Twilio WhatsApp client. Much faster to stand up than Meta — the Twilio Sandbox
 * gives you a working WhatsApp number in minutes.
 *
 * Twilio addresses are `whatsapp:+<E164>`. Internally Hive stores bare digits
 * (e.g. 2348190000002), so we convert at the boundary.
 */

const MESSAGES_URL = (sid: string) => `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

/** Bare digits / various inputs → Twilio `whatsapp:+<E164>`. */
export function toTwilioAddress(phone: string): string {
  if (phone.startsWith("whatsapp:")) return phone;
  const digits = phone.replace(/[^\d]/g, "");
  return `whatsapp:+${digits}`;
}

export async function sendTwilioWhatsApp(to: string, body: string): Promise<void> {
  const form = new URLSearchParams({
    From: toTwilioAddress(env.TWILIO_WHATSAPP_FROM),
    To: toTwilioAddress(to),
    Body: body,
  });

  try {
    await axios.post(MESSAGES_URL(env.TWILIO_ACCOUNT_SID), form.toString(), {
      auth: { username: env.TWILIO_ACCOUNT_SID, password: env.TWILIO_AUTH_TOKEN },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  } catch (err) {
    const detail = axios.isAxiosError(err) ? err.response?.data : err;
    logger.error({ to, detail }, "Failed to send Twilio WhatsApp message");
    throw err;
  }
}

/** Fetch inbound media (Twilio media URLs require Basic auth) → base64 + mime. */
export async function fetchTwilioMedia(mediaUrl: string): Promise<{ base64: string; mimeType: string }> {
  const res = await axios.get(mediaUrl, {
    auth: { username: env.TWILIO_ACCOUNT_SID, password: env.TWILIO_AUTH_TOKEN },
    responseType: "arraybuffer",
  });
  const mimeType = (res.headers["content-type"] as string) ?? "image/jpeg";
  return { base64: Buffer.from(res.data).toString("base64"), mimeType };
}

/**
 * Validate Twilio's X-Twilio-Signature: HMAC-SHA1 over (full URL + sorted POST
 * params concatenated) using the auth token, base64-encoded. The URL must be the
 * exact public URL Twilio called (mind the tunnel host).
 */
export function validateTwilioSignature(fullUrl: string, params: Record<string, string>, signature?: string): boolean {
  if (!signature) return false;
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], fullUrl);
  const expected = crypto.createHmac("sha1", env.TWILIO_AUTH_TOKEN).update(Buffer.from(data, "utf-8")).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
