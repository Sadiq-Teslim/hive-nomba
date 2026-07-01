import type { Order } from "../../api";
import type { DonutSegment, SeriesPoint } from "./charts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Revenue per day for the last `days` days, from paid/fulfilled orders. */
export function dailyRevenue(orders: Order[], days = 14): SeriesPoint[] {
  const buckets = new Map<string, number>();
  const points: SeriesPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    buckets.set(dayKey(d), 0);
    points.push({ label: `${d.getDate()} ${MONTHS[d.getMonth()]}`, value: 0 });
  }
  for (const o of orders) {
    if (o.status !== "PAID" && o.status !== "FULFILLED") continue;
    const k = dayKey(new Date(o.createdAt));
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + o.totalKobo);
  }
  const keys = [...buckets.keys()];
  return points.map((p, i) => ({ ...p, value: buckets.get(keys[i]) ?? 0 }));
}

/** Daily count of paid/fulfilled orders for the last `days` days (sparkline). */
export function dailyOrderCounts(orders: Order[], days = 14): number[] {
  const buckets = new Map<string, number>();
  const today = new Date();
  const order: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const k = dayKey(d);
    buckets.set(k, 0);
    order.push(k);
  }
  for (const o of orders) {
    if (o.status !== "PAID" && o.status !== "FULFILLED") continue;
    const k = dayKey(new Date(o.createdAt));
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }
  return order.map((k) => buckets.get(k) ?? 0);
}

export interface TopCustomer {
  name: string;
  orders: number;
  spentKobo: number;
}

/** Highest-spending customers, derived from the orders list. */
export function topCustomers(orders: Order[], limit = 5): TopCustomer[] {
  const map = new Map<string, TopCustomer>();
  for (const o of orders) {
    const name = o.customer ?? "Guest";
    const cur = map.get(name) ?? { name, orders: 0, spentKobo: 0 };
    cur.orders += 1;
    if (o.status === "PAID" || o.status === "FULFILLED") cur.spentKobo += o.totalKobo;
    map.set(name, cur);
  }
  return [...map.values()].sort((a, b) => b.spentKobo - a.spentKobo).slice(0, limit);
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  PAID: { label: "Paid", color: "#39d98a" },
  PENDING_PAYMENT: { label: "Pending", color: "#f5c518" },
  FULFILLED: { label: "Fulfilled", color: "#38bdf8" },
  CANCELLED: { label: "Cancelled", color: "#f43f5e" },
  REFUNDED: { label: "Refunded", color: "#a78bfa" },
  DRAFT: { label: "Draft", color: "#8a92a6" },
};

/** Order counts grouped by status, ready for the donut. */
export function statusCounts(orders: Order[]): DonutSegment[] {
  const counts = new Map<string, number>();
  for (const o of orders) counts.set(o.status, (counts.get(o.status) ?? 0) + 1);
  return Object.entries(STATUS_META)
    .map(([key, meta]) => ({ ...meta, value: counts.get(key) ?? 0 }))
    .filter((s) => s.value > 0);
}
