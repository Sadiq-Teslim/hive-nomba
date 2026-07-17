import { Router } from "express";
import { getOrderByReference } from "../services/order.service.js";
import { verifyPayment } from "../services/payment.service.js";
import { formatNaira } from "../utils/money.js";
import { logger } from "../config/logger.js";

/**
 * Post-payment landing page - where Nomba redirects the customer's browser after
 * checkout (the `callbackUrl`, with ?orderReference=<ours>&orderId=<nomba>).
 *
 * We don't trust the redirect alone: we actively verify the payment with Nomba
 * here and reconcile (mark paid + notify) if it really went through. The page
 * then shows the HONEST state - confirmed, or "not received yet".
 */
export const payRouter = Router();

payRouter.get("/pay/complete", async (req, res) => {
  const ref = (req.query.orderReference as string) || (req.query.reference as string) || "";

  let confirmed = false;
  let order = ref ? await getOrderByReference(ref) : null;
  if (order) {
    try {
      const result = await verifyPayment({ reference: order.reference });
      confirmed = result.paid;
      if (result.order) order = result.order;
    } catch (err) {
      logger.error({ err, ref }, "pay/complete verification failed");
    }
  }

  const detail = order
    ? `<p class="sub">Order ${order.reference} · ${formatNaira(order.totalKobo)}</p>`
    : `<p class="sub">We couldn't find that order.</p>`;

  const icon = confirmed ? "✓" : "⏳";
  const iconColor = confirmed ? "#39d98a" : "#f5c518";
  const heading = confirmed ? "Payment confirmed" : "Payment not received yet";
  const tag = confirmed
    ? "🐝 Return to WhatsApp - Hive has confirmed your order."
    : "If you just paid, give it a moment and tell Hive on WhatsApp - it will re-check.";

  res.type("html").send(`<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${heading} · Hive</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0d0f14;color:#e8e8e8;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
  .card{background:#181b22;border:1px solid #262b36;border-radius:18px;padding:34px;max-width:380px;width:90%;text-align:center}
  .tick{width:64px;height:64px;border-radius:50%;background:${iconColor}22;color:${iconColor};display:flex;align-items:center;justify-content:center;font-size:34px;margin:0 auto 16px}
  h1{font-size:20px;margin:0 0 6px}.sub{color:#8a92a6;font-size:14px;margin:0 0 18px}
  .tag{display:inline-block;background:#f5c51822;color:#f5c518;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:600}
</style></head>
<body><div class="card">
  <div class="tick">${icon}</div>
  <h1>${heading}</h1>
  ${detail}
  <span class="tag">${tag}</span>
</div></body></html>`);
});
