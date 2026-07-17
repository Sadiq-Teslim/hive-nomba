import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import {
  createCheckout,
  getCheckoutStatus,
  createVirtualAccount,
  getTransactionId,
  refundCheckout,
} from "../integrations/nomba/nomba.client.js";
import { getOrder, getOrderByReference, markOrderPaid } from "./order.service.js";
import { notifyOrderPaid } from "./notify.service.js";
import { sendWhatsAppText } from "../integrations/whatsapp/whatsapp.client.js";
import { logger } from "../config/logger.js";
import { orderReference } from "../utils/ref.js";
import { nairaToKobo, formatNaira } from "../utils/money.js";
import { getOrCreateCustomer } from "./customer.service.js";

/**
 * Issue a Nomba payment link for an order. Creates/updates the Payment record,
 * moves the order to PENDING_PAYMENT, and returns the checkout URL to send to
 * the customer on WhatsApp.
 */
export async function createPaymentLinkForOrder(orderId: string) {
  const order = await getOrder(orderId);
  if (!order) throw new Error("Order not found");

  // WhatsApp customers don't give an email, but Nomba requires a valid one for
  // checkout. Synthesize a stable, valid address from their phone number.
  const phone = order.customer?.whatsappPhone;
  const customerEmail = phone ? `${phone}@checkout.hive.ng` : "guest@checkout.hive.ng";

  const checkout = await createCheckout({
    orderReference: order.reference,
    amountKobo: order.totalKobo,
    currency: "NGN",
    customerEmail,
    customerName: order.customer?.name ?? phone ?? undefined,
    // Browser redirect after payment (NOT the webhook — that's configured on
    // Nomba's side and hits POST /api/webhooks/nomba server-to-server).
    callbackUrl: `${env.PUBLIC_BASE_URL}/pay/complete`,
  });

  const payment = await prisma.$transaction(async (tx) => {
    const next = await tx.payment.upsert({
      where: { orderId },
      update: {
        method: "LINK",
        amountKobo: order.totalKobo,
        checkoutUrl: checkout.checkoutUrl,
        providerRef: checkout.providerRef,
        status: "PENDING",
      },
      create: {
        orderId,
        method: "LINK",
        amountKobo: order.totalKobo,
        checkoutUrl: checkout.checkoutUrl,
        providerRef: checkout.providerRef,
        status: "PENDING",
      },
    });
    await tx.paymentEvent.create({ data: { paymentId: next.id, eventType: "checkout_created", providerRef: checkout.providerRef } });
    await tx.order.update({ where: { id: orderId }, data: { status: "PENDING_PAYMENT" } });
    if (order.status !== "PENDING_PAYMENT") {
      await tx.orderStatusEvent.create({ data: { orderId, fromStatus: order.status, toStatus: "PENDING_PAYMENT", actorType: "system" } });
    }
    return next;
  });

  return { payment, checkoutUrl: checkout.checkoutUrl, mocked: checkout.mocked, order };
}

/**
 * Set up a bank-transfer payment: create a dedicated Nomba virtual account for the
 * order and return its details for the customer to transfer to. The order moves to
 * PENDING_PAYMENT; the inbound transfer is reconciled via webhook/verification.
 */
export async function createVirtualAccountForOrder(orderId: string) {
  const order = await getOrder(orderId);
  if (!order) throw new Error("Order not found");

  const holderName = order.customer?.name ?? order.merchant?.businessName ?? "Hive Customer";
  const va = await createVirtualAccount(order.reference, holderName);

  const payment = await prisma.$transaction(async (tx) => {
    const next = await tx.payment.upsert({
      where: { orderId },
      update: {
        method: "VIRTUAL_ACCOUNT",
        amountKobo: order.totalKobo,
        vaNumber: va.accountNumber,
        vaBank: va.bankName,
        vaName: va.accountName,
        status: "PENDING",
      },
      create: {
        orderId,
        method: "VIRTUAL_ACCOUNT",
        amountKobo: order.totalKobo,
        vaNumber: va.accountNumber,
        vaBank: va.bankName,
        vaName: va.accountName,
        status: "PENDING",
      },
    });
    await tx.paymentEvent.create({ data: { paymentId: next.id, eventType: "virtual_account_created" } });
    await tx.order.update({ where: { id: orderId }, data: { status: "PENDING_PAYMENT" } });
    if (order.status !== "PENDING_PAYMENT") {
      await tx.orderStatusEvent.create({ data: { orderId, fromStatus: order.status, toStatus: "PENDING_PAYMENT", actorType: "system" } });
    }
    return next;
  });
  return { payment, va, order };
}

/**
 * Refund a paid order via Nomba, restore stock, and notify both parties.
 * Resolves the Nomba transaction id from the order reference, triggers the refund,
 * and marks the order REFUNDED. Scoped by merchantId/customerId for safety.
 */
