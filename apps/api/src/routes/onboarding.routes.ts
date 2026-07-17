import { Router } from "express";
import { z } from "zod";
import {
  createMerchantAccount,
  generateWhatsAppActivationCode,
  getOnboardingStatus,
  getStoreShareLinks,
  upsertBusinessRegistration,
} from "../services/onboarding.service.js";
import { prisma } from "../config/db.js";
import { createMerchantSession, loginMerchant } from "../services/auth.service.js";
import { requireMerchantSession } from "../middleware/auth.js";

export const onboardingRouter = Router();

const accountSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
  password: z.string().min(8),
});

const businessSchema = z.object({
  businessName: z.string().min(2),
  businessCategory: z.string().min(2),
  businessDescription: z.string().optional(),
  businessPhone: z.string().optional(),
  businessAddress: z.string().optional(),
  cityState: z.string().optional(),
  deliveryOption: z.enum(["DELIVERY", "PICKUP", "BOTH"]).optional(),
  deliveryLocations: z.string().optional(),
  returnPolicy: z.string().optional(),
  cacRegistrationNumber: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  settlementBankName: z.string().optional(),
  settlementAccountNumber: z.string().optional(),
  settlementAccountName: z.string().optional(),
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

onboardingRouter.post("/onboarding/account", async (req, res, next) => {
  try {
    const parsed = accountSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    const merchant = await createMerchantAccount(parsed.data);
    const session = await createMerchantSession(merchant.id);
    res.status(201).json({
      merchant: {
        id: merchant.id,
        fullName: merchant.ownerName,
        email: merchant.email,
        verificationStatus: merchant.verificationStatus,
        whatsappConnectionStatus: merchant.whatsappConnectionStatus,
      },
      session,
    });
  } catch (err: any) {
    if (err?.code === "P2002") return res.status(409).json({ error: "That email is already registered." });
    next(err);
  }
});

onboardingRouter.post("/onboarding/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    const result = await loginMerchant(parsed.data.email, parsed.data.password);
    if (!result) return res.status(401).json({ error: "Invalid email or password." });
    res.json({
      merchant: { id: result.merchant.id, businessName: result.merchant.businessName, setupState: result.merchant.setupState },
      session: { token: result.token, expiresAt: result.expiresAt },
    });
  } catch (err) {
    next(err);
  }
});

onboardingRouter.put("/onboarding/:merchantId/business", requireMerchantSession, async (req, res, next) => {
  try {
    const parsed = businessSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    const merchant = await upsertBusinessRegistration(req.params.merchantId, parsed.data);
    res.json({
      merchant: {
        id: merchant.id,
        businessName: merchant.businessName,
        category: merchant.category,
        verificationStatus: merchant.verificationStatus,
        storefrontSlug: merchant.storefrontSlug,
        storefrontCode: merchant.storefrontCode,
        share: getStoreShareLinks(merchant),
      },
    });
  } catch (err) {
    next(err);
  }
});

onboardingRouter.get("/onboarding/:merchantId/status", requireMerchantSession, async (req, res, next) => {
  try {
    const status = await getOnboardingStatus(req.params.merchantId);
    res.json({
      merchant: {
        id: status.merchant.id,
        fullName: status.merchant.ownerName,
        email: status.merchant.email,
        businessName: status.merchant.businessName,
        category: status.merchant.category,
        verificationStatus: status.merchant.verificationStatus,
        trustLevel: status.merchant.trustLevel,
        whatsappConnectionStatus: status.merchant.whatsappConnectionStatus,
        setupState: status.merchant.setupState,
        storefrontSlug: status.merchant.storefrontSlug,
        storefrontCode: status.merchant.storefrontCode,
        returnPolicy: status.merchant.returnPolicy,
        deliveryOption: status.merchant.deliveryOption,
        deliveryLocations: status.merchant.deliveryLocations,
      },
      checklist: status.checklist,
      activation: status.activation,
      share: status.share,
    });
  } catch (err) {
    next(err);
  }
});

onboardingRouter.post("/onboarding/:merchantId/activation-code", requireMerchantSession, async (req, res, next) => {
  try {
    const result = await generateWhatsAppActivationCode(req.params.merchantId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

onboardingRouter.get("/shops/:slug", async (req, res, next) => {
  try {
    const merchant = await prisma.merchant.findFirst({
      where: {
        OR: [{ storefrontSlug: req.params.slug }, { storefrontCode: req.params.slug.toUpperCase() }],
        onboarded: true,
        verificationStatus: { notIn: ["REJECTED", "SUSPENDED"] },
        trustLevel: { notIn: ["RESTRICTED", "SUSPENDED"] },
      },
      select: {
        id: true,
        businessName: true,
        category: true,
        about: true,
        logoUrl: true,
        storefrontSlug: true,
        storefrontCode: true,
        customerGreeting: true,
        deliveryOption: true,
        deliveryLocations: true,
        returnPolicy: true,
      },
    });
    if (!merchant) return res.status(404).json({ error: "Store not found" });
    res.json({ merchant, share: getStoreShareLinks(merchant) });
  } catch (err) {
    next(err);
  }
});
