import { runAgent, type AgentReply } from "../agent/index.js";
import { routeInbound } from "./router.service.js";
import { tryActivateWhatsApp } from "./onboarding.service.js";
import { handleMerchantSetup } from "./merchant-setup.service.js";
import { captureHumanHandoverMessage } from "./handover.service.js";

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
  const activation = await tryActivateWhatsApp(msg.phone, msg.text);
  if (activation) return { text: activation.text };

  const setup = await handleMerchantSetup(msg.phone, msg.text);
  if (setup) return setup;

  const { party, mode, ctx } = await routeInbound(msg.phone);
  if (party === "CUSTOMER" && mode === "shopping" && await captureHumanHandoverMessage(ctx.merchantId, msg.phone, msg.text)) {
    return { text: "", suppressDelivery: true };
  }
  return runAgent({ party, mode, phone: msg.phone, text: msg.text, image: msg.image, ctx });
}
