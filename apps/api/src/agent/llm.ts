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
  /** Use the vision-capable model (an image is present in the messages). */
  vision?: boolean;
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

export async function generate(args: GenerateArgs): Promise<GenerateResult> {
  const groq = getClient();
  const model = args.vision ? env.GROQ_VISION_MODEL : env.GROQ_MODEL;

  const response = await groq.chat.completions.create({
    model,
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
