import { Router } from "express";
import { getOrderByReference, markOrderPaid } from "../services/order.service.js";
import { notifyOrderPaid } from "../services/notify.service.js";
import { formatNaira } from "../utils/money.js";

/**
 * Mock Nomba checkout — only used when Nomba credentials are absent. Lets you
 * complete the payment loop locally: open the link, click Pay, and the order is
 * marked paid exactly as a real webhook would do it.
 */
export const mockRouter = Router();

mockRouter.get("/mock/checkout/:reference", async (req, res) => {
  const order = await getOrderByReference(req.params.reference);
  if (!order) return res.status(404).send("Order not found");

  const items = order.items
    .map((i) => `<li>${i.quantity} × ${i.nameSnapshot} — ${formatNaira(i.priceKobo * i.quantity)}</li>`)
    .join("");
  const paid = order.status === "PAID" || order.status === "FULFILLED";

  res.type("html").send(`<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Hive Checkout — ${order.reference}</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0f1115;color:#e8e8e8;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
  .card{background:#181b22;border:1px solid #262b36;border-radius:16px;padding:28px;max-width:380px;width:90%}
  h1{font-size:20px;margin:0 0 4px}.sub{color:#8a92a6;font-size:13px;margin-bottom:18px}
  ul{padding-left:18px;color:#c7cdda}.total{font-size:24px;font-weight:700;margin:14px 0}
  button{width:100%;padding:14px;border:0;border-radius:10px;background:#f5c518;color:#111;font-weight:700;font-size:16px;cursor:pointer}
  .paid{color:#39d98a;font-weight:700}
  .tag{display:inline-block;background:#f5c51822;color:#f5c518;padding:2px 8px;border-radius:6px;font-size:11px}
</style></head>
<body><div class="card">
  <span class="tag">🐝 HIVE · mock Nomba checkout</span>
  <h1>${order.merchant?.businessName ?? "Store"}</h1>
  <div class="sub">Order ${order.reference}</div>
  <ul>${items}</ul>
  <div class="total">${formatNaira(order.totalKobo)}</div>
  ${
    paid
      ? `<p class="paid">✅ Paid — thank you!</p>`
      : `<form method="POST" action="/mock/checkout/${order.reference}/pay"><button type="submit">Pay ${formatNaira(order.totalKobo)}</button></form>`
  }
</div></body></html>`);
});

mockRouter.post("/mock/checkout/:reference/pay", async (req, res) => {
  const order = await getOrderByReference(req.params.reference);
  if (!order) return res.status(404).send("Order not found");

  await markOrderPaid(order.id, `MOCK-${order.reference}`, { mock: true });
  await notifyOrderPaid(order.id);

  res.type("html").send(`<!doctype html><html><body style="font-family:system-ui;background:#0f1115;color:#39d98a;display:flex;height:100vh;align-items:center;justify-content:center">
  <div style="text-align:center"><h1>✅ Payment successful</h1><p style="color:#8a92a6">Order ${order.reference} confirmed. You can close this page.</p></div>
  </body></html>`);
});
