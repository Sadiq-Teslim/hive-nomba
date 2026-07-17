import crypto from "node:crypto";
import { Prisma, type Merchant } from "@prisma/client";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { activationCode, normalizePhone, slugifyBusinessName, storeCode } from "../utils/ref.js";

const CODE_RE = /\bHIVE-[A-Z0-9]{6}\b/i;

export interface AccountInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export interface BusinessInput {
  businessName: string;
  businessCategory: string;
  businessDescription?: string;
  businessPhone?: string;
  businessAddress?: string;
  cityState?: string;
  deliveryOption?: "DELIVERY" | "PICKUP" | "BOTH";
  deliveryLocations?: string;
  returnPolicy?: string;
  cacRegistrationNumber?: string;
  logoUrl?: string;
  settlementBankName?: string;
  settlementAccountNumber?: string;
  settlementAccountName?: string;
}

function hashActivationCode(code: string): string {
  return crypto.createHmac("sha256", env.ACTIVATION_CODE_SECRET).update(code.toUpperCase()).digest("hex");
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => (err ? reject(err) : resolve(derivedKey)));
  });
  return `scrypt:${salt}:${key.toString("hex")}`;
}

async function uniqueSlug(businessName: string): Promise<string> {
  const base = slugifyBusinessName(businessName);
  for (let i = 0; i < 12; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const exists = await prisma.merchant.findUnique({ where: { storefrontSlug: candidate } });
    if (!exists) return candidate;
  }
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}

async function uniqueStoreCode(): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const candidate = storeCode();
    const exists = await prisma.merchant.findUnique({ where: { storefrontCode: candidate } });
    if (!exists) return candidate;
  }
  throw new Error("Could not allocate a store code. Please try again.");
}

export async function createMerchantAccount(input: AccountInput) {
  const email = input.email.trim().toLowerCase();
  const accountPhone = normalizePhone(input.phone);
  const passwordHash = await hashPassword(input.password);

  const merchant = await prisma.merchant.create({
    data: {
      email,
      accountPhone,
      whatsappPhone: `pending-${crypto.randomUUID()}`,
      ownerName: input.fullName.trim(),
      passwordHash,
      verificationStatus: "UNVERIFIED",
      whatsappConnectionStatus: "NOT_CONNECTED",
      setupState: "AWAITING_ACTIVATION",
    },
  });

  await writeAudit({
    merchantId: merchant.id,
    actorType: "merchant",
    actorId: merchant.email ?? merchant.id,
    action: "merchant.account_created",
    metadata: { email: merchant.email, accountPhone },
  });

  return merchant;
}

export async function upsertBusinessRegistration(merchantId: string, input: BusinessInput) {
  const current = await prisma.merchant.findUnique({ where: { id: merchantId } });
  if (!current) throw new Error("Merchant not found");

  const slug = current.storefrontSlug ?? (await uniqueSlug(input.businessName));
  const code = current.storefrontCode ?? (await uniqueStoreCode());
  const bankChanged =
    current.settlementAccountNumber &&
    input.settlementAccountNumber &&
    current.settlementAccountNumber !== input.settlementAccountNumber;

  const merchant = await prisma.merchant.update({
    where: { id: merchantId },
    data: {
      businessName: input.businessName.trim(),
      category: input.businessCategory.trim(),
      about: input.businessDescription?.trim() || null,
      businessPhone: input.businessPhone ? normalizePhone(input.businessPhone) : null,
      address: input.businessAddress?.trim() || null,
      cityState: input.cityState?.trim() || null,
      deliveryOption: input.deliveryOption,
      deliveryLocations: input.deliveryLocations?.trim() || null,
      deliveryInfo: input.deliveryLocations?.trim() || current.deliveryInfo,
      returnPolicy: input.returnPolicy?.trim() || null,
      cacRegistrationNumber: input.cacRegistrationNumber?.trim() || null,
      logoUrl: input.logoUrl?.trim() || null,
      settlementBankName: input.settlementBankName?.trim() || null,
      settlementAccountNumber: input.settlementAccountNumber?.trim() || null,
      settlementAccountName: input.settlementAccountName?.trim() || null,
      bankVerified: false,
      storefrontSlug: slug,
      storefrontCode: code,
      customerGreeting:
        current.customerGreeting ??
        `Hi, I'm Hive, ${input.businessName.trim()}'s automated shopping assistant. What would you like to buy today?`,
      onboarded: true,
      verificationStatus: current.verificationStatus === "VERIFIED" ? "VERIFIED" : "PENDING",
    },
  });

  await writeAudit({
    merchantId,
    actorType: "merchant",
    actorId: current.email ?? merchantId,
    action: "merchant.business_registered",
    metadata: { storefrontSlug: slug, storefrontCode: code },
  });

  if (bankChanged) {
    await createRiskEvent({
      merchantId,
      eventType: "settlement_details_changed",
      severity: "MEDIUM",
      reason: "Merchant changed settlement account details.",
      metadata: { bankName: input.settlementBankName, accountName: input.settlementAccountName },
    });
  }

  return merchant;
}

