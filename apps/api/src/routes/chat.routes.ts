import { Router } from "express";
import { z } from "zod";
import { handleInbound } from "../services/inbound.service.js";

/**
 * Local simulator for the WhatsApp experience — chat with Hive over HTTP without
 * a Meta app. POST { phone, text } and get the assistant's reply back.
 * This is the fastest way to demo and test the agent end-to-end.
 */
export const chatRouter = Router();

const schema = z.object({
  phone: z.string().min(5),
  text: z.string().default(""),
  image: z.object({ base64: z.string(), mimeType: z.string() }).optional(),
});

chatRouter.post("/chat", async (req, res, next) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const reply = await handleInbound(parsed.data);
    // `reply` stays a string for backward-compat; cta/buttons power the simulator UI.
    res.json({ reply: reply.text, cta: reply.cta, buttons: reply.buttons });
  } catch (err) {
    next(err);
  }
});
