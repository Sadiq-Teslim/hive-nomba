import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Order, type Overview, type Product } from "../api";

export interface DashboardData {
  overview: Overview | null;
  products: Product[];
  orders: Order[];
}

interface State extends DashboardData {
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Loads and live-refreshes a merchant's dashboard data. Polls every `intervalMs`
 * so payments coming in over WhatsApp appear on screen within seconds - real
 * data, straight from the API.
 */
export function useDashboard(merchantId: string | null, intervalMs = 4000) {
  const [state, setState] = useState<State>({
    overview: null,
    products: [],
    orders: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const timer = useRef<number | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!merchantId) return;
      if (!silent) setState((s) => ({ ...s, loading: true }));
      try {
        const [overview, products, orders] = await Promise.all([
          api.overview(merchantId),
          api.products(merchantId),
          api.orders(merchantId),
        ]);
        setState({ overview, products, orders, loading: false, error: null, lastUpdated: new Date() });
      } catch (e) {
        setState((s) => ({
          ...s,
          loading: false,
          error: e instanceof Error ? e.message : "Failed to load",
        }));
      }
    },
    [merchantId],
  );

  useEffect(() => {
    load(false);
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => load(true), intervalMs);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [load, intervalMs]);

  return { ...state, refresh: () => load(true) };
}