export function verificationChecklist(merchant: Merchant) {
  return [
    { key: "email", label: "Email verified", complete: merchant.emailVerified },
    { key: "phone", label: "Phone verified", complete: merchant.phoneVerified },
    { key: "identity", label: "Identity pending", complete: merchant.identityVerified },
    { key: "bank", label: "Bank account pending", complete: merchant.bankVerified },
    {
      key: "business_registration",
      label: "Business registration optional",
      complete: merchant.businessRegistrationVerified || Boolean(merchant.cacRegistrationNumber),
    },
  ];
}

export async function getOnboardingStatus(merchantId: string) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: { activationCodes: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!merchant) throw new Error("Merchant not found");
  const latestCode = merchant.activationCodes[0];
  return {
    merchant,
    checklist: verificationChecklist(merchant),
    activation: latestCode
      ? {
          codePreview: latestCode.codePreview,
          expiresAt: latestCode.expiresAt,
          usedAt: latestCode.usedAt,
          expired: latestCode.expiresAt.getTime() < Date.now(),
        }
      : null,
    share: getStoreShareLinks(merchant),
  };
}

export async function generateWhatsAppActivationCode(merchantId: string) {
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
  if (!merchant) throw new Error("Merchant not found");
  if (!merchant.businessName) throw new Error("Register your business before connecting WhatsApp.");

  const windowStart = new Date(Date.now() - 15 * 60_000);
  const recent = await prisma.activationCode.count({
    where: { merchantId, createdAt: { gte: windowStart } },
  });
  if (recent >= env.ACTIVATION_CODE_RATE_LIMIT) {
    throw new Error("Too many activation codes requested. Please wait a few minutes and try again.");
  }

  let code = activationCode();
  for (let i = 0; i < 10; i++) {
    const exists = await prisma.activationCode.findUnique({ where: { codeHash: hashActivationCode(code) } });
    if (!exists) break;
    code = activationCode();
  }

  const expiresAt = new Date(Date.now() + env.ACTIVATION_CODE_TTL_MINUTES * 60_000);
  await prisma.$transaction([
    prisma.activationCode.updateMany({
      where: { merchantId, usedAt: null, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date() },
    }),
    prisma.activationCode.create({
      data: {
        merchantId,
        codeHash: hashActivationCode(code),
        codePreview: `${code.slice(0, 5)}••${code.slice(-2)}`,
        expiresAt,
      },
    }),
    prisma.merchant.update({
      where: { id: merchantId },
      data: {
        whatsappConnectionStatus: merchant.whatsappConnectionStatus === "CONNECTED" ? "CONNECTED" : "WAITING_FOR_ACTIVATION",
        activationCodeGeneratedAt: new Date(),
        setupState: merchant.setupState === "ACTIVE" ? "ACTIVE" : "AWAITING_ACTIVATION",
      },
    }),
    prisma.auditLog.create({
      data: {
        merchantId,
        actorType: "merchant",
        actorId: merchant.email ?? merchantId,
        action: "whatsapp.activation_code_generated",
        metadata: { expiresAt } as Prisma.InputJsonObject,
      },
    }),
  ]);

  return { code, expiresAt, hiveWhatsAppNumber: env.HIVE_WHATSAPP_NUMBER };
}

