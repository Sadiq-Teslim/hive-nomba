import { prisma } from "../config/db.js";
import { logger } from "../config/logger.js";
import { sendWhatsAppText } from "../integrations/whatsapp/whatsapp.client.js";
import { getOrderByReference } from "./order.service.js";

export async function requestOrderRefund(input: {
  reference: string;
  customerId: string;
  reason?: string;
}) {
  const order = await getOrderByReference(input.reference);
  if (!order || order.customerId !== input.customerId) return { ok: false as const, error: "Order not found." };
  if (!["PAID", "ACCEPTED", "PROCESSING", "READY_FOR_PICKUP", "DISPATCHED", "DELIVERED", "FULFILLED", "REFUND_REQUESTED"].includes(order.status)) {
    return { ok: false as const, error: `Order ${order.reference} is not eligible for a refund request.` };
  }

  const existing = await prisma.dispute.findFirst({
    where: { orderId: order.id, customerId: input.customerId, status: { in: ["OPEN", "AWAITING_MERCHANT", "UNDER_REVIEW"] } },
  });
  if (existing) return { ok: true as const, dispute: existing, order, alreadyOpen: true };

  const dispute = await prisma.$transaction(async (tx) => {
    const created = await tx.dispute.create({
      data: {
        merchantId: order.merchantId,
        customerId: input.customerId,
        orderId: order.id,
        reason: "refund_request",
        description: input.reason?.trim() || "Buyer requested a refund.",
        status: "AWAITING_MERCHANT",
      },
    });
    await tx.order.update({ where: { id: order.id }, data: { status: "REFUND_REQUESTED" } });
    await tx.orderStatusEvent.create({
      data: { orderId: order.id, fromStatus: order.status, toStatus: "REFUND_REQUESTED", actorType: "customer", actorId: input.customerId, note: input.reason },
    });
    return created;
  });

  if (order.merchant?.whatsappPhone) {
    await sendWhatsAppText(order.merchant.whatsappPhone, `Refund request for ${order.reference}${input.reason ? `\nReason: ${input.reason}` : ""}. Review it in Hive before approving.`)
      .catch((e) => logger.warn({ e }, "refund request merchant notify failed"));
  }
  return { ok: true as const, dispute, order, alreadyOpen: false };
}
