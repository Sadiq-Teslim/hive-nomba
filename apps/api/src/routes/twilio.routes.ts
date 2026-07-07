import { Router } from "express";
import { env, features } from "../config/env.js";
import { logger } from "../config/logger.js";
import { handleInbound } from "../services/inbound.service.js";
import { sendWhatsAppReply } from "../integrations/whatsapp/whatsapp.client.js";
import { fetchTwilioMedia, validateTwilioSignature, toTwilioAddress } from "../integrations/whatsapp/twilio.client.js";

export const twilioRouter = Router();

/**
 * Twilio WhatsApp inbound webhook (form-urlencoded). We acknowledge immediately
 * with empty TwiML, then process asynchronously and send the reply via the REST
 * API — the agent can take a few seconds, longer than Twilio's request window.
 *
 * Configure this URL in the Twilio Console (Messaging → WhatsApp Sandbox →
 * "When a message comes in"): https://<tunnel>/api/webhooks/twilio
 */
twilioRouter.post("/webhooks/twilio", (req, res) => {
  if (env.TWILIO_VALIDATE_SIGNATURE) {
    const fullUrl = `${env.PUBLIC_BASE_URL}${req.originalUrl}`;
    const ok = validateTwilioSignature(fullUrl, req.body ?? {}, req.header("x-twilio-signature"));
    if (!ok) {
      logger.warn("Rejected Twilio webhook: bad signature");
      return res.sendStatus(403);
    }
  }

  // Ack immediately (empty TwiML = no synchronous reply).
  res.type("text/xml").send("<Response></Response>");

  void handleTwilioInbound(req.body ?? {}).catch((err) =>
    logger.error({ err }, "Twilio inbound processing failed"),
  );
});

async function handleTwilioInbound(body: Record<string, string>): Promise<void> {
  const from = body.From; // e.g. "whatsapp:+2348190000002"
  if (!from) return;

  // Ignore anything that appears to come from our own WhatsApp number (an echo or
  // self-message). Replying would set To == From and Twilio rejects it (error 63031),
  // and if it were a loop it would spam. Never reply to ourselves.
  if (toTwilioAddress(from) === toTwilioAddress(env.TWILIO_WHATSAPP_FROM)) {
    logger.warn({ from }, "Ignoring Twilio inbound from our own number (self/echo)");
    return;
  }

  let text = body.Body ?? "";
  let image: { base64: string; mimeType: string } | undefined;

  const numMedia = Number(body.NumMedia ?? "0");
  if (numMedia > 0 && body.MediaUrl0) {
    const contentType = body.MediaContentType0 ?? "";
    if (contentType.startsWith("image/")) {
      try {
        image = await fetchTwilioMedia(body.MediaUrl0);
      } catch (err) {
        logger.error({ err }, "Failed to fetch Twilio media");
      }
    }
  }

  const reply = await handleInbound({ phone: from, text, image });
  await sendWhatsAppReply(from, reply);
}

if (features.whatsappProvider === "twilio") {
  logger.info("Twilio WhatsApp provider active");
}
