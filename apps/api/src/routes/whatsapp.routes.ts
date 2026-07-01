import { Router } from "express";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { handleInbound } from "../services/inbound.service.js";
import { sendWhatsAppReply, fetchWhatsAppMedia } from "../integrations/whatsapp/whatsapp.client.js";

export const whatsappRouter = Router();

// Webhook verification handshake (Meta calls this once when you set the URL).
whatsappRouter.get("/webhooks/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN) {
    logger.info("WhatsApp webhook verified");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Inbound messages. Acknowledge fast (200), then process asynchronously.
whatsappRouter.post("/webhooks/whatsapp", (req, res) => {
  res.sendStatus(200);
  void processWebhook(req.body).catch((err) =>
    logger.error({ err }, "WhatsApp webhook processing failed"),
  );
});

async function processWebhook(body: any): Promise<void> {
  const entries = body?.entry ?? [];
  for (const entry of entries) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value;
      const messages = value?.messages ?? [];
      for (const message of messages) {
        const from: string = message.from;
        let text = "";
        let image: { base64: string; mimeType: string } | undefined;

        if (message.type === "text") {
          text = message.text?.body ?? "";
        } else if (message.type === "image") {
          text = message.image?.caption ?? "";
          try {
            image = await fetchWhatsAppMedia(message.image.id);
          } catch (err) {
            logger.error({ err }, "Failed to fetch WhatsApp media");
          }
        } else if (message.type === "interactive") {
          text =
            message.interactive?.button_reply?.title ??
            message.interactive?.list_reply?.title ??
            "";
        } else {
          text = "(unsupported message type)";
        }

        const reply = await handleInbound({ phone: from, text, image });
        await sendWhatsAppReply(from, reply);
      }
    }
  }
}
