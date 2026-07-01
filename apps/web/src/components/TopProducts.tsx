import { HugeiconsIcon } from "@hugeicons/react";
import { ChartUpIcon } from "@hugeicons/core-free-icons";
import { naira, type TopProduct } from "../api";

export function TopProducts({ items }: { items: TopProduct[] }) {
  const max = Math.max(1, ...items.map((i) => i.units));
  return (
    <div className="rounded-2xl border border-ink-500/70 bg-ink-700 shadow-card">
      <div className="flex items-center gap-2.5 border-b border-ink-500/70 px-5 py-4">
        <HugeiconsIcon icon={ChartUpIcon} size={18} className="text-mint" strokeWidth={2} />
        <h2 className="text-sm font-semibold text-white">Top Products</h2>
      </div>
      <div className="p-5">
        {items.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">No sales in this period yet.</p>
        ) : (
          <ul className="space-y-4">
            {items.map((p, idx) => (
              <li key={p.name} className="animate-fadeIn">
                <div className="flex items-baseline justify-between">
                  <span className="flex items-center gap-2 text-sm text-slate-200">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-ink-500 text-[11px] font-semibold text-slate-400">
                      {idx + 1}
                    </span>
                    {p.name}
                  </span>
                  <span className="text-xs font-medium text-slate-400">{naira(p.revenueKobo)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-500">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-honey/70 to-honey"
                      style={{ width: `${(p.units / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-14 text-right text-xs text-slate-500">{p.units} sold</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
