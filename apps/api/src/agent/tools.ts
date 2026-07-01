import type { Party } from "@prisma/client";
import type { ToolSchema } from "./llm.js";

// JSON-schema primitive types (OpenAI/Groq function-calling format).
const Type = {
  OBJECT: "object",
  STRING: "string",
  NUMBER: "number",
  BOOLEAN: "boolean",
  ARRAY: "array",
} as const;
import { prisma } from "../config/db.js";
import { formatNaira } from "../utils/money.js";
import {
  updateMerchantProfile,
  updateStoreInfo,
  getMerchant,
  listStores,
  findStoreByName,
} from "../services/merchant.service.js";
import { setConversationStore } from "../services/conversation.service.js";
import {
  createProduct,
  listProducts,
  updateProduct,
  adjustStock,
  findProductByName,
  lowStockProducts,
  deactivateProduct,
} from "../services/product.service.js";
import {
  createOrder,
  cancelOrder,
  getOrderByReference,
  listOrders,
  fulfillOrder,
  latestCancellableOrder,
} from "../services/order.service.js";
import {
  createPaymentLinkForOrder,
  createCustomPaymentLink,
  createVirtualAccountForOrder,
  refundOrder,
  verifyPayment,
} from "../services/payment.service.js";
import { getAnalytics } from "../services/analytics.service.js";
import { findInactiveCustomers, getOrCreateCustomer, listCustomers } from "../services/customer.service.js";
import { sendPromotion } from "../services/promotion.service.js";
import { raiseTicket, listOpenTickets } from "../services/support.service.js";

/** Runtime context passed to every tool executor. */
export interface ToolContext {
  party: Party;
  merchantId: string; // for CUSTOMER party this is the store they're shopping
  customerId?: string;
  customerPhone?: string;
}

interface Tool {
  declaration: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
  parties: Party[];
  /** Lobby tools are only offered before a customer has chosen a store. */
  lobby?: boolean;
  execute: (args: any, ctx: ToolContext) => Promise<Record<string, unknown>>;
}

// ───────────────────────────── Tool definitions ─────────────────────────────

