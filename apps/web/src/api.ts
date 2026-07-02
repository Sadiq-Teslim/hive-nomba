// Typed client for the Hive dashboard API. All data here is real — served by
// @hive/api from the same Postgres the WhatsApp agent writes to.

export interface Merchant {
  id: string;
  businessName: string | null;
  phone: string;
  onboarded: boolean;
}

export interface TopProduct {
  name: string;
  units: number;
  revenueKobo: number;
}

export interface Analytics {
  windowDays: number;
  revenueKobo: number;
  orderCount: number;
  avgOrderKobo: number;
  pendingOrders: number;
  totalProducts: number;
  totalCustomers: number;
  topProducts: TopProduct[];
}

export interface Overview {
  merchant: { id: string; businessName: string | null };
  analytics: Analytics;
}

export interface Product {
  id: string;
  name: string;
  price: string;
  priceKobo: number;
  stock: number;
  active: boolean;
  imageUrl: string | null;
}

export type OrderStatus = "DRAFT" | "PENDING_PAYMENT" | "PAID" | "FULFILLED" | "CANCELLED" | "REFUNDED";

export interface Order {
  reference: string;
  status: OrderStatus;
  total: string;
  totalKobo: number;
  customer: string | null;
  items: { name: string; quantity: number }[];
  createdAt: string;
}

/**
 * API origin. Empty in dev (Vite proxies /api → the backend). In production set
 * VITE_API_BASE to the deployed API URL (e.g. https://hive-api.onrender.com).
 */
export const API_ORIGIN = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

const BASE = `${API_ORIGIN}/api/dashboard`;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  merchants: () => get<Merchant[]>("/merchants"),
  overview: (id: string) => get<Overview>(`/merchants/${id}/overview`),
  products: (id: string) => get<Product[]>(`/merchants/${id}/products`),
  orders: (id: string) => get<Order[]>(`/merchants/${id}/orders`),
};

/** Format kobo (minor units) as ₦ currency. */
export function naira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(kobo / 100);
}
