/**
 * Seed sample orders/customers for the FIRST store so the dashboard looks alive
 * in demos (revenue chart, top products, order-status breakdown, top customers).
 *
 * Usage:  node --env-file=apps/api/.env apps/api/scripts/seed-demo-orders.mjs
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
const ref = () => "HIVE-" + Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[rnd(32)]).join("");

const CUSTOMERS = [
  ["Chidinma", "2348030000011"],
  ["Emeka", "2348030000022"],
  ["Aisha", "2348030000033"],
  ["Tobi", "2348030000044"],
  ["Funke", "2348030000055"],
  ["Ibrahim", "2348030000066"],
];

async function main() {
  const store = await prisma.merchant.findFirst({ where: { onboarded: true }, orderBy: { createdAt: "asc" }, include: { products: true } });
  if (!store) throw new Error("No store found — run the seed first.");

  // Clear existing demo orders/customers for a clean slate on this store.
  await prisma.order.deleteMany({ where: { merchantId: store.id } });
  await prisma.customer.deleteMany({ where: { merchantId: store.id } });

  const customers = [];
  for (const [name, phone] of CUSTOMERS) {
    customers.push(await prisma.customer.create({ data: { merchantId: store.id, whatsappPhone: phone, name } }));
  }

  const statuses = ["PAID", "PAID", "PAID", "PAID", "FULFILLED", "PAID", "PENDING_PAYMENT", "PAID", "CANCELLED", "PAID"];
  let made = 0;
  for (let i = 0; i < 22; i++) {
    const daysAgo = rnd(14);
    const when = new Date(Date.now() - daysAgo * 86400000 - rnd(86400000));
    const lineCount = 1 + rnd(3);
    const items = [];
    let total = 0;
    for (let j = 0; j < lineCount; j++) {
      const p = pick(store.products);
      const qty = 1 + rnd(3);
      total += p.priceKobo * qty;
      items.push({ productId: p.id, nameSnapshot: p.name, priceKobo: p.priceKobo, quantity: qty });
    }
    const status = pick(statuses);
    const cust = pick(customers);
    const paid = status === "PAID" || status === "FULFILLED";
    await prisma.order.create({
      data: {
        reference: ref(),
        merchantId: store.id,
        customerId: cust.id,
        status,
        totalKobo: total,
        createdAt: when,
        items: { create: items },
        ...(paid
          ? { payment: { create: { amountKobo: total, status: "SUCCESS", provider: "nomba", providerRef: "DEMO-" + rnd(1e9), paidAt: when } } }
          : {}),
      },
    });
    if (paid) await prisma.customer.update({ where: { id: cust.id }, data: { lastOrderedAt: when } });
    made++;
  }
  console.log(`✅ Seeded ${made} demo orders + ${customers.length} customers for "${store.businessName}".`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
