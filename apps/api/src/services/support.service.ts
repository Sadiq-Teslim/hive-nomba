import { prisma } from "../config/db.js";
import { logger } from "../config/logger.js";
import { sendWhatsAppText } from "../integrations/whatsapp/whatsapp.client.js";
import { getMerchant } from "./merchant.service.js";

export interface RaiseTicketInput {
  merchantId: string;
  customerId?: string;
  phone: string;
  category?: string; // complaint | question | refund | other
  message: string;
  orderRef?: string;
}

/**
 * Log a customer complaint/issue as a support ticket and alert the merchant on
 * WhatsApp so a human can step in. Returns the ticket.
 */
export async function raiseTicket(input: RaiseTicketInput) {
  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.supportTicket.create({
      data: {
        merchantId: input.merchantId,
        customerId: input.customerId,
        phone: input.phone,
        category: input.category ?? "complaint",
        message: input.message,
        orderRef: input.orderRef,
      },
    });
    const openHandover = await tx.humanHandover.findFirst({
      where: { merchantId: input.merchantId, phone: input.phone, status: { in: ["REQUESTED", "ACTIVE"] } },
    });
    if (!openHandover) {
      await tx.humanHandover.create({
        data: {
          merchantId: input.merchantId,
          customerId: input.customerId,
          phone: input.phone,
          reason: input.message,
          status: "REQUESTED",
        },
      });
    }
    return created;
  });

  const merchant = await getMerchant(input.merchantId);
  if (merchant?.whatsappPhone) {
    await sendWhatsAppText(
      merchant.whatsappPhone,
      `⚠️ New ${ticket.category} from ${input.phone}${input.orderRef ? ` (order ${input.orderRef})` : ""}:\n"${input.message}"\n\nReply to the customer or sort it out — Hive has logged it.`,
    ).catch((e) => logger.warn({ e }, "support merchant notify failed"));
  }
  logger.info({ ticketId: ticket.id, category: ticket.category }, "support ticket raised");
  return ticket;
}

/** Open support tickets for a merchant. */
export async function listOpenTickets(merchantId: string, limit = 20) {
  return prisma.supportTicket.findMany({
    where: { merchantId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/** Mark the most recent open ticket (optionally for a phone) as resolved. */
export async function resolveTicket(merchantId: string, phone?: string) {
  const ticket = await prisma.supportTicket.findFirst({
    where: { merchantId, status: "OPEN", ...(phone ? { phone } : {}) },
    orderBy: { createdAt: "desc" },
  });
  if (!ticket) return null;
  return prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: "RESOLVED" } });
}
