import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowReloadHorizontalIcon, Store01Icon, WhatsappIcon } from "@hugeicons/core-free-icons";
import type { Merchant } from "../../api";

interface Props {
  merchants: Merchant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  businessName?: string | null;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onOpenSimulator: () => void;
}

export function Topbar({ merchants, selectedId, onSelect, businessName, lastUpdated, onRefresh, onOpenSimulator }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-500/60 bg-ink-900/70 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="text-lg lg:hidden">🐝</span>
          <div className="leading-tight">
            <h1 className="text-base font-bold text-white sm:text-lg">Overview</h1>
            <p className="hidden text-xs text-slate-500 sm:block">{businessName ?? "Your store"} · live</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="relative flex items-center">
            <HugeiconsIcon icon={Store01Icon} size={15} className="pointer-events-none absolute left-3 text-slate-500" strokeWidth={2} />
            <select
              value={selectedId ?? ""}
              onChange={(e) => onSelect(e.target.value)}
              className="max-w-[180px] appearance-none truncate rounded-xl border border-ink-500 bg-ink-700 py-2 pl-9 pr-7 text-sm font-medium text-white outline-none transition-colors hover:border-ink-500 focus:border-honey/60"
            >
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.businessName ?? m.phone}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 text-slate-500">▾</span>
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-ink-500 bg-ink-700 px-3 py-2 sm:flex">
            <span className="h-2 w-2 animate-pulseDot rounded-full bg-mint" />
            <span className="text-xs font-medium text-slate-300">Live</span>
            {lastUpdated && (
              <span className="text-[11px] text-slate-500">
                {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </div>

          <button
            onClick={onRefresh}
            title="Refresh now"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-500 bg-ink-700 text-slate-300 transition-colors hover:border-honey/60 hover:text-honey"
          >
            <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={16} strokeWidth={2} />
          </button>

          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-2 rounded-xl bg-wa-accent px-3 py-2 text-sm font-semibold text-wa-bg transition-transform hover:brightness-110 active:scale-95 lg:hidden"
          >
            <HugeiconsIcon icon={WhatsappIcon} size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </header>
  );
}
