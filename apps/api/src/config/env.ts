import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  PUBLIC_BASE_URL: z.string().url().default("http://localhost:4000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  GROQ_API_KEY: z.string().default(""),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
  GROQ_VISION_MODEL: z.string().default("meta-llama/llama-4-scout-17b-16e-instruct"),

  // Which WhatsApp provider to use for sending/receiving messages.
  WHATSAPP_PROVIDER: z.enum(["twilio", "meta"]).default("twilio"),

  // Meta WhatsApp Cloud API
  WHATSAPP_TOKEN: z.string().default(""),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(""),
  WHATSAPP_VERIFY_TOKEN: z.string().default("hive-verify-token"),
  WHATSAPP_API_VERSION: z.string().default("v21.0"),

  // Twilio WhatsApp (Sandbox or a provisioned number)
  TWILIO_ACCOUNT_SID: z.string().default(""),
  TWILIO_AUTH_TOKEN: z.string().default(""),
  // The WhatsApp-enabled sender, e.g. "whatsapp:+14155238886" (Twilio sandbox).
  TWILIO_WHATSAPP_FROM: z.string().default(""),
  // Validate inbound X-Twilio-Signature. Off by default - tricky behind tunnels.
  // (Plain z.coerce.boolean() treats "false" as true - parse the string explicitly.)
  TWILIO_VALIDATE_SIGNATURE: z
    .string()
    .default("false")
    .transform((v) => v.toLowerCase() === "true"),
  // Twilio Content Template SIDs for native quick-reply buttons (created via
  // scripts/setup-twilio-content.mjs). Empty = fall back to a text list.
  TWILIO_CONTENT_WELCOME_SID: z.string().default(""),
  TWILIO_CONTENT_PAYMENT_SID: z.string().default(""),

  NOMBA_BASE_URL: z.string().default("https://api.nomba.com"),
  NOMBA_CLIENT_ID: z.string().default(""),
  NOMBA_PRIVATE_KEY: z.string().default(""),
  // Parent (main) account ID - sent in the `accountId` header for auth.
  NOMBA_ACCOUNT_ID: z.string().default(""),
  // Sub-account ID - the account calls are scoped/settled to.
  NOMBA_SUB_ACCOUNT_ID: z.string().default(""),
  NOMBA_WEBHOOK_SECRET: z.string().default(""),

  CLOUDINARY_URL: z.string().default(""),

  // Keep-alive self-ping interval (ms) to stop the host (e.g. Render free tier)
  // from sleeping. Only runs in production against a real public URL.
  KEEPALIVE_INTERVAL_MS: z.coerce.number().default(60_000),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === "production";

const twilioReady = Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM);
const metaReady = Boolean(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);

/** Feature flags derived from which credentials are present. */
export const features = {
  ai: Boolean(env.GROQ_API_KEY),
  whatsapp: env.WHATSAPP_PROVIDER === "twilio" ? twilioReady : metaReady,
  whatsappProvider: env.WHATSAPP_PROVIDER,
  nomba: Boolean(env.NOMBA_CLIENT_ID && env.NOMBA_PRIVATE_KEY),
};
