import { env, isProd } from "./env.js";
import { logger } from "./logger.js";

/**
 * Self-ping the public URL on an interval so a sleeping host (Render free tier
 * sleeps after ~15 min idle) stays awake. The request goes out to the public URL
 * and comes back through the host's router, which counts as inbound traffic.
 *
 * Only runs in production against a real https URL. On Render we prefer the
 * auto-injected RENDER_EXTERNAL_URL so it works even if PUBLIC_BASE_URL is off.
 */
export function startKeepAlive(): void {
  if (!isProd) return;

  const base = (process.env.RENDER_EXTERNAL_URL || env.PUBLIC_BASE_URL).replace(/\/$/, "");
  if (!/^https:\/\//.test(base) || /localhost|127\.0\.0\.1/.test(base)) {
    logger.warn({ base }, "keep-alive skipped (no usable public URL)");
    return;
  }

  const url = `${base}/health`;
  const intervalMs = Math.max(30_000, env.KEEPALIVE_INTERVAL_MS);

  setInterval(() => {
    fetch(url, { method: "GET" }).catch((err) =>
      logger.debug({ err: String(err) }, "keep-alive ping failed"),
    );
  }, intervalMs);

  logger.info({ url, intervalMs }, "keep-alive self-ping enabled");
}
