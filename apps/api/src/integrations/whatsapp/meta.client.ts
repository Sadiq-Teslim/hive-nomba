import axios from "axios";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

/** Meta WhatsApp Cloud API - send a text message. */
export async function sendMetaWhatsApp(to: string, body: string): Promise<void> {
  const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  try {
    await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: true, body },
      },
      { headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const detail = axios.isAxiosError(err) ? err.response?.data : err;
    logger.error({ to, detail }, "Failed to send Meta WhatsApp message");
    throw err;
  }
}

const GRAPH = () => `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
const authHeaders = () => ({ Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" });

async function postMeta(payload: Record<string, unknown>, ctx: string): Promise<void> {
  try {
    await axios.post(GRAPH(), { messaging_product: "whatsapp", recipient_type: "individual", ...payload }, { headers: authHeaders() });
  } catch (err) {
    const detail = axios.isAxiosError(err) ? err.response?.data : err;
    logger.error({ detail }, `Failed to send Meta ${ctx}`);
    throw err;
  }
}

/** Interactive quick-reply buttons (max 3, titles ≤20 chars). Taps send the title back. */
export async function sendMetaButtons(to: string, body: string, buttons: string[]): Promise<void> {
  const replies = buttons.slice(0, 3).map((title, i) => ({
    type: "reply",
    reply: { id: `qr_${i}`, title: title.slice(0, 20) },
  }));
  await postMeta(
    {
      to,
      type: "interactive",
      interactive: { type: "button", body: { text: body.slice(0, 1024) }, action: { buttons: replies } },
    },
    "interactive buttons",
  );
}

/** A single URL "call-to-action" button (e.g. "Pay Now" → Nomba checkout). */
export async function sendMetaCtaUrl(to: string, body: string, label: string, url: string): Promise<void> {
  await postMeta(
    {
      to,
      type: "interactive",
      interactive: {
        type: "cta_url",
        body: { text: body.slice(0, 1024) },
        action: { name: "cta_url", parameters: { display_text: label.slice(0, 20), url } },
      },
    },
    "cta_url button",
  );
}

/** Download media (e.g. a product image) from Meta by media id → base64 + mime. */
export async function fetchMetaMedia(mediaId: string): Promise<{ base64: string; mimeType: string }> {
  const metaUrl = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${mediaId}`;
  const meta = await axios.get(metaUrl, { headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` } });
  const mediaUrl: string = meta.data.url;
  const mimeType: string = meta.data.mime_type ?? "image/jpeg";

  const binary = await axios.get(mediaUrl, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
    responseType: "arraybuffer",
  });
  return { base64: Buffer.from(binary.data).toString("base64"), mimeType };
}