const tools: Tool[] = [
  {
    parties: ["MERCHANT"],
    declaration: {
      name: "update_business_profile",
      description: "Set or update the merchant's business profile (store name, owner name, category).",
      parameters: {
        type: Type.OBJECT,
        properties: {
          businessName: { type: Type.STRING },
          ownerName: { type: Type.STRING },
          category: { type: Type.STRING, description: "e.g. fashion, food, electronics, pharmacy, salon" },
        },
      },
    },
    async execute(args, ctx) {
      const m = await updateMerchantProfile(ctx.merchantId, args);
      return { ok: true, businessName: m.businessName, onboarded: m.onboarded };
    },
  },

  {
    parties: ["MERCHANT"],
    declaration: {
      name: "add_product",
      description: "Add a new product to the merchant's catalogue.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          priceNaira: { type: Type.NUMBER, description: "Price in Naira (not kobo)." },
          stock: { type: Type.NUMBER, description: "Units available. Default 0." },
          description: { type: Type.STRING },
          imageUrl: { type: Type.STRING },
        },
        required: ["name", "priceNaira"],
      },
    },
    async execute(args, ctx) {
      const p = await createProduct(ctx.merchantId, args);
      return { ok: true, productId: p.id, name: p.name, price: formatNaira(p.priceKobo), stock: p.stock };
    },
  },

  {
    parties: ["MERCHANT"],
    declaration: {
      name: "update_product",
      description: "Update an existing product's price, stock, description or active flag. Identify it by name.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of the product to update." },
          priceNaira: { type: Type.NUMBER },
          stock: { type: Type.NUMBER, description: "Set absolute stock level." },
          description: { type: Type.STRING },
          active: { type: Type.BOOLEAN },
        },
        required: ["name"],
      },
    },
    async execute(args, ctx) {
      const product = await findProductByName(ctx.merchantId, args.name);
      if (!product) return { ok: false, error: `No product found matching "${args.name}".` };
      const p = await updateProduct(product.id, args);
      return { ok: true, name: p.name, price: formatNaira(p.priceKobo), stock: p.stock, active: p.active };
    },
  },

  {
    parties: ["MERCHANT"],
    declaration: {
      name: "adjust_inventory",
      description: "Increase or decrease a product's stock by a relative amount (e.g. +10 restock, -2 damaged).",
      parameters: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          delta: { type: Type.NUMBER, description: "Positive to add stock, negative to remove." },
        },
        required: ["name", "delta"],
      },
    },
    async execute(args, ctx) {
      const product = await findProductByName(ctx.merchantId, args.name);
      if (!product) return { ok: false, error: `No product found matching "${args.name}".` };
      const p = await adjustStock(product.id, args.delta);
      return { ok: true, name: p.name, stock: p.stock };
    },
  },

  {
    parties: ["MERCHANT", "CUSTOMER"],
    declaration: {
      name: "list_products",
      description: "List the store's available products with prices and stock.",
      parameters: { type: Type.OBJECT, properties: {} },
    },
    async execute(_args, ctx) {
      const products = await listProducts(ctx.merchantId);
      return {
        ok: true,
        count: products.length,
        products: products.map((p) => ({
          name: p.name,
          price: formatNaira(p.priceKobo),
          inStock: p.stock,
          description: p.description ?? undefined,
        })),
      };
    },
  },

  {
    parties: ["MERCHANT"],
    declaration: {
      name: "get_analytics",
      description: "Get sales performance: revenue, number of orders, average order value and top products.",
      parameters: {
        type: Type.OBJECT,
        properties: { days: { type: Type.NUMBER, description: "Look-back window in days. Default 30." } },
      },
    },
    async execute(args, ctx) {
      const a = await getAnalytics(ctx.merchantId, args?.days ?? 30);
      return {
        ok: true,
        windowDays: a.windowDays,
        revenue: formatNaira(a.revenueKobo),
        orders: a.orderCount,
        averageOrder: formatNaira(a.avgOrderKobo),
        pendingOrders: a.pendingOrders,
        totalProducts: a.totalProducts,
        totalCustomers: a.totalCustomers,
        topProducts: a.topProducts.map((t) => ({ name: t.name, unitsSold: t.units, revenue: formatNaira(t.revenueKobo) })),
      };
    },
  },

  {
    parties: ["MERCHANT"],
    declaration: {
      name: "find_inactive_customers",
      description: "List customers who haven't ordered recently, to target with a win-back promotion.",
      parameters: {
        type: Type.OBJECT,
        properties: { days: { type: Type.NUMBER, description: "Inactivity threshold in days. Default 30." } },
      },
    },
    async execute(args, ctx) {
      const customers = await findInactiveCustomers(ctx.merchantId, args?.days ?? 30);
      return {
        ok: true,
        count: customers.length,
        customers: customers.map((c) => ({ name: c.name ?? "Customer", phone: c.whatsappPhone, lastOrdered: c.lastOrderedAt })),
      };
    },
  },

  {
    parties: ["CUSTOMER"],
    declaration: {
      name: "place_order",
      description:
        "Create an order for the customer. Provide each item by product name and quantity. This does NOT take payment yet — after it succeeds, ask the customer how they'd like to pay (card link or bank transfer).",
      parameters: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            description: "Items the customer wants to buy.",
            items: {
              type: Type.OBJECT,
              properties: {
                product: { type: Type.STRING, description: "Product name." },
                quantity: { type: Type.NUMBER },
              },
              required: ["product", "quantity"],
            },
          },
        },
        required: ["items"],
      },
    },
    async execute(args, ctx) {
      let customerId = ctx.customerId;
      if (!customerId && ctx.customerPhone) {
        const c = await getOrCreateCustomer(ctx.merchantId, ctx.customerPhone);
        customerId = c.id;
      }
      try {
        const order = await createOrder({
          merchantId: ctx.merchantId,
          customerId,
          lines: (args.items ?? []).map((i: any) => ({ product: i.product, quantity: i.quantity })),
        });
        return {
          ok: true,
          reference: order.reference,
          total: formatNaira(order.totalKobo),
          items: order.items.map((i) => ({ name: i.nameSnapshot, quantity: i.quantity })),
          message: "Order created. Now ask how they want to pay and offer BUTTONS: Pay with card | Bank transfer.",
        };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? "Could not create the order." };
      }
    },
  },

  {
    parties: ["CUSTOMER"],
    declaration: {
      name: "pay_with_card",
      description:
        "Use this when the customer chooses to pay by CARD/LINK — e.g. they say 'card', 'pay with card', 'link', or tap 'Pay with card'. Generates a Nomba tap-to-pay link for their order. Omit the reference to use their most recent unpaid order. Do NOT call place_order again.",
      parameters: {
        type: Type.OBJECT,
        properties: { reference: { type: Type.STRING, description: "Order reference. Optional." } },
      },
    },
    async execute(args, ctx) {
      const order = args.reference
        ? await getOrderByReference(args.reference)
        : ctx.customerId
          ? await latestCancellableOrder(ctx.customerId)
          : null;
      if (!order) return { ok: false, error: "No pending order to pay for." };
      try {
        const { checkoutUrl } = await createPaymentLinkForOrder(order.id);
        return {
          ok: true,
          reference: order.reference,
          total: formatNaira(order.totalKobo),
          paymentLink: checkoutUrl,
          message: "Card payment link ready. It's confirmed automatically once paid.",
        };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? "Could not create the payment link." };
      }
    },
  },

  {
    parties: ["CUSTOMER"],
    declaration: {
      name: "pay_with_transfer",
      description:
        "Use this when the customer chooses to pay by BANK TRANSFER — e.g. they say 'bank transfer', 'transfer', 'send to account', or tap 'Bank transfer'. Creates a dedicated Nomba virtual account for their order and returns the bank account number to transfer to. Omit the reference to use their most recent unpaid order. Do NOT call place_order again.",
      parameters: {
        type: Type.OBJECT,
        properties: { reference: { type: Type.STRING, description: "Order reference. Optional." } },
      },
    },
    async execute(args, ctx) {
      const order = args.reference
        ? await getOrderByReference(args.reference)
        : ctx.customerId
          ? await latestCancellableOrder(ctx.customerId)
          : null;
      if (!order) return { ok: false, error: "No pending order to pay for." };
      try {
        const { va } = await createVirtualAccountForOrder(order.id);
        return {
          ok: true,
          reference: order.reference,
          amount: formatNaira(order.totalKobo),
          bankName: va.bankName,
          accountNumber: va.accountNumber,
          accountName: va.accountName,
          message:
            "Give the customer the exact amount, account number, bank and account name to transfer to. It's confirmed automatically once the transfer lands.",
        };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? "Could not set up bank transfer." };
      }
    },
  },

  {
    parties: ["CUSTOMER"],
    declaration: {
      name: "request_refund",
      description:
        "Refund the customer's paid order via Nomba and restore stock. Use only when the customer asks for a refund/return on a paid order. Omit the reference to use their most recent paid order.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          reference: { type: Type.STRING, description: "Order reference. Optional." },
          reason: { type: Type.STRING, description: "Why they want a refund." },
        },
      },
    },
    async execute(args, ctx) {
      let reference = args.reference as string | undefined;
      if (!reference && ctx.customerId) {
        const paid = await prisma.order.findFirst({
          where: { customerId: ctx.customerId, status: { in: ["PAID", "FULFILLED"] } },
          orderBy: { updatedAt: "desc" },
        });
        reference = paid?.reference;
      }
      if (!reference) return { ok: false, error: "No paid order found to refund." };
      const result = await refundOrder({ reference, customerId: ctx.customerId, reason: args.reason });
      if (!result.ok) return { ok: false, error: result.error };
      return {
        ok: true,
        reference: result.order.reference,
        status: result.order.status,
        message: "Refund triggered and stock restored. Reassure the customer it's on the way.",
      };
    },
  },

  {
    parties: ["CUSTOMER"],
    declaration: {
      name: "raise_support",
      description:
        "Log a customer complaint, issue, or escalation and alert the merchant. Use when a customer is upset, reports a problem (wrong/damaged item, delay, etc.), or needs human help. Always acknowledge and apologise warmly too.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          message: { type: Type.STRING, description: "The customer's issue, summarised." },
          category: { type: Type.STRING, description: "complaint | question | refund | other." },
          reference: { type: Type.STRING, description: "Related order reference, if any." },
        },
        required: ["message"],
      },
    },
    async execute(args, ctx) {
      const ticket = await raiseTicket({
        merchantId: ctx.merchantId,
        customerId: ctx.customerId,
        phone: ctx.customerPhone ?? "unknown",
        category: args.category,
        message: args.message,
        orderRef: args.reference,
      });
      return { ok: true, ticketId: ticket.id, message: "Logged and the merchant has been alerted. Reassure the customer." };
    },
  },

  {
    parties: ["MERCHANT", "CUSTOMER"],
    declaration: {
      name: "check_order_status",
      description:
        "Look up an order by reference (e.g. HIVE-7Q2K9F) and report its status. If it's awaiting payment, this also re-checks with Nomba and confirms it if the customer has paid. Use this when someone says they've paid or asks about a payment's status.",
      parameters: {
        type: Type.OBJECT,
        properties: { reference: { type: Type.STRING } },
        required: ["reference"],
      },
    },
    async execute(args) {
      let order = await getOrderByReference(args.reference);
      if (!order) return { ok: false, error: "Order not found." };

      // Awaiting payment? Ask Nomba directly and reconcile if it has been paid.
      let justConfirmed = false;
      if (order.status === "PENDING_PAYMENT") {
        try {
          const v = await verifyPayment({ reference: order.reference });
          if (v.paid && !v.alreadyPaid) justConfirmed = true;
          if (v.order) order = v.order as typeof order;
        } catch {
          /* verification best-effort; fall back to stored status */
        }
      }

      return {
        ok: true,
        reference: order.reference,
        status: order.status,
        justConfirmed, // true if this check is what flipped it to PAID
        total: formatNaira(order.totalKobo),
        items: order.items.map((i) => ({ name: i.nameSnapshot, quantity: i.quantity })),
      };
    },
  },

  {
    parties: ["MERCHANT"],
    declaration: {
      name: "get_payment_link",
      description:
        "Get the payment link for an existing order (by reference) so the merchant can re-send/forward it to the customer. Creates the link if the order doesn't have one yet.",
      parameters: {
        type: Type.OBJECT,
        properties: { reference: { type: Type.STRING } },
        required: ["reference"],
      },
    },
    async execute(args, ctx) {
      const order = await getOrderByReference(args.reference);
      if (!order || order.merchantId !== ctx.merchantId) return { ok: false, error: "Order not found." };
      if (order.status === "PAID" || order.status === "FULFILLED")
        return { ok: false, error: `Order ${order.reference} is already paid — no link needed.` };
      if (order.status === "CANCELLED") return { ok: false, error: `Order ${order.reference} was cancelled.` };

      let link = order.payment?.checkoutUrl ?? null;
      if (!link) {
        const r = await createPaymentLinkForOrder(order.id);
        link = r.checkoutUrl;
      }
      return { ok: true, reference: order.reference, total: formatNaira(order.totalKobo), paymentLink: link };
    },
  },

  {
    parties: ["CUSTOMER", "MERCHANT"],
    declaration: {
      name: "cancel_order",
      description:
        "Cancel an unpaid order. For a customer, omit the reference to cancel their most recent unpaid order. A merchant must give the order reference. Only call when cancellation is explicitly requested.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          reference: { type: Type.STRING, description: "Order reference, e.g. HIVE-7Q2K9F. Required for merchants." },
        },
      },
    },
    async execute(args, ctx) {
      const result = await cancelOrder({
        reference: args.reference,
        customerId: ctx.party === "CUSTOMER" ? ctx.customerId : undefined,
        merchantId: ctx.party === "MERCHANT" ? ctx.merchantId : undefined,
      });
      if (!result.ok) return { ok: false, error: result.error };
      return {
        ok: true,
        reference: result.order.reference,
        status: result.order.status,
        items: result.order.items.map((i) => ({ name: i.nameSnapshot, quantity: i.quantity })),
        message: "Order cancelled. Do not state any item that is not in this list.",
      };
    },
  },

  // ─────────────────────── Merchant: orders & fulfilment ───────────────────────
  {
    parties: ["MERCHANT"],
    declaration: {
      name: "list_orders",
      description:
        "List the store's recent orders. Optionally filter by status to see e.g. unpaid or paid-but-unfulfilled orders.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          status: {
            type: Type.STRING,
            description: "Optional filter: PENDING_PAYMENT, PAID, FULFILLED, CANCELLED.",
          },
          limit: { type: Type.NUMBER, description: "Max orders to return (default 20)." },
        },
      },
    },
    async execute(args, ctx) {
      const status = typeof args.status === "string" ? (args.status.toUpperCase() as any) : undefined;
      const orders = await listOrders(ctx.merchantId, { status, limit: args.limit });
      return {
        ok: true,
        count: orders.length,
        orders: orders.map((o) => ({
          reference: o.reference,
          status: o.status,
          total: formatNaira(o.totalKobo),
          customer: o.customer?.name ?? o.customer?.whatsappPhone ?? null,
          items: o.items.map((i) => `${i.quantity}× ${i.nameSnapshot}`),
          placed: o.createdAt,
        })),
      };
    },
  },

  {
    parties: ["MERCHANT"],
    declaration: {
      name: "fulfill_order",
      description: "Mark a paid order as fulfilled/delivered, by its reference.",
      parameters: {
        type: Type.OBJECT,
        properties: { reference: { type: Type.STRING } },
        required: ["reference"],
      },
    },
    async execute(args, ctx) {
      const result = await fulfillOrder(args.reference, ctx.merchantId);
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, reference: result.order.reference, status: result.order.status };
    },
  },

  // ─────────────────────── Merchant: inventory health ────────────────────────
  {
    parties: ["MERCHANT"],
    declaration: {
      name: "get_low_stock",
      description: "List products that are low on stock or sold out, so the merchant knows what to restock.",
      parameters: {
        type: Type.OBJECT,
        properties: { threshold: { type: Type.NUMBER, description: "Low-stock cutoff (default 5)." } },
      },
    },
    async execute(args, ctx) {
      const products = await lowStockProducts(ctx.merchantId, args?.threshold ?? 5);
      return {
        ok: true,
        count: products.length,
        products: products.map((p) => ({ name: p.name, inStock: p.stock, price: formatNaira(p.priceKobo) })),
      };
    },
  },

  {
    parties: ["MERCHANT"],
    declaration: {
      name: "remove_product",
      description: "Remove/discontinue a product so it no longer shows in the catalogue. Identify it by name.",
      parameters: {
        type: Type.OBJECT,
        properties: { name: { type: Type.STRING } },
        required: ["name"],
      },
    },
    async execute(args, ctx) {
      const product = await findProductByName(ctx.merchantId, args.name);
      if (!product) return { ok: false, error: `No product found matching "${args.name}".` };
      await deactivateProduct(product.id);
      return { ok: true, removed: product.name };
    },
  },

  // ─────────────────────── Merchant: payments & customers ──────────────────────
  {
    parties: ["MERCHANT"],
    declaration: {
      name: "create_payment_link",
      description:
        "Generate a Nomba payment link for a custom amount (e.g. a service or a sale not in the catalogue). Optionally tie it to a customer's phone.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          amountNaira: { type: Type.NUMBER, description: "Amount to charge, in Naira." },
          description: { type: Type.STRING, description: "What the payment is for." },
          customerPhone: { type: Type.STRING, description: "Optional customer phone to associate." },
        },
        required: ["amountNaira"],
      },
    },
    async execute(args, ctx) {
      try {
        const r = await createCustomPaymentLink({
          merchantId: ctx.merchantId,
          amountNaira: args.amountNaira,
          description: args.description,
          customerPhone: args.customerPhone,
        });
        return {
          ok: true,
          reference: r.reference,
          amount: formatNaira(r.amountKobo),
          paymentLink: r.checkoutUrl,
        };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? "Could not create the payment link." };
      }
    },
  },

  {
    parties: ["MERCHANT"],
    declaration: {
      name: "list_customers",
      description: "List the store's customers, most recently active first, with how many paid orders each has made.",
      parameters: { type: Type.OBJECT, properties: { limit: { type: Type.NUMBER } } },
    },
    async execute(args, ctx) {
      const customers = await listCustomers(ctx.merchantId, args?.limit ?? 50);
      return {
        ok: true,
        count: customers.length,
        customers: customers.map((c) => ({
          name: c.name ?? "Customer",
          phone: c.phone,
          paidOrders: c.paidOrders,
          lastOrdered: c.lastOrderedAt,
        })),
      };
    },
  },

  {
    parties: ["MERCHANT"],
    declaration: {
      name: "send_promotion",
      description:
        "Broadcast a marketing/promo message to customers over WhatsApp. Audience 'all' = every customer; 'inactive' = those who haven't ordered recently (win-back).",
      parameters: {
        type: Type.OBJECT,
        properties: {
          message: { type: Type.STRING, description: "The promo message to send." },
          audience: { type: Type.STRING, description: "'all' or 'inactive'. Default 'all'." },
          days: { type: Type.NUMBER, description: "For 'inactive': inactivity threshold in days (default 30)." },
        },
        required: ["message"],
      },
    },
    async execute(args, ctx) {
      const audience = args.audience === "inactive" ? "inactive" : "all";
      const r = await sendPromotion({ merchantId: ctx.merchantId, message: args.message, audience, days: args.days });
      return { ok: true, sentTo: r.sent, audience: r.audience };
    },
  },

  // ─────────────────────── Store info (set + read) ────────────────────────────
  {
    parties: ["MERCHANT"],
    declaration: {
      name: "update_store_info",
      description:
        "Set the customer-facing store details: opening hours, address/location, delivery policy, contact, and a short 'about'.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          businessHours: { type: Type.STRING, description: 'e.g. "Mon–Sat 9am–6pm"' },
          address: { type: Type.STRING },
          deliveryInfo: { type: Type.STRING, description: "Delivery areas/fees, or pickup info." },
          contactInfo: { type: Type.STRING, description: "Phone/email/handle for the business." },
          about: { type: Type.STRING, description: "Short description of the business." },
        },
      },
    },
    async execute(args, ctx) {
      const m = await updateStoreInfo(ctx.merchantId, args);
      return {
        ok: true,
        storeInfo: {
          hours: m.businessHours,
          address: m.address,
          delivery: m.deliveryInfo,
          contact: m.contactInfo,
          about: m.about,
        },
      };
    },
  },

  {
    parties: ["MERCHANT", "CUSTOMER"],
    declaration: {
      name: "get_store_info",
      description:
        "Get the store's hours, location/address, delivery policy and contact — use this to answer questions like 'where are you?', 'what time do you close?', or 'do you deliver?'.",
      parameters: { type: Type.OBJECT, properties: {} },
    },
    async execute(_args, ctx) {
      const m = await getMerchant(ctx.merchantId);
      if (!m) return { ok: false, error: "Store not found." };
      return {
        ok: true,
        businessName: m.businessName,
        about: m.about ?? undefined,
        hours: m.businessHours ?? undefined,
        address: m.address ?? undefined,
        delivery: m.deliveryInfo ?? undefined,
        contact: m.contactInfo ?? undefined,
        note: "If a field is missing, that info hasn't been set yet — say you'll check, don't invent it.",
      };
    },
  },

  // ─────────────────────── Customer: modify a pending order ───────────────────
  {
    parties: ["CUSTOMER"],
    declaration: {
      name: "modify_order",
      description:
        "Change a customer's most recent UNPAID order before they pay — replace its items with this new full list of items and quantities. Does NOT take payment; afterwards ask how they want to pay. Use when they say 'make it 3' or 'add a gele too'.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            description: "The complete new list of items for the order.",
            items: {
              type: Type.OBJECT,
              properties: {
                product: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
              },
              required: ["product", "quantity"],
            },
          },
        },
        required: ["items"],
      },
    },
    async execute(args, ctx) {
      if (!ctx.customerId) return { ok: false, error: "No customer context." };
      // Cancel the current unpaid order, then place the corrected one.
      await cancelOrder({ customerId: ctx.customerId });
      try {
        const order = await createOrder({
          merchantId: ctx.merchantId,
          customerId: ctx.customerId,
          lines: (args.items ?? []).map((i: any) => ({ product: i.product, quantity: i.quantity })),
        });
        return {
          ok: true,
          reference: order.reference,
          total: formatNaira(order.totalKobo),
          items: order.items.map((i) => ({ name: i.nameSnapshot, quantity: i.quantity })),
          message: "Order updated. Ask how they want to pay and offer BUTTONS: Pay with card | Bank transfer.",
        };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? "Could not update the order." };
      }
    },
  },

  // ─────────────────────── Merchant: refunds & support ────────────────────────
  {
    parties: ["MERCHANT"],
    declaration: {
      name: "refund_order",
      description: "Refund a paid order via Nomba (restores stock and notifies the customer). Identify it by reference.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          reference: { type: Type.STRING },
          reason: { type: Type.STRING, description: "Optional reason." },
        },
        required: ["reference"],
      },
    },
    async execute(args, ctx) {
      const result = await refundOrder({ reference: args.reference, merchantId: ctx.merchantId, reason: args.reason });
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, reference: result.order.reference, status: result.order.status };
    },
  },

  {
    parties: ["MERCHANT"],
    declaration: {
      name: "list_support",
      description: "List open customer complaints / support tickets that need the merchant's attention.",
      parameters: { type: Type.OBJECT, properties: {} },
    },
    async execute(_args, ctx) {
      const tickets = await listOpenTickets(ctx.merchantId);
      return {
        ok: true,
        count: tickets.length,
        tickets: tickets.map((t) => ({
          from: t.phone,
          category: t.category,
          issue: t.message,
          order: t.orderRef ?? undefined,
          when: t.createdAt,
        })),
      };
    },
  },

  // ─────────────────────── Lobby: store selection (no store chosen yet) ────────
  {
    parties: ["CUSTOMER"],
    lobby: true,
    declaration: {
      name: "list_stores",
      description: "List the stores a customer can shop from, with their categories.",
      parameters: { type: Type.OBJECT, properties: {} },
    },
    async execute() {
      const stores = await listStores();
      return {
        ok: true,
        count: stores.length,
        stores: stores.map((s) => ({ name: s.businessName, category: s.category ?? undefined })),
      };
    },
  },

  {
    parties: ["CUSTOMER"],
    lobby: true,
    declaration: {
      name: "choose_store",
      description:
        "Set which store the customer is buying from, by store name. Call this as soon as they name or pick a store, then welcome them to that store.",
      parameters: {
        type: Type.OBJECT,
        properties: { storeName: { type: Type.STRING, description: "The store the customer wants to shop." } },
        required: ["storeName"],
      },
    },
    async execute(args, ctx) {
      const store = await findStoreByName(args.storeName);
      if (!store) {
        const stores = await listStores();
        return {
          ok: false,
          error: `No store matching "${args.storeName}".`,
          available: stores.map((s) => s.businessName),
        };
      }
      if (ctx.customerPhone) {
        await setConversationStore(ctx.customerPhone, store.id);
        await getOrCreateCustomer(store.id, ctx.customerPhone);
      }
      return {
        ok: true,
        store: store.businessName,
        message: "Store selected. Welcome them to this store and ask what they'd like (offer to browse products).",
      };
    },
  },
];

/**
 * Function/tool schemas for the current context. In "lobby" mode (a customer who
 * hasn't picked a store) only the store-selection tools are offered; otherwise the
 * party's normal tools (excluding lobby-only tools) are offered.
 */
export function declarationsFor(party: Party, mode: "lobby" | "shopping" | "merchant" = "shopping"): ToolSchema[] {
  return tools
    .filter((t) => (mode === "lobby" ? t.lobby : t.parties.includes(party) && !t.lobby))
    .map((t) => ({
      type: "function",
      function: {
        name: t.declaration.name,
        description: t.declaration.description,
        parameters: t.declaration.parameters,
      },
    }));
}

/** Execute a tool call by name with party-scoped access control. */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<Record<string, unknown>> {
  const tool = tools.find((t) => t.declaration.name === name);
  if (!tool) return { ok: false, error: `Unknown tool: ${name}` };
  if (!tool.parties.includes(ctx.party)) return { ok: false, error: "Not permitted." };
  return tool.execute(args ?? {}, ctx);
}
