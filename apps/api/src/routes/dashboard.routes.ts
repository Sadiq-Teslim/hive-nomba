import { Router } from "express";
import { prisma } from "../config/db.js";
import { getAnalytics } from "../services/analytics.service.js";
import { listProducts } from "../services/product.service.js";
import { formatNaira } from "../utils/money.js";
import { getOnboardingStatus } from "../services/onboarding.service.js";
import { updateOrderStatus } from "../services/order.service.js";
import { z } from "zod";
import { requireMerchantSession } from "../middleware/auth.js";
import { replyToHandover, returnHandoverToHive } from "../services/handover.service.js";

/**
 * Read-only REST endpoints for the (secondary) web dashboard. The primary UX is
 * WhatsApp; these power charts and tables.
 */
export const dashboardRouter = Router();

dashboardRouter.use(requireMerchantSession);

dashboardRouter.get("/merchants", async (req, res, next) => {
  try {
    // Onboarded (named) stores first, then oldest — so the real demo store leads.
    const merchants = await prisma.merchant.findMany({
      where: (req as typeof req & { merchantId?: string }).merchantId
        ? { id: (req as typeof req & { merchantId?: string }).merchantId }
        : undefined,
      orderBy: [{ onboarded: "desc" }, { createdAt: "asc" }],
    });
    res.json(
      merchants.map((m) => ({
        id: m.id,
        businessName: m.businessName,
        phone: m.whatsappPhone,
        onboarded: m.onboarded,
        verificationStatus: m.verificationStatus,
        whatsappConnectionStatus: m.whatsappConnectionStatus,
        setupState: m.setupState,
        storefrontSlug: m.storefrontSlug,
        storefrontCode: m.storefrontCode,
      })),
    );
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get("/merchants/:id/overview", async (req, res, next) => {
  try {
    const merchant = await prisma.merchant.findUnique({ where: { id: req.params.id } });
    if (!merchant) return res.status(404).json({ error: "Merchant not found" });
    const analytics = await getAnalytics(merchant.id);
    res.json({
      merchant: {
        id: merchant.id,
        businessName: merchant.businessName,
        verificationStatus: merchant.verificationStatus,
        trustLevel: merchant.trustLevel,
        whatsappConnectionStatus: merchant.whatsappConnectionStatus,
        setupState: merchant.setupState,
      },
      analytics,
    });
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get("/merchants/:id/setup", async (req, res, next) => {
  try {
    const status = await getOnboardingStatus(req.params.id);
    res.json({
      merchant: {
        id: status.merchant.id,
        businessName: status.merchant.businessName,
        category: status.merchant.category,
        verificationStatus: status.merchant.verificationStatus,
        trustLevel: status.merchant.trustLevel,
        whatsappConnectionStatus: status.merchant.whatsappConnectionStatus,
        setupState: status.merchant.setupState,
        deliveryOption: status.merchant.deliveryOption,
        deliveryLocations: status.merchant.deliveryLocations,
        returnPolicy: status.merchant.returnPolicy,
      },
      checklist: status.checklist,
      activation: status.activation,
      share: status.share,
    });
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get("/merchants/:id/risk-events", async (req, res, next) => {
  try {
    const events = await prisma.riskEvent.findMany({
      where: { merchantId: req.params.id, status: { in: ["OPEN", "REVIEWING"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json(events);
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get("/merchants/:id/disputes", async (req, res, next) => {
  try {
    const disputes = await prisma.dispute.findMany({
      where: { merchantId: req.params.id },
      include: { order: true, customer: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(
      disputes.map((d) => ({
        id: d.id,
        status: d.status,
        reason: d.reason,
        description: d.description,
        order: d.order?.reference ?? null,
        customer: d.customer?.name ?? d.customer?.whatsappPhone ?? null,
        createdAt: d.createdAt,
      })),
    );
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get("/merchants/:id/handovers", async (req, res, next) => {
  try {
    const handovers = await prisma.humanHandover.findMany({
      where: { merchantId: req.params.id, status: { in: ["REQUESTED", "ACTIVE"] } },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(handovers);
  } catch (err) {
    next(err);
  }
});

dashboardRouter.post("/merchants/:id/handovers/:handoverId/reply", async (req, res, next) => {
  try {
    const parsed = z.object({ text: z.string().trim().min(1).max(1500) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    const handover = await replyToHandover(req.params.id, req.params.handoverId, parsed.data.text);
    if (!handover) return res.status(404).json({ error: "Handover not found." });
    res.json(handover);
  } catch (err) {
    next(err);
  }
});

dashboardRouter.patch("/merchants/:id/handovers/:handoverId/return", async (req, res, next) => {
  try {
    const handover = await returnHandoverToHive(req.params.id, req.params.handoverId);
    if (!handover) return res.status(404).json({ error: "Handover not found." });
    res.json(handover);
  } catch (err) {
    next(err);
  }
});

const orderStatusSchema = z.object({
  status: z.enum(["ACCEPTED", "PROCESSING", "READY_FOR_PICKUP", "DISPATCHED", "DELIVERED", "FULFILLED"]),
  note: z.string().max(500).optional(),
  carrier: z.string().max(100).optional(),
  trackingRef: z.string().max(100).optional(),
});

dashboardRouter.patch("/merchants/:id/orders/:reference/status", async (req, res, next) => {
  try {
    const parsed = orderStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    const result = await updateOrderStatus({
      merchantId: req.params.id,
      reference: req.params.reference,
      ...parsed.data,
    });
    if (!result.ok) return res.status(409).json({ error: result.error });
    res.json(result.order);
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
