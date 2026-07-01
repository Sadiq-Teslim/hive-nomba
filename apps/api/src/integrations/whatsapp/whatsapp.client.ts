import { env, features } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import type { AgentReply } from "../../agent/index.js";
import { sendMetaWhatsApp, sendMetaButtons, sendMetaCtaUrl, fetchMetaMedia } from "./meta.client.js";
import { sendTwilioWhatsApp } from "./twilio.client.js";

/**
 * Provider-agnostic WhatsApp send. Dispatches to Twilio or Meta based on
 * WHATSAPP_PROVIDER. When the active provider isn't configured, it mock-logs so
 * local development and the simulator work without any WhatsApp account.
 */
export async function sendWhatsAppText(to: string, body: string): Promise<void> {
  if (!features.whatsapp) {
    logger.info({ to, body, provider: features.whatsappProvider }, "📲 [mock WhatsApp] outbound message");
    return;
  }

  if (env.WHATSAPP_PROVIDER === "twilio") {
    await sendTwilioWhatsApp(to, body);
  } else {
    await sendMetaWhatsApp(to, body);
  }
}

/** Render a structured reply as plain text (for channels without native buttons). */
function renderAsText(reply: AgentReply): string {
  let out = reply.text;
  if (reply.cta) out += `\n\n💳 ${reply.cta.label}: ${reply.cta.url}`;
  if (reply.buttons?.length) out += `\n\n${reply.buttons.map((b) => `• ${b}`).join("\n")}`;
  return out;
}

/**
 * Send a structured agent reply. On Meta we use native interactive messages
 * (a "Pay Now" URL button, or quick-reply buttons). Twilio/mock fall back to text.
 */
export async function sendWhatsAppReply(to: string, reply: AgentReply): Promise<void> {
  if (!features.whatsapp) {
    logger.info({ to, ...reply, provider: features.whatsappProvider }, "📲 [mock WhatsApp] outbound reply");
    return;
  }

  if (env.WHATSAPP_PROVIDER === "meta") {
    if (reply.cta) return sendMetaCtaUrl(to, reply.text, reply.cta.label, reply.cta.url);
    if (reply.buttons?.length) return sendMetaButtons(to, reply.text, reply.buttons);
    return sendMetaWhatsApp(to, reply.text);
  }

  // Twilio (no easy native buttons in the basic API) → text with link/options inline.
  await sendTwilioWhatsApp(to, renderAsText(reply));
}

/** Meta-only media fetch (Twilio media is fetched in its own webhook route). */
export async function fetchWhatsAppMedia(mediaId: string): Promise<{ base64: string; mimeType: string }> {
  if (!features.whatsapp) throw new Error("WhatsApp not configured");
  return fetchMetaMedia(mediaId);
}
