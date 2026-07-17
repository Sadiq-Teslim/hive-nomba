import { HugeiconsIcon } from "@hugeicons/react";
import { PackageIcon, Tag01Icon } from "@hugeicons/core-free-icons";
import type { Product } from "../api";

function stockTone(stock: number) {
  if (stock <= 0) return { text: "Out of stock", cls: "text-rose-400 bg-rose-500/10" };
  if (stock <= 5) return { text: `${stock} left`, cls: "text-honey bg-honey/10" };
  return { text: `${stock} in stock`, cls: "text-mint bg-mint/10" };
}

export function ProductsPanel({ products }: { products: Product[] }) {
  return (
    <div className="rounded-2xl border border-ink-500/70 bg-ink-700 shadow-card">
      <div className="flex items-center justify-between border-b border-ink-500/70 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <HugeiconsIcon icon={PackageIcon} size={18} className="text-violet-300" strokeWidth={2} />
          <h2 className="text-sm font-semibold text-white">Inventory</h2>
        </div>
        <span className="text-xs text-slate-500">{products.length} products</span>
      </div>

      {products.length === 0 ? (
        <p className="px-5 py-12 text-center text-xs text-slate-500">
          No products yet - the merchant can add them by chatting with Hive on WhatsApp.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => {
            const tone = stockTone(p.stock);
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-ink-500/60 bg-ink-600/40 p-3 transition-colors hover:border-ink-500"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-500">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <HugeiconsIcon icon={Tag01Icon} size={18} className="text-slate-500" strokeWidth={1.8} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">{p.name}</div>
                  <div className="text-sm font-semibold text-honey">{p.price}</div>
                </div>
                <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-medium ${tone.cls}`}>
                  {tone.text}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
