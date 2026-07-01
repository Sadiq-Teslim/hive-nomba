import { Router } from "express";
import { logger } from "../config/logger.js";
import { prisma } from "../config/db.js";
import { verifyNombaSignature, parseNombaEvent } from "../integrations/nomba/nomba.webhook.js";
import { markOrderPaid } from "../services/order.service.js";
import { verifyPayment } from "../services/payment.service.js";
import { notifyOrderPaid } from "../services/notify.service.js";

export const nombaRouter = Router();

/**
 * Nomba payment webhook. Mounted with express.raw() so we can check the signature
 * over the raw body.
 *
 * Trust model (robust against signature-scheme uncertainty):
 *  1. Compute the HMAC signature as a trust signal (don't hard-reject on mismatch).
 *  2. Re-verify the payment against Nomba's API — that's our source of truth, so a
 *     forged webhook can never fake a payment, and a mismatched signature scheme
 *     can never drop a real one.
 *  3. If the API can't confirm yet (e.g. it lags the webhook) but the signature IS
 *     valid, trust the authentic webhook and mark it paid.
 */
nombaRouter.post("/webhooks/nomba", async (req, res) => {
  const rawBody: Buffer = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body));
  const signature =
    req.header("x-nomba-signature") ??
    req.header("nomba-signature") ??
    req.header("x-signature") ??
    undefined;
  const signatureValid = verifyNombaSignature(rawBody, signature);

  let body: any;
  try {
    body = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.sendStatus(400);
  }

  // Acknowledge immediately, then process.
  res.sendStatus(200);

  try {
    const event = parseNombaEvent(body);
    logger.info(
      { type: event.type, references: event.references, isSuccess: event.isSuccess, signatureValid },
      "Nomba webhook received",
    );
    if (!event.isSuccess || event.references.length === 0) return;

    // Match on our order reference OR the Nomba providerRef we stored at checkout.
    const order =
      (await prisma.order.findFirst({ where: { reference: { in: event.references } } })) ??
      (await prisma.payment
        .findFirst({ where: { providerRef: { in: event.references } } })
        .then((p) => (p ? prisma.order.findUnique({ where: { id: p.orderId } }) : null)));

    if (!order) {
      logger.warn({ references: event.references }, "Nomba webhook: no matching order");
      return;
    }

    // Source of truth: confirm with Nomba's API (marks paid + notifies if SUCCESS).
    const result = await verifyPayment({ reference: order.reference });
    if (result.paid) {
      logger.info({ ref: order.reference }, "Nomba webhook: payment confirmed via API");
      return;
    }

    // API couldn't confirm yet — trust the webhook only if its signature checked out.
    if (signatureValid) {
      logger.info({ ref: order.reference }, "Nomba webhook: signed event trusted (API not yet confirming)");
      await markOrderPaid(order.id, event.references[0], body);
      await notifyOrderPaid(order.id);
    } else {
      logger.warn({ ref: order.reference }, "Nomba webhook: unconfirmed by API and bad/absent signature — ignoring");
    }
  } catch (err) {
    logger.error({ err }, "Nomba webhook handling failed");
  }
});
