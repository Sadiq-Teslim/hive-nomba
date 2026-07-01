import { prisma } from "../config/db.js";
import { formatNaira } from "../utils/money.js";
import { sendWhatsAppText } from "../integrations/whatsapp/whatsapp.client.js";

/**
 * After a payment is confirmed, notify both the customer (receipt) and the
 * merchant (sale alert) on WhatsApp.
 */
export async function notifyOrderPaid(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, customer: true, merchant: true },
  });
  if (!order) return;

  const itemLines = order.items.map((i) => `• ${i.quantity} × ${i.nameSnapshot}`).join("\n");
  const total = formatNaira(order.totalKobo);

  if (order.customer?.whatsappPhone) {
    await sendWhatsAppText(
      order.customer.whatsappPhone,
      `✅ Payment received! Your order ${order.reference} is confirmed.\n\n${itemLines}\n\nTotal: ${total}\n\nThank you for shopping with ${order.merchant.businessName ?? "us"}! 🐝`,
    );
  }

  if (order.merchant?.whatsappPhone) {
    await sendWhatsAppText(
      order.merchant.whatsappPhone,
      `💰 New sale! Order ${order.reference} just got paid.\n\n${itemLines}\n\nTotal: ${total}\nStock has been updated automatically.`,
    );
  }
}
