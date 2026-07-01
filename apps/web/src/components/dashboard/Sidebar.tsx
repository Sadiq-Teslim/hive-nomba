import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  ShoppingCart01Icon,
  PackageIcon,
  UserMultipleIcon,
  Analytics01Icon,
  WhatsappIcon,
  Globe02Icon,
} from "@hugeicons/core-free-icons";

const NAV = [
  { label: "Overview", icon: DashboardSquare01Icon, target: "dashboard" },
  { label: "Analytics", icon: Analytics01Icon, target: "analytics" },
  { label: "Orders", icon: ShoppingCart01Icon, target: "orders" },
  { label: "Products", icon: PackageIcon, target: "inventory" },
  { label: "Customers", icon: UserMultipleIcon, target: "customers" },
];

/** Scroll to an in-dashboard section without touching the hash (which is the router). */
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 80; // offset for sticky topbar
  window.scrollTo({ top: y, behavior: "smooth" });
}

export function Sidebar({
  onOpenSimulator,
  onBackToSite,
}: {
  onOpenSimulator: () => void;
  onBackToSite: () => void;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-ink-500/60 bg-ink-800/70 backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-2 px-5 py-4">
        <span className="text-xl">🐝</span>
        <span className="text-lg font-extrabold tracking-tight text-white">Hive</span>
        <span className="ml-1 rounded-md bg-honey/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-honey">
          Console
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-3">
        {NAV.map((item, i) => (
          <button
            key={item.label}
            onClick={() => scrollToSection(item.target)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              i === 0 ? "bg-honey/10 text-honey" : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <HugeiconsIcon icon={item.icon} size={18} strokeWidth={2} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="space-y-2 border-t border-ink-500/60 p-3">
        <button
          onClick={onOpenSimulator}
          className="flex w-full items-center gap-3 rounded-xl bg-wa-accent/10 px-3 py-2.5 text-sm font-medium text-wa-accent transition-colors hover:bg-wa-accent/15"
        >
          <HugeiconsIcon icon={WhatsappIcon} size={18} strokeWidth={2} />
          WhatsApp Simulator
        </button>
        <button
          onClick={onBackToSite}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <HugeiconsIcon icon={Globe02Icon} size={18} strokeWidth={2} />
          Back to site
        </button>
      </div>
    </aside>
  );
}