export async function refundOrder(opts: { reference: string; merchantId?: string; customerId?: string; reason?: string }) {
  const order = await getOrderByReference(opts.reference);
  if (!order) return { ok: false as const, error: "Order not found." };
  if (opts.merchantId && order.merchantId !== opts.merchantId)
    return { ok: false as const, error: "That order belongs to a different store." };
  if (opts.customerId && order.customerId && order.customerId !== opts.customerId)
    return { ok: false as const, error: "That order isn't yours." };
  if (order.status === "REFUNDED") return { ok: true as const, order, message: "Already refunded." };
  if (!["PAID", "ACCEPTED", "PROCESSING", "READY_FOR_PICKUP", "DISPATCHED", "DELIVERED", "FULFILLED", "REFUND_REQUESTED"].includes(order.status))
    return { ok: false as const, error: `Order ${order.reference} isn't paid, so there's nothing to refund.` };

  const txnId = order.payment?.txnId ?? (await getTransactionId(order.reference));
  if (!txnId) return { ok: false as const, error: "Couldn't find the Nomba transaction to refund." };

  const refund = await refundCheckout(txnId);
  if (!refund.ok) return { ok: false as const, error: `Refund failed: ${refund.message}` };

  // Restore stock, then mark refunded.
  const updated = await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      if (item.productId) await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    }
    await tx.payment.updateMany({ where: { orderId: order.id }, data: { status: "REFUNDED", refundedAt: new Date() } });
    if (order.payment) {
      await tx.paymentEvent.create({ data: { paymentId: order.payment.id, eventType: "refund_confirmed", txnId } });
    }
    await tx.orderStatusEvent.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: "REFUNDED", actorType: "system", note: opts.reason } });
    await tx.dispute.updateMany({
      where: { orderId: order.id, status: { not: "CLOSED" } },
      data: { status: "RESOLVED_FOR_BUYER", resolution: opts.reason ?? "Refund approved and submitted." },
    });
    return tx.order.update({
      where: { id: order.id },
      data: { status: "REFUNDED" },
      include: { items: true, customer: true, merchant: true },
    });
  });

  // Notify both parties.
  const total = formatNaira(updated.totalKobo);
  if (updated.customer?.whatsappPhone) {
    await sendWhatsAppText(
      updated.customer.whatsappPhone,
      `💸 Your order ${updated.reference} has been refunded — ${total} is on its way back to you.${opts.reason ? `\nReason: ${opts.reason}` : ""}`,
    ).catch((e) => logger.warn({ e }, "refund customer notify failed"));
  }
  if (updated.merchant?.whatsappPhone) {
    await sendWhatsAppText(
      updated.merchant.whatsappPhone,
      `↩️ Order ${updated.reference} (${total}) was refunded. Stock has been restored.`,
    ).catch((e) => logger.warn({ e }, "refund merchant notify failed"));
  }

  return { ok: true as const, order: updated, message: refund.message };
}

/**
 * Create a Nomba payment link for an arbitrary amount (not tied to catalogue
 * products) — e.g. a custom sale or service. Backed by a real order with a
 * single descriptive line so it reconciles through the same webhook flow.
 */
export async function createCustomPaymentLink(opts: {
  merchantId: string;
  amountNaira: number;
  description?: string;
  customerPhone?: string;
}) {
  const amountKobo = nairaToKobo(opts.amountNaira);
  if (!amountKobo || amountKobo <= 0) throw new Error("Amount must be greater than zero.");

  let customerId: string | undefined;
  if (opts.customerPhone) {
    const c = await getOrCreateCustomer(opts.merchantId, opts.customerPhone);
    customerId = c.id;
  }

  const order = await prisma.order.create({
    data: {
      reference: orderReference(),
      merchantId: opts.merchantId,
      customerId,
      totalKobo: amountKobo,
      items: {
        create: [{ nameSnapshot: opts.description?.trim() || "Custom payment", priceKobo: amountKobo, quantity: 1 }],
      },
    },
  });

  const { checkoutUrl } = await createPaymentLinkForOrder(order.id);
  return { reference: order.reference, checkoutUrl, amountKobo };
}

export interface VerifyResult {
  found: boolean;
  paid: boolean;
  alreadyPaid: boolean;
  order: Awaited<ReturnType<typeof getOrder>>;
}

/**
 * Reconcile an order's payment by asking Nomba directly (source of truth), then
 * marking it paid + notifying both parties if confirmed. Works without webhooks.
 * Resolve the order by our reference or its id.
 */
export async function verifyPayment(opts: { reference?: string; orderId?: string }): Promise<VerifyResult> {
  const order = opts.reference
    ? await getOrderByReference(opts.reference)
    : opts.orderId
      ? await getOrder(opts.orderId)
      : null;

  if (!order) return { found: false, paid: false, alreadyPaid: false, order: null };
  if (order.payment?.paidAt || order.payment?.status === "SUCCESS" || order.payment?.status === "REFUNDED") {
    return { found: true, paid: true, alreadyPaid: true, order };
  }

  // Verify with Nomba using OUR order reference (what Nomba echoes as orderReference).
  const status = await getCheckoutStatus(order.reference);
  if (status.paid) {
    await markOrderPaid(order.id, order.payment?.providerRef ?? undefined, status.raw, status.txnId);
    await notifyOrderPaid(order.id);
    return { found: true, paid: true, alreadyPaid: false, order: await getOrder(order.id) };
  }
  return { found: status.found, paid: false, alreadyPaid: false, order };
}
