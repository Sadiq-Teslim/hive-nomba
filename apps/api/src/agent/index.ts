import type { Party } from "@prisma/client";
import { logger } from "../config/logger.js";
import { generate, describeImage, aiEnabled, type ChatMessage } from "./llm.js";
import { MERCHANT_PROMPT, CUSTOMER_PROMPT, LOBBY_PROMPT } from "./prompt.js";
import { declarationsFor, executeTool, type ToolContext } from "./tools.js";
import type { RouteMode } from "../services/router.service.js";
import {
  getOrCreateConversation,
  recentMessages,
  saveMessage,
} from "../services/conversation.service.js";

const MAX_TOOL_ROUNDS = 5;

export interface AgentInput {
  party: Party;
  mode: RouteMode;
  phone: string;
  text: string;
  /** Optional inline image (e.g. a product photo from WhatsApp). */
  image?: { base64: string; mimeType: string };
  ctx: ToolContext;
}

/** Structured reply: plain text plus optional interactive elements (WhatsApp/simulator). */
export interface AgentReply {
  text: string;
  /** True when a human owns the conversation and the channel must not auto-reply. */
  suppressDelivery?: boolean;
  /** A single URL call-to-action button, e.g. "Pay Now" → Nomba checkout. */
  cta?: { label: string; url: string };
  /** Up to 3 quick-reply buttons; tapping sends the label back as a message. */
  buttons?: string[];
}

/**
 * Parse an optional `BUTTONS: a | b | c` line the model may add to suggest quick
 * replies. Returns the cleaned text and up to 3 short button labels.
 */
function extractButtons(text: string): { text: string; buttons?: string[] } {
  const m = text.match(/^\s*BUTTONS:\s*(.+)\s*$/im);
  if (!m) return { text };
  const buttons = m[1]
    .split("|")
    .map((b) => b.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((b) => b.slice(0, 20));
  const cleaned = text.replace(m[0], "").replace(/\n{3,}/g, "\n\n").trim();
  return { text: cleaned, buttons: buttons.length ? buttons : undefined };
}

/**
 * Run one turn of the Hive agent: load memory, call the LLM, run any tool calls
 * in a loop, persist the exchange, and return a structured reply.
 */
export async function runAgent(input: AgentInput): Promise<AgentReply> {
  if (!aiEnabled()) {
    return { text: "Hive's AI brain isn't configured yet — set GROQ_API_KEY to enable it. (Your message was received.)" };
  }

  const systemInstruction =
    input.mode === "lobby" ? LOBBY_PROMPT : input.party === "MERCHANT" ? MERCHANT_PROMPT : CUSTOMER_PROMPT;
  const tools = declarationsFor(input.party, input.mode);

  const conversation = await getOrCreateConversation(input.phone, input.party, {
    merchantId: input.ctx.merchantId || undefined,
    customerId: input.ctx.customerId,
  });

  // Build messages from short-term memory + the new user turn.
  const history = await recentMessages(conversation.id);
  const isFirstTurn = history.length === 0;
  const messages: ChatMessage[] = [{ role: "system", content: systemInstruction }];
  for (const m of history) {
    messages.push({ role: m.role === "USER" ? "user" : "assistant", content: m.content });
  }

  // Image handling: a vision pass turns the photo into a text description, which
  // we fold into the user turn. The tool-calling loop then runs on the reliable
  // text model (the vision model mistypes numeric tool args).
  let userText = input.text || "";
  if (input.image) {
    try {
      const desc = await describeImage(input.image, input.text || "What product is in this photo?");
      logger.debug({ desc }, "vision description");
      userText = `${input.text ? input.text + "\n\n" : ""}[The user attached a product photo. It shows: ${desc}]`;
    } catch (err) {
      logger.warn({ err }, "vision describe failed");
      userText = input.text || "(the user sent a photo, but I couldn't read it — ask them to describe it)";
    }
  }
  messages.push({ role: "user", content: userText || "(no text)" });

  let finalText = "";
  // Deterministic artifacts pulled straight from tool results — never trust the
  // LLM to reproduce a payment URL verbatim (it will hallucinate it).
  let paymentLink: string | null = null;

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const result = await generate({ messages, tools });

      if (result.toolCalls.length === 0) {
        finalText = result.text;
        break;
      }

      // Append the assistant's tool-call turn, then each tool result.
      messages.push(result.assistantMessage);
      for (const call of result.toolCalls) {
        logger.debug({ tool: call.name, args: call.args }, "agent tool call");
        let response: Record<string, unknown>;
        try {
          response = await executeTool(call.name, call.args, input.ctx);
        } catch (e: any) {
          response = { ok: false, error: e?.message ?? "tool failed" };
        }
        if (typeof response.paymentLink === "string") paymentLink = response.paymentLink;
        logger.debug({ tool: call.name, ok: response.ok, error: response.error }, "agent tool result");
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(response) });
      }

      if (result.text) finalText = result.text;
    }
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    logger.error({ err: msg }, "agent generation failed");
    if (/rate.?limit|429|tokens per day|TPD/i.test(msg)) {
      const wait = msg.match(/try again in ([\dhms.\s]+?)\./i)?.[1]?.trim();
      return { text: `🐝 Hive is taking a quick breather (AI usage limit reached${wait ? ` — back in ~${wait}` : ""}). Please try again shortly.` };
    }
    return { text: "🐝 Sorry, I hit a snag processing that. Please try again in a moment." };
  }

  if (!finalText) finalText = "Done.";

  // WhatsApp doesn't render markdown — normalize anything the model emits to plain text.
  finalText = finalText
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // [label](url) -> label
    .replace(/\*\*(.+?)\*\*/g, "$1") // **bold** -> plain
    .replace(/^#{1,6}\s+/gm, "") // # headings -> plain
    .replace(/^\s*[-*]\s+/gm, "• "); // markdown bullets -> •

  // Payment-link integrity: the model must never surface a URL it invented.
  // Strip model-written URLs and any dangling "pay … here" intro lines it added,
  // then attach the genuine Nomba checkout link ourselves (once) when a tool made one.
  const needsScrub = input.party === "CUSTOMER" || paymentLink;
  if (needsScrub) {
    finalText = finalText
      .replace(/https?:\/\/\S+/g, "")
      .split("\n")
      .filter((line) => {
        const l = line.trim();
        if (/^💳/.test(l)) return false; // our marker, if echoed
        if (/(pay|payment|checkout)\b.*\b(here|link|below|with nomba|now)\b[\s:)\]]*$/i.test(l)) return false; // dangling intro
        return true;
      })
      .join("\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // A payment link becomes a "Pay Now" call-to-action button (the link itself
  // lives only in the CTA — renderers that can't show a button append it as text).
  const cta = paymentLink ? { label: "Pay Now", url: paymentLink } : undefined;

  // Quick-reply buttons the model may have suggested (skipped alongside a payment
  // CTA, since WhatsApp interactive messages can't combine the two).
  const { text: cleanedText, buttons: modelButtons } = extractButtons(finalText);
  finalText = cleanedText || "Done.";

  // Default welcome menu on a shopping customer's first turn (after they've picked
  // a store). In lobby mode the prompt offers store choices instead.
  let buttons = modelButtons;
  if (!buttons && !cta && input.mode === "shopping" && isFirstTurn) {
    buttons = ["Browse products", "Track my order"];
  }

  await saveMessage(conversation.id, "USER", input.text || "(media)");
  await saveMessage(conversation.id, "ASSISTANT", finalText);

  return { text: finalText, cta, buttons: cta ? undefined : buttons };
}
