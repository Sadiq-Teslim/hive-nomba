import { prisma } from "../config/db.js";
import { normalizePhone } from "../utils/ref.js";

/** Fetch a merchant by WhatsApp phone, creating a shell record on first contact. */
export async function getOrCreateMerchant(phone: string) {
  const whatsappPhone = normalizePhone(phone);
  return prisma.merchant.upsert({
    where: { whatsappPhone },
    update: {},
    create: { whatsappPhone },
  });
}

export async function getMerchant(merchantId: string) {
  return prisma.merchant.findUnique({ where: { id: merchantId } });
}

/** All onboarded (named) stores customers can shop from. */
export async function listStores() {
  return prisma.merchant.findMany({
    where: { onboarded: true, businessName: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { id: true, businessName: true, category: true, storefrontSlug: true, storefrontCode: true },
  });
}

/** Resolve a store by (fuzzy) business name. */
export async function findStoreByName(name: string) {
  const trimmed = name.trim();
  const upper = trimmed.toUpperCase();
  const direct = await prisma.merchant.findFirst({
    where: {
      onboarded: true,
      OR: [{ storefrontCode: upper }, { storefrontSlug: trimmed.toLowerCase() }],
    },
    orderBy: { createdAt: "asc" },
  });
  if (direct) return direct;

  return prisma.merchant.findFirst({
    where: { onboarded: true, businessName: { contains: trimmed, mode: "insensitive" } },
    orderBy: { createdAt: "asc" },
  });
}

export interface MerchantProfileInput {
  businessName?: string;
  ownerName?: string;
  category?: string;
  currency?: string;
}

/** Update profile fields and mark onboarded once a business name exists. */
export async function updateMerchantProfile(merchantId: string, input: MerchantProfileInput) {
  const current = await prisma.merchant.findUnique({ where: { id: merchantId } });
  const onboarded = current?.onboarded || Boolean(input.businessName || current?.businessName);
  return prisma.merchant.update({
    where: { id: merchantId },
    data: { ...input, onboarded },
  });
}

export interface StoreInfoInput {
  address?: string;
  businessHours?: string;
  deliveryInfo?: string;
  contactInfo?: string;
  about?: string;
}

/** Update the customer-facing store info (hours, address, delivery, contact, about). */
export async function updateStoreInfo(merchantId: string, input: StoreInfoInput) {
  const data = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined && v !== ""));
  return prisma.merchant.update({ where: { id: merchantId }, data });
}