export async function tryActivateWhatsApp(rawPhone: string, text: string) {
  const match = text.toUpperCase().match(CODE_RE);
  if (!match) return null;

  const phone = normalizePhone(rawPhone);
  const recentFailures = await prisma.auditLog.count({
    where: {
      actorId: phone,
      action: "whatsapp.activation_failed",
      createdAt: { gte: new Date(Date.now() - 15 * 60_000) },
    },
  });
  if (recentFailures >= env.ACTIVATION_ATTEMPT_RATE_LIMIT) {
    return { ok: false as const, text: "Too many activation attempts. Please wait 15 minutes before trying again." };
  }
  const code = match[0].toUpperCase();
  const codeHash = hashActivationCode(code);
  const activation = await prisma.activationCode.findUnique({
    where: { codeHash },
    include: { merchant: true },
  });

  if (!activation) {
    await writeAudit({
      actorType: "whatsapp",
      actorId: phone,
      action: "whatsapp.activation_failed",
      metadata: { reason: "unknown_code" },
    });
    return { ok: false as const, text: "That Hive activation code is invalid. Please copy the latest code from your dashboard." };
  }

  await prisma.activationCode.update({
    where: { id: activation.id },
    data: { attempts: { increment: 1 }, lastAttemptAt: new Date(), usedByPhone: phone },
  });

  if (activation.usedAt) {
    await writeAudit({ actorType: "whatsapp", actorId: phone, action: "whatsapp.activation_failed", metadata: { reason: "used_code" } });
    return { ok: false as const, text: "That activation code has already been used. Generate a new one from your dashboard." };
  }
  if (activation.expiresAt.getTime() < Date.now()) {
    if (activation.merchant.whatsappConnectionStatus !== "CONNECTED") {
      await prisma.merchant.update({
        where: { id: activation.merchantId },
        data: { whatsappConnectionStatus: "CODE_EXPIRED" },
      });
    }
    await writeAudit({ actorType: "whatsapp", actorId: phone, action: "whatsapp.activation_failed", metadata: { reason: "expired_code" } });
    return { ok: false as const, text: "That activation code has expired. Please generate a new one from your Hive dashboard." };
  }

  const existingPhoneOwner = await prisma.merchant.findUnique({ where: { whatsappPhone: phone } });
  if (existingPhoneOwner && existingPhoneOwner.id !== activation.merchantId) {
    await createRiskEvent({
      merchantId: activation.merchantId,
      eventType: "whatsapp_phone_already_linked",
      severity: "HIGH",
      reason: "A WhatsApp number already linked to another merchant tried to activate this store.",
      metadata: { phone },
    });
    await prisma.merchant.update({
      where: { id: activation.merchantId },
      data: { whatsappConnectionStatus: "CONNECTION_FAILED" },
    });
    return { ok: false as const, text: "This WhatsApp number is already connected to another Hive business." };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const claim = await tx.activationCode.updateMany({
      where: { id: activation.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date(), usedByPhone: phone },
    });
    if (claim.count !== 1) throw new Error("ACTIVATION_CODE_ALREADY_CLAIMED");
    await tx.auditLog.create({
      data: {
        merchantId: activation.merchantId,
        actorType: "whatsapp",
        actorId: phone,
        action: "whatsapp.connected",
        metadata: { activationCodeId: activation.id },
      },
    });
    if (!activation.merchant.whatsappPhone.startsWith("pending-") && activation.merchant.whatsappPhone !== phone) {
      await tx.riskEvent.create({
        data: {
          merchantId: activation.merchantId,
          eventType: "whatsapp_phone_changed",
          severity: "HIGH",
          reason: "The merchant activated Hive from a different WhatsApp number.",
          metadata: { previousPhone: activation.merchant.whatsappPhone, newPhone: phone },
        },
      });
    }
    return tx.merchant.update({
      where: { id: activation.merchantId },
      data: {
        whatsappPhone: phone,
        whatsappConnectionStatus: "CONNECTED",
        whatsappConnectedAt: new Date(),
        phoneVerified: true,
        setupState: activation.merchant.setupState === "ACTIVE" ? "ACTIVE" : "CONFIRMING_BUSINESS",
      },
    });
  }).catch(async (error) => {
    if (error instanceof Error && error.message === "ACTIVATION_CODE_ALREADY_CLAIMED") return null;
    throw error;
  });

  if (!updated) {
    return { ok: false as const, text: "That activation code was already used or expired. Generate a new one from your dashboard." };
  }

  return {
    ok: true as const,
    merchant: updated,
    text: `Welcome to Hive, ${updated.ownerName ?? "there"}.\nYour WhatsApp has been connected to ${updated.businessName ?? "your business"} ✅\n\nReply YES to confirm this is the customer-facing business name.`,
  };
}

export function getStoreShareLinks(merchant: Pick<Merchant, "storefrontSlug" | "storefrontCode" | "customerGreeting">) {
  const storePath = merchant.storefrontSlug ? `/shop/${merchant.storefrontSlug}` : "";
  const storeUrl = storePath ? `${env.APP_WEB_URL.replace(/\/$/, "")}${storePath}` : null;
  const text = encodeURIComponent(merchant.storefrontCode ?? "");
  const whatsappUrl = merchant.storefrontCode ? `https://wa.me/${env.HIVE_WHATSAPP_NUMBER}?text=${text}` : null;
  const qrPayload = whatsappUrl ?? storeUrl;
  return {
    storeUrl,
    whatsappUrl,
    qrPayload,
    storeCode: merchant.storefrontCode,
    greeting: merchant.customerGreeting,
  };
}

export async function writeAudit(input: {
  merchantId?: string;
  actorType: string;
  actorId?: string;
  action: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
}) {
  return prisma.auditLog.create({
    data: {
      merchantId: input.merchantId,
      actorType: input.actorType,
      actorId: input.actorId,
      action: input.action,
      metadata: input.metadata === undefined ? undefined : input.metadata,
      ipAddress: input.ipAddress,
    },
  });
}

export async function createRiskEvent(input: {
  merchantId: string;
  eventType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reason: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.riskEvent.create({
    data: {
      merchantId: input.merchantId,
      eventType: input.eventType,
      severity: input.severity,
      reason: input.reason,
      metadata: input.metadata === undefined ? undefined : input.metadata,
    },
  });
}
