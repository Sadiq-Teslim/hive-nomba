import { prisma } from "../config/db.js";
import { normalizePhone } from "../utils/ref.js";

export async function getOrCreateCustomer(merchantId: string, phone: string, name?: string) {
  const whatsappPhone = normalizePhone(phone);
  return prisma.customer.upsert({
    where: { merchantId_whatsappPhone: { merchantId, whatsappPhone } },
    update: name ? { name } : {},
    create: { merchantId, whatsappPhone, name },
  });
}

/** All customers of a merchant, most recently active first, with paid-order counts. */
export async function listCustomers(merchantId: string, limit = 50) {
  const customers = await prisma.customer.findMany({
    where: { merchantId },
    orderBy: [{ lastOrderedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: limit,
    include: { _count: { select: { orders: { where: { status: { in: ["PAID", "FULFILLED"] } } } } } },
  });
  return customers.map((c) => ({
    name: c.name,
    phone: c.whatsappPhone,
    lastOrderedAt: c.lastOrderedAt,
    paidOrders: c._count.orders,
  }));
}

/**
 * Customers who haven't ordered in `days` days (or never since first contact).
 * Useful for the "recover inactive customers" job.
 */
export async function findInactiveCustomers(merchantId: string, days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.customer.findMany({
    where: {
      merchantId,
      OR: [{ lastOrderedAt: { lt: cutoff } }, { lastOrderedAt: null }],
    },
    orderBy: { lastOrderedAt: "asc" },
    take: 50,
  });
}
