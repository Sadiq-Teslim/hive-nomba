import { logger } from "../config/logger.js";
import { sendWhatsAppText } from "../integrations/whatsapp/whatsapp.client.js";
import { listCustomers, findInactiveCustomers } from "./customer.service.js";
import { getMerchant } from "./merchant.service.js";

export type PromotionAudience = "all" | "inactive";

/**
 * Broadcast a marketing message to a merchant's customers over WhatsApp.
 * `inactive` targets customers who haven't ordered in `days` days (win-back),
 * `all` targets everyone. Returns how many were messaged.
 */
export async function sendPromotion(opts: {
  merchantId: string;
  message: string;
  audience: PromotionAudience;
  days?: number;
}): Promise<{ sent: number; audience: PromotionAudience }> {
  const merchant = await getMerchant(opts.merchantId);
  const signature = merchant?.businessName ? `\n\n- ${merchant.businessName}` : "";

  const recipients =
    opts.audience === "inactive"
      ? (await findInactiveCustomers(opts.merchantId, opts.days ?? 30)).map((c) => c.whatsappPhone)
      : (await listCustomers(opts.merchantId, 500)).map((c) => c.phone);

  let sent = 0;
  for (const phone of recipients) {
    try {
      await sendWhatsAppText(phone, `${opts.message}${signature}`);
      sent++;
    } catch (err) {
      logger.warn({ phone, err }, "promotion send failed for recipient");
    }
  }
  logger.info({ merchantId: opts.merchantId, audience: opts.audience, sent }, "promotion broadcast");
  return { sent, audience: opts.audience };
}
