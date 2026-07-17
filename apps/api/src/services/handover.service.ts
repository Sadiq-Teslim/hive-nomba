import { prisma } from "../config/db.js";
import { sendWhatsAppText } from "../integrations/whatsapp/whatsapp.client.js";
import { getOrCreateConversation, saveMessage } from "./conversation.service.js";
import { normalizePhone } from "../utils/ref.js";

export async function captureHumanHandoverMessage(merchantId: string, rawPhone: string, text: string) {
  const phone = normalizePhone(rawPhone);
  const handover = await prisma.humanHandover.findFirst({
    where: { merchantId, phone, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!handover) return false;
  const conversation = await getOrCreateConversation(phone, "CUSTOMER", { merchantId, customerId: handover.customerId ?? undefined });
  await saveMessage(conversation.id, "USER", text || "(media)");
  return true;
}

export async function replyToHandover(merchantId: string, handoverId: string, text: string) {
  const handover = await prisma.humanHandover.findFirst({ where: { id: handoverId, merchantId } });
  if (!handover || handover.status === "CLOSED") return null;
  await sendWhatsAppText(handover.phone, text);
  const conversation = await getOrCreateConversation(handover.phone, "CUSTOMER", {
    merchantId,
    customerId: handover.customerId ?? undefined,
  });
  await saveMessage(conversation.id, "ASSISTANT", text);
  return prisma.humanHandover.update({
    where: { id: handover.id },
    data: { status: "ACTIVE", activeBy: merchantId },
  });
}

export async function returnHandoverToHive(merchantId: string, handoverId: string) {
  const handover = await prisma.humanHandover.findFirst({ where: { id: handoverId, merchantId } });
  if (!handover) return null;
  return prisma.humanHandover.update({
    where: { id: handover.id },
    data: { status: "RETURNED_TO_HIVE", closedAt: new Date() },
  });
}
