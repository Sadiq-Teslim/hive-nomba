import { naira } from "../../api";

/* ───────────────────────────── Revenue area chart ───────────────────────── */

export interface SeriesPoint {
  label: string; // x-axis label (e.g. "12 Jun")
  value: number; // revenue in kobo
}

export function RevenueChart({ data }: { data: SeriesPoint[] }) {
  const W = 720;
  const H = 260;
  const pad = { l: 10, r: 10, t: 18, b: 30 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / max) * ih;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const areaPath =
    n > 0
      ? `${linePath} L${x(n - 1).toFixed(1)},${(pad.t + ih).toFixed(1)} L${x(0).toFixed(1)},${(pad.t + ih).toFixed(1)} Z`
      : "";

  // up to 6 x labels, evenly spaced
  const labelEvery = Math.max(1, Math.ceil(n / 6));
  const last = data[n - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="revfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5c518" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#f5c518" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* horizontal gridlines + y labels */}
      {[0, 0.5, 1].map((t) => {
        const gy = pad.t + ih - t * ih;
        return (
          <g key={t}>
            <line x1={pad.l} y1={gy} x2={W - pad.r} y2={gy} stroke="#262b36" strokeWidth="1" strokeDasharray="3 5" />
            <text x={pad.l} y={gy - 5} fill="#5b6472" fontSize="11">
              {naira(max * t).replace(".00", "")}
            </text>
          </g>
        );
      })}

      {n > 0 && (
        <>
          <path d={areaPath} fill="url(#revfill)" />
          <path d={linePath} fill="none" stroke="#f5c518" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {/* last point marker */}
          <circle cx={x(n - 1)} cy={y(last.value)} r="4" fill="#f5c518" stroke="#0d0f14" strokeWidth="2" />
        </>
      )}

      {/* x labels */}
      {data.map((d, i) =>
        i % labelEvery === 0 || i === n - 1 ? (
          <text key={i} x={x(i)} y={H - 8} fill="#5b6472" fontSize="11" textAnchor="middle">
            {d.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

/* ───────────────────────────── Status donut ─────────────────────────────── */

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function StatusDonut({ segments, centerLabel }: { segments: DonutSegment[]; centerLabel: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 140 140" className="h-32 w-32 shrink-0 -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#1f232c" strokeWidth="14" />
        {total > 0 &&
          segments.map((s) => {
            const len = (s.value / total) * c;
            const el = (
              <circle
                key={s.label}
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="14"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="min-w-0">
        <div className="rotate-0 text-2xl font-bold text-white">{total}</div>
        <div className="mb-3 text-xs text-slate-500">{centerLabel}</div>
        <ul className="space-y-1.5">
          {segments.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              <span className="text-slate-300">{s.label}</span>
              <span className="ml-auto font-medium text-slate-400">{s.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ───────────────────────────── Mini sparkline ───────────────────────────── */

export function Sparkline({ data, color = "#f5c518" }: { data: number[]; color?: string }) {
  const W = 120;
  const H = 36;
  const max = Math.max(1, ...data);
  const n = data.length;
  if (n < 2) return <svg viewBox={`0 0 ${W} ${H}`} className="h-9 w-full" />;
  const x = (i: number) => (i / (n - 1)) * W;
  const y = (v: number) => H - 2 - (v / max) * (H - 4);
  const line = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const id = `sp${Math.random().toString(36).slice(2, 7)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-9 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
