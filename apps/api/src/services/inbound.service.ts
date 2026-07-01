import { runAgent, type AgentReply } from "../agent/index.js";
import { routeInbound } from "./router.service.js";

export interface InboundMessage {
  phone: string;
  text: string;
  image?: { base64: string; mimeType: string };
}

/**
 * Channel-agnostic entry point for an inbound message. Routes the sender,
 * runs the agent, and returns the structured reply. The caller delivers it on
 * its channel (WhatsApp interactive, HTTP response, etc.).
 */
export async function handleInbound(msg: InboundMessage): Promise<AgentReply> {
  const { party, mode, ctx } = await routeInbound(msg.phone);
  return runAgent({ party, mode, phone: msg.phone, text: msg.text, image: msg.image, ctx });
}
