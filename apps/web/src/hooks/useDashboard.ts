import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Dispute, type Handover, type Order, type Overview, type Product, type RiskEvent, type SetupStatus } from "../api";

export interface DashboardData {
  overview: Overview | null;
  setup: SetupStatus | null;
  products: Product[];
  orders: Order[];
  riskEvents: RiskEvent[];
  disputes: Dispute[];
  handovers: Handover[];
}

interface State extends DashboardData {
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Loads and live-refreshes a merchant's dashboard data. Polls every `intervalMs`
 * so payments coming in over WhatsApp appear on screen within seconds — real
 * data, straight from the API.
 */
export function useDashboard(merchantId: string | null, intervalMs = 4000) {
  const [state, setState] = useState<State>({
    overview: null,
    setup: null,
    products: [],
    orders: [],
    riskEvents: [],
    disputes: [],
    handovers: [],
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
        const [overview, setup, products, orders, riskEvents, disputes, handovers] = await Promise.all([
          api.overview(merchantId),
          api.setup(merchantId),
          api.products(merchantId),
          api.orders(merchantId),
          api.riskEvents(merchantId),
          api.disputes(merchantId),
          api.handovers(merchantId),
        ]);
        setState({ overview, setup, products, orders, riskEvents, disputes, handovers, loading: false, error: null, lastUpdated: new Date() });
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
