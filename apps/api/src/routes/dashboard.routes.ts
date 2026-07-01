import { Router } from "express";
import { prisma } from "../config/db.js";
import { getAnalytics } from "../services/analytics.service.js";
import { listProducts } from "../services/product.service.js";
import { formatNaira } from "../utils/money.js";

/**
 * Read-only REST endpoints for the (secondary) web dashboard. The primary UX is
 * WhatsApp; these power charts and tables.
 */
export const dashboardRouter = Router();

dashboardRouter.get("/merchants", async (_req, res, next) => {
  try {
    // Onboarded (named) stores first, then oldest — so the real demo store leads.
    const merchants = await prisma.merchant.findMany({
      orderBy: [{ onboarded: "desc" }, { createdAt: "asc" }],
    });
    res.json(merchants.map((m) => ({ id: m.id, businessName: m.businessName, phone: m.whatsappPhone, onboarded: m.onboarded })));
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get("/merchants/:id/overview", async (req, res, next) => {
  try {
    const merchant = await prisma.merchant.findUnique({ where: { id: req.params.id } });
    if (!merchant) return res.status(404).json({ error: "Merchant not found" });
    const analytics = await getAnalytics(merchant.id);
    res.json({ merchant: { id: merchant.id, businessName: merchant.businessName }, analytics });
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get("/merchants/:id/products", async (req, res, next) => {
  try {
    const products = await listProducts(req.params.id, true);
    res.json(
      products.map((p) => ({
        id: p.id,
        name: p.name,
        price: formatNaira(p.priceKobo),
        priceKobo: p.priceKobo,
        stock: p.stock,
        active: p.active,
        imageUrl: p.imageUrl,
      })),
    );
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get("/merchants/:id/orders", async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { merchantId: req.params.id },
      include: { items: true, customer: true, payment: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(
      orders.map((o) => ({
        reference: o.reference,
        status: o.status,
        total: formatNaira(o.totalKobo),
        totalKobo: o.totalKobo,
        customer: o.customer?.name ?? o.customer?.whatsappPhone ?? null,
        items: o.items.map((i) => ({ name: i.nameSnapshot, quantity: i.quantity })),
        createdAt: o.createdAt,
      })),
    );
  } catch (err) {
    next(err);
  }
});
