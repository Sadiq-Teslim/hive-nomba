import { HugeiconsIcon } from "@hugeicons/react";
import { Sparkline } from "./charts";

interface Props {
  label: string;
  value: string;
  icon: any;
  accent?: "honey" | "mint" | "sky" | "violet";
  hint?: string;
  spark?: number[];
  loading?: boolean;
}

const ACCENTS = {
  honey: { chip: "text-honey bg-honey/10", line: "#f5c518" },
  mint: { chip: "text-mint bg-mint/10", line: "#39d98a" },
  sky: { chip: "text-sky-300 bg-sky-400/10", line: "#38bdf8" },
  violet: { chip: "text-violet-300 bg-violet-400/10", line: "#a78bfa" },
};

export function KpiCard({ label, value, icon, accent = "honey", hint, spark, loading }: Props) {
  const a = ACCENTS[accent];
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-500/70 bg-ink-700/80 p-5 shadow-card backdrop-blur-sm transition-colors hover:border-ink-500">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-slate-400">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${a.chip}`}>
          <HugeiconsIcon icon={icon} size={18} strokeWidth={2} />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-md bg-ink-500" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-white sm:text-[1.7rem]">{value}</div>
          )}
          {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
        </div>
        {spark && spark.length > 1 && (
          <div className="w-24 shrink-0 self-center">
            <Sparkline data={spark} color={a.line} />
          </div>
        )}
      </div>
    </div>
  );
}
