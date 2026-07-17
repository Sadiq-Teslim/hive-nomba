import type { OrderStatus } from "@prisma/client";
import { prisma } from "../config/db.js";
import { orderReference } from "../utils/ref.js";
import { findProductByName } from "./product.service.js";

export interface OrderLineInput {
  /** Product name (will be fuzzy-matched) OR a concrete productId. */
  product: string;
  quantity: number;
}

export interface CreateOrderInput {
  merchantId: string;
  customerId?: string;
  lines: OrderLineInput[];
}

/**
 * Create a DRAFT order from human-described lines. Resolves each line to a real
 * product, snapshots name + price, and computes the total. Stock is NOT decremented
 * here - that happens only once payment is confirmed (see markOrderPaid).
 */
export async function createOrder(input: CreateOrderInput) {
  const resolved = [];
  for (const line of input.lines) {
    const product =
      (await prisma.product.findFirst({
        where: { id: line.product, merchantId: input.merchantId },
      })) ?? (await findProductByName(input.merchantId, line.product));

    if (!product) throw new Error(`Product not found: "${line.product}"`);
    const quantity = Math.max(1, Math.floor(line.quantity || 1));
    resolved.push({
      productId: product.id,
      nameSnapshot: product.name,
      priceKobo: product.priceKobo,
      quantity,
    });
  }

  const totalKobo = resolved.reduce((sum, r) => sum + r.priceKobo * r.quantity, 0);

  return prisma.order.create({
    data: {
      reference: orderReference(),
      merchantId: input.merchantId,
      customerId: input.customerId,
      totalKobo,
      items: { create: resolved },
    },
    include: { items: true },
  });
}

export async function getOrder(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payment: true, customer: true, merchant: true },
  });
}

export async function getOrderByReference(reference: string) {
  return prisma.order.findUnique({
    where: { reference },
    include: { items: true, payment: true, customer: true, merchant: true },
  });
}

/**
 * Mark an order paid: flip statuses, decrement stock for each line, and stamp
 * the customer's lastOrderedAt. Idempotent - safe to call from a webhook retry.
 */
export async function markOrderPaid(orderId: string, providerRef?: string, rawWebhook?: unknown) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true },
    });
    if (!order) throw new Error("Order not found");
    if (order.status === "PAID" || order.status === "FULFILLED") return order; // idempotent

    for (const item of order.items) {
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    if (order.customerId) {
      await tx.customer.update({
        where: { id: order.customerId },
        data: { lastOrderedAt: new Date() },
      });
    }

    await tx.payment.update({
      where: { orderId },
      data: {
        status: "SUCCESS",
        paidAt: new Date(),
        providerRef: providerRef ?? order.payment?.providerRef,
        rawWebhook: rawWebhook ? (rawWebhook as object) : undefined,
      },
    });

    return tx.order.update({
      where: { id: orderId },
      data: { status: "PAID" },
      include: { items: true, payment: true, customer: true, merchant: true },
    });
    // Generous timeouts: Neon round-trips (plus transient-retry backoff) can push
    // this multi-step transaction past Prisma's tight 5s default.
  }, { timeout: 20000, maxWait: 10000 });
}

/** List a merchant's orders, optionally filtered by status. */
export async function listOrders(
  merchantId: string,
  opts: { status?: OrderStatus | OrderStatus[]; limit?: number } = {},
) {
  const status = opts.status
    ? Array.isArray(opts.status)
      ? { in: opts.status }
      : opts.status
    : undefined;
  return prisma.order.findMany({
    where: { merchantId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 20,
    include: { items: true, customer: true, payment: true },
  });
}

/** Mark a paid order as fulfilled/delivered. Scoped to the merchant. */
export async function fulfillOrder(reference: string, merchantId: string) {
  const order = await getOrderByReference(reference);
  if (!order || order.merchantId !== merchantId) return { ok: false as const, error: "Order not found." };
  if (order.status === "FULFILLED") return { ok: true as const, order };
  if (order.status !== "PAID")
    return { ok: false as const, error: `Order ${order.reference} isn't paid yet (status: ${order.status}).` };
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: "FULFILLED" },
    include: { items: true },
  });
  return { ok: true as const, order: updated };
}

/** The customer's most recent order that can still be cancelled (not yet paid). */
export async function latestCancellableOrder(customerId: string) {
  return prisma.order.findFirst({
    where: { customerId, status: { in: ["DRAFT", "PENDING_PAYMENT"] } },
    orderBy: { createdAt: "desc" },
    include: { items: true, payment: true, customer: true, merchant: true },
  });
}

/**
 * Cancel an order. Resolve it by explicit reference, else fall back to the
 * customer's most recent unpaid order. Paid/fulfilled orders can't be cancelled
 * here (those need a refund). Scoped to the customer so one buyer can't touch
 * another's orders.
 */
export async function cancelOrder(opts: { reference?: string; customerId?: string; merchantId?: string }) {
  let order = opts.reference ? await getOrderByReference(opts.reference) : null;
  if (!order && opts.customerId) order = await latestCancellableOrder(opts.customerId);

  if (!order) return { ok: false as const, error: "No matching order to cancel." };
  if (opts.customerId && order.customerId && order.customerId !== opts.customerId) {
    return { ok: false as const, error: "That order belongs to a different customer." };
  }
  if (opts.merchantId && order.merchantId !== opts.merchantId) {
    return { ok: false as const, error: "That order belongs to a different store." };
  }
  if (order.status === "PAID" || order.status === "FULFILLED") {
    return { ok: false as const, error: `Order ${order.reference} is already paid and can't be cancelled.` };
  }
  if (order.status === "CANCELLED") {
    return { ok: true as const, order };
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "CANCELLED",
      payment: order.payment ? { update: { status: "FAILED" } } : undefined,
    },
    include: { items: true },
  });
  return { ok: true as const, order: updated };
}
