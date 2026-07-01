import Groq from "groq-sdk";
import { env, features } from "../config/env.js";

/**
 * Thin provider wrapper around Groq (OpenAI-compatible chat completions with tool
 * calling). Isolated here so the rest of the codebase depends on a small
 * interface — swap this file to change LLM providers.
 */

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | Array<Record<string, unknown>> }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface GenerateArgs {
  messages: ChatMessage[];
  tools: ToolSchema[];
}

export interface GenerateResult {
  text: string;
  toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }>;
  /** Raw assistant message to append back into the conversation. */
  assistantMessage: ChatMessage;
}

let client: Groq | null = null;
function getClient(): Groq {
  if (!client) client = new Groq({ apiKey: env.GROQ_API_KEY });
  return client;
}

export const aiEnabled = () => features.ai;

/**
 * Vision pass: describe a product photo as plain text. We keep this separate from
 * tool-calling — the vision model is great at seeing but emits tool-call params
 * with the wrong types (numbers as strings), so we let the text model make the
 * actual tool calls using this description as context.
 */
export async function describeImage(
  image: { base64: string; mimeType: string },
  hint: string,
): Promise<string> {
  const groq = getClient();
  const dataUrl = `data:${image.mimeType};base64,${image.base64}`;
  const response = await groq.chat.completions.create({
    model: env.GROQ_VISION_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You identify products from photos for an online store. Reply with a short product name, then a one-sentence description. No preamble, no markdown.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: hint || "What product is in this photo?" },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ] as never,
    temperature: 0.3,
    max_tokens: 120,
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}

export async function generate(args: GenerateArgs): Promise<GenerateResult> {
  const groq = getClient();

  const response = await groq.chat.completions.create({
    model: env.GROQ_MODEL,
    messages: args.messages as never,
    tools: args.tools.length ? (args.tools as never) : undefined,
    tool_choice: args.tools.length ? "auto" : undefined,
    temperature: 0.4,
    max_tokens: 1024,
  });

  const choice = response.choices[0];
  const msg = choice?.message;

  const toolCalls = (msg?.tool_calls ?? []).map((tc) => {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
    } catch {
      parsed = {};
    }
    return { id: tc.id, name: tc.function.name, args: parsed };
  });

  return {
    text: msg?.content ?? "",
    toolCalls,
    assistantMessage: {
      role: "assistant",
      content: msg?.content ?? null,
      tool_calls: msg?.tool_calls as ToolCall[] | undefined,
    },
  };
}
