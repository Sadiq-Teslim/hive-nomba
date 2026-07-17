import type { Party } from "@prisma/client";
import { prisma } from "../config/db.js";
import { normalizePhone } from "../utils/ref.js";
import { getOrCreateCustomer } from "./customer.service.js";
import { getConversationStore } from "./conversation.service.js";
import type { ToolContext } from "../agent/tools.js";
import { isProd } from "../config/env.js";

export type RouteMode = "merchant" | "shopping" | "lobby";

export interface RouteResult {
  party: Party;
  mode: RouteMode;
  ctx: ToolContext;
}

/**
 * Decide who is messaging and against which store, then build the tool context.
 *
 * Routing rules:
 *  - A Merchant phone -> MERCHANT (manages their own store).
 *  - No merchants at all yet -> the sender bootstraps the first store as MERCHANT.
 *  - Otherwise -> CUSTOMER. There is NO default store: the customer must choose
 *    which store they're buying from. Until they do, they're in "lobby" mode
 *    (store selection). Once chosen, the store is remembered on their conversation.
 */
export async function routeInbound(rawPhone: string): Promise<RouteResult> {
  const phone = normalizePhone(rawPhone);

  const merchant = await prisma.merchant.findUnique({ where: { whatsappPhone: phone } });
  if (merchant) {
    return { party: "MERCHANT", mode: "merchant", ctx: { party: "MERCHANT", merchantId: merchant.id } };
  }

  const merchantCount = await prisma.merchant.count();
  if (merchantCount === 0 && !isProd) {
    const created = await prisma.merchant.create({ data: { whatsappPhone: phone } });
    return { party: "MERCHANT", mode: "merchant", ctx: { party: "MERCHANT", merchantId: created.id } };
  }

  // Customer: which store did they pick for this conversation?
  const storeId = await getConversationStore(phone);
  if (storeId && (await prisma.merchant.findUnique({ where: { id: storeId } }))) {
    const customer = await getOrCreateCustomer(storeId, phone);
    return {
      party: "CUSTOMER",
      mode: "shopping",
      ctx: { party: "CUSTOMER", merchantId: storeId, customerId: customer.id, customerPhone: phone },
    };
  }

  // No store chosen yet → lobby. merchantId is empty until they pick one.
  return { party: "CUSTOMER", mode: "lobby", ctx: { party: "CUSTOMER", merchantId: "", customerPhone: phone } };
}
