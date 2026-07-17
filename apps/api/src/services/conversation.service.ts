import type { Party } from "@prisma/client";
import { prisma } from "../config/db.js";
import { normalizePhone } from "../utils/ref.js";

export async function getOrCreateConversation(
  phone: string,
  party: Party,
  link: { merchantId?: string; customerId?: string },
) {
  const normalized = normalizePhone(phone);
  const scopeKey = link.merchantId ?? "LOBBY";
  return prisma.conversation.upsert({
    where: { scopeKey_phone_party: { scopeKey, phone: normalized, party } },
    update: { merchantId: link.merchantId, customerId: link.customerId },
    create: { scopeKey, phone: normalized, party, merchantId: link.merchantId, customerId: link.customerId },
  });
}

/** The store a customer has chosen for this conversation, if any. */
export async function getConversationStore(phone: string): Promise<string | null> {
  const convo = await prisma.conversation.findUnique({
    where: { scopeKey_phone_party: { scopeKey: "LOBBY", phone: normalizePhone(phone), party: "CUSTOMER" } },
  });
  return convo?.merchantId ?? null;
}

/** Lock a customer's conversation to a chosen store. */
export async function setConversationStore(phone: string, merchantId: string) {
  return prisma.conversation.upsert({
    where: { scopeKey_phone_party: { scopeKey: "LOBBY", phone: normalizePhone(phone), party: "CUSTOMER" } },
    update: { merchantId },
    create: { scopeKey: "LOBBY", phone: normalizePhone(phone), party: "CUSTOMER", merchantId },
  });
}

/** Recent text turns for short-term memory, oldest first. */
export async function recentMessages(conversationId: string, limit = 12) {
  const rows = await prisma.message.findMany({
    where: { conversationId, role: { in: ["USER", "ASSISTANT"] } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.reverse();
}

export async function saveMessage(
  conversationId: string,
  role: "USER" | "ASSISTANT",
  content: string,
) {
  return prisma.message.create({ data: { conversationId, role, content } });
}
