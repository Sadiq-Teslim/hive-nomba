import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoneyBag01Icon,
  ShoppingCart01Icon,
  CreditCardIcon,
  UserMultipleIcon,
  Analytics01Icon,
  Alert02Icon,
} from "@hugeicons/core-free-icons";
import { api, naira, type Merchant } from "./api";
import { useDashboard } from "./hooks/useDashboard";
import { OrdersTable } from "./components/OrdersTable";
import { TopProducts } from "./components/TopProducts";
import { ProductsPanel } from "./components/ProductsPanel";
import { Sidebar } from "./components/dashboard/Sidebar";
import { Topbar } from "./components/dashboard/Topbar";
import { KpiCard } from "./components/dashboard/KpiCard";
import { RevenueChart, StatusDonut } from "./components/dashboard/charts";
import { dailyRevenue, dailyOrderCounts, statusCounts, topCustomers } from "./components/dashboard/derive";
import { BusinessSetup } from "./components/BusinessSetup";
import { OperationsPanel } from "./components/OperationsPanel";

export default function App({ onOpenSimulator }: { onOpenSimulator: () => void }) {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    api
      .merchants()
      .then((list) => {
        setMerchants(list);
        const sessionMerchantId = window.localStorage.getItem("hive_merchant_id");
        setSelectedId((cur) => cur ?? list.find((m) => m.id === sessionMerchantId)?.id ?? list[0]?.id ?? null);
      })
      .catch((e) => setBootError(e instanceof Error ? e.message : "Cannot reach the Hive API"));
  }, []);

  const { overview, setup, products, orders, riskEvents, disputes, handovers, loading, error, lastUpdated, refresh } = useDashboard(selectedId);
  const a = overview?.analytics;

  const series = dailyRevenue(orders, 14);
  const revenueSpark = series.map((p) => p.value);
  const ordersSpark = dailyOrderCounts(orders, 14);
  const status = statusCounts(orders);
  const customers = topCustomers(orders, 5);
  const businessName = merchants.find((m) => m.id === selectedId)?.businessName;

  if (bootError) return <ApiError message={bootError} />;

  return (
    <div className="min-h-screen bg-ink-900 text-slate-200">
      <Sidebar onOpenSimulator={onOpenSimulator} onBackToSite={() => (window.location.hash = "home")} />

      <div className="lg:pl-60">
        <Topbar
          merchants={merchants}
          selectedId={selectedId}
          onSelect={setSelectedId}
          businessName={businessName}
          lastUpdated={lastUpdated}
          onRefresh={refresh}
          onOpenSimulator={onOpenSimulator}
        />

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
          {error && (
            <p className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-2.5 text-sm text-rose-300">
              <HugeiconsIcon icon={Alert02Icon} size={16} strokeWidth={2} />
              Live refresh failed: {error}. Retrying…
            </p>
          )}

          {/* KPIs */}
          <section id="dashboard" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Revenue"
              value={a ? naira(a.revenueKobo) : "—"}
              hint={a ? `Last ${a.windowDays} days` : undefined}
              icon={MoneyBag01Icon}
              accent="honey"
              spark={revenueSpark}
              loading={loading && !a}
            />
            <KpiCard
              label="Paid Orders"
              value={a ? String(a.orderCount) : "—"}
              hint={a ? `${a.pendingOrders} awaiting payment` : undefined}
              icon={ShoppingCart01Icon}
              accent="mint"
              spark={ordersSpark}
              loading={loading && !a}
            />
            <KpiCard
              label="Avg Order Value"
              value={a ? naira(a.avgOrderKobo) : "—"}
              hint="Per paid order"
              icon={CreditCardIcon}
              accent="sky"
              loading={loading && !a}
            />
            <KpiCard
              label="Customers"
              value={a ? String(a.totalCustomers) : "—"}
              hint={a ? `${a.totalProducts} products listed` : undefined}
              icon={UserMultipleIcon}
              accent="violet"
              loading={loading && !a}
            />
          </section>

          <BusinessSetup merchantId={selectedId} setup={setup} onRefresh={refresh} />

          <OperationsPanel merchantId={selectedId} riskEvents={riskEvents} disputes={disputes} handovers={handovers} onRefresh={refresh} />

          {/* Revenue chart + order status */}
          <section id="analytics" className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-ink-500/70 bg-ink-700/80 p-5 shadow-card backdrop-blur-sm lg:col-span-2">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <HugeiconsIcon icon={Analytics01Icon} size={18} className="text-honey" strokeWidth={2} />
                  <h2 className="text-sm font-semibold text-white">Revenue</h2>
                </div>
                <span className="text-xs text-slate-500">Last 14 days</span>
              </div>
              <div className="text-2xl font-bold text-white">{a ? naira(a.revenueKobo) : "—"}</div>
              <div className="mt-3">
                <RevenueChart data={series} />
              </div>
            </div>

            <div className="rounded-2xl border border-ink-500/70 bg-ink-700/80 p-5 shadow-card backdrop-blur-sm">
              <h2 className="mb-4 text-sm font-semibold text-white">Order status</h2>
              {status.length ? (
                <StatusDonut segments={status} centerLabel="Total orders" />
              ) : (
                <p className="py-10 text-center text-xs text-slate-500">No orders yet.</p>
              )}
            </div>
          </section>

          {/* Orders + right rail */}
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div id="orders" className="lg:col-span-2">
              <OrdersTable orders={orders} />
            </div>
            <div className="space-y-5">
              <TopProducts items={a?.topProducts ?? []} />
              <TopCustomers id="customers" customers={customers} />
            </div>
          </section>

          {/* Inventory */}
          <section id="inventory">
            <ProductsPanel products={products} />
          </section>

          <footer className="pb-4 pt-2 text-center text-xs text-slate-600">
            Hive Console · data updates live as customers pay over WhatsApp.
          </footer>
        </main>
      </div>
    </div>
  );
}

function TopCustomers({ id, customers }: { id?: string; customers: ReturnType<typeof topCustomers> }) {
  return (
    <div id={id} className="rounded-2xl border border-ink-500/70 bg-ink-700/80 shadow-card backdrop-blur-sm">
      <div className="flex items-center gap-2.5 border-b border-ink-500/70 px-5 py-4">
        <HugeiconsIcon icon={UserMultipleIcon} size={18} className="text-violet-300" strokeWidth={2} />
        <h2 className="text-sm font-semibold text-white">Top Customers</h2>
      </div>
      <div className="p-5">
        {customers.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">No customers yet.</p>
        ) : (
          <ul className="space-y-3.5">
            {customers.map((c, i) => (
              <li key={c.name} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-honey/10 text-xs font-bold text-honey">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-slate-200">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.orders} order{c.orders === 1 ? "" : "s"}</div>
                </div>
                <span className="text-sm font-semibold text-white">{naira(c.spentKobo)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ApiError({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 px-6 text-slate-200">
      <div className="max-w-md rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center">
        <HugeiconsIcon icon={Alert02Icon} size={36} className="mx-auto text-rose-400" strokeWidth={1.6} />
        <h2 className="mt-4 text-lg font-semibold text-white">Can't reach the Hive API</h2>
        <p className="mt-2 text-sm text-slate-400">{message}</p>
        <p className="mt-4 text-xs text-slate-500">
          Start the backend with <code className="rounded bg-ink-700 px-1.5 py-0.5 text-honey">pnpm dev</code> in{" "}
          <code className="rounded bg-ink-700 px-1.5 py-0.5 text-honey">apps/api</code>, then this page connects
          automatically.
        </p>
      </div>
    </div>
  );
}
