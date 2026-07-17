import { prisma } from "../config/db.js";
import { normalizePhone } from "../utils/ref.js";

export async function handleMerchantSetup(rawPhone: string, text: string) {
  const phone = normalizePhone(rawPhone);
  const merchant = await prisma.merchant.findUnique({ where: { whatsappPhone: phone } });
  if (!merchant || merchant.setupState === "ACTIVE") return null;
  if (merchant.whatsappConnectionStatus !== "CONNECTED") return null;

  const reply = text.trim();
  const yes = /^(yes|y|correct|confirm|ok|okay|sure)\b/i.test(reply);

  if (merchant.setupState === "CONFIRMING_BUSINESS") {
    if (!yes && reply.length > 1 && !/hive-/i.test(reply)) {
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: { businessName: reply.slice(0, 80), setupState: "CONFIGURING_FULFILMENT" },
      });
    } else {
      await prisma.merchant.update({ where: { id: merchant.id }, data: { setupState: "CONFIGURING_FULFILMENT" } });
    }
    const fulfilment = merchant.deliveryOption
      ? `I have your fulfilment preference as ${merchant.deliveryOption.toLowerCase().replace("_", " ")}.`
      : "Should customers use delivery, pickup, or both?";
    return {
      text: `${fulfilment}\nReply with delivery, pickup, or both if you want to change it.`,
      buttons: ["Delivery", "Pickup", "Both"],
    };
  }

  if (merchant.setupState === "CONFIGURING_FULFILMENT") {
    const option = /\bboth\b/i.test(reply)
      ? "BOTH"
      : /\bpick.?up|pickup\b/i.test(reply)
        ? "PICKUP"
        : /\bdeliver/i.test(reply)
          ? "DELIVERY"
          : merchant.deliveryOption;
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { deliveryOption: option, setupState: "CONFIGURING_POLICY" },
    });
    const policy = merchant.returnPolicy
      ? `Your current return policy is: ${merchant.returnPolicy}`
      : "What return or refund policy should customers see?";
    return { text: `${policy}\nReply with the policy, or say "use default".` };
  }

  if (merchant.setupState === "CONFIGURING_POLICY") {
    const returnPolicy =
      /^use default$/i.test(reply) || !reply
        ? "Returns or refund requests are reviewed by the merchant after order confirmation."
        : reply.slice(0, 500);
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { returnPolicy, setupState: "READY_TO_ADD_PRODUCT" },
    });
    return {
      text: "Great. Do you want to add your first product now?",
      buttons: ["Add product", "Later"],
    };
  }

  if (merchant.setupState === "READY_TO_ADD_PRODUCT") {
    await prisma.merchant.update({ where: { id: merchant.id }, data: { setupState: "ACTIVE" } });
    if (/add product/i.test(reply)) {
      return {
        text: "Your store is ready ✅\nSend the product name, price and stock. You can also send a product photo with price and stock.",
      };
    }
    return {
      text: "Your store is ready ✅\nYou can now add products, manage orders and receive customers through Hive.",
    };
  }

  return null;
}
