import { createApp } from "./app.js";
import { env, features } from "./config/env.js";
import { logger } from "./config/logger.js";
import { startKeepAlive } from "./config/keepalive.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🐝 Hive API listening on http://localhost:${env.PORT}`);
  logger.info({ integrations: features }, "Integration status (false = running in mock mode)");
  if (!features.ai) logger.warn("GROQ_API_KEY not set — the AI agent will return a placeholder reply.");
  startKeepAlive();
});

// Safety net: a transient DB/network blip (e.g. Neon serverless auto-suspend)
// must never take the whole server down. Log and keep serving.
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection (kept process alive)");
});
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception (kept process alive)");
});

const shutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down...`);
  server.close(() => process.exit(0));
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
