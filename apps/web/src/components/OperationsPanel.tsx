import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, ArrowRight01Icon, BubbleChatIcon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";
import { api, type Dispute, type Handover, type RiskEvent } from "../api";

export function OperationsPanel({ merchantId, riskEvents, disputes, handovers, onRefresh }: { merchantId: string | null; riskEvents: RiskEvent[]; disputes: Dispute[]; handovers: Handover[]; onRefresh: () => void }) {
  const [replying, setReplying] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(handoverId: string) {
    if (!merchantId || !text.trim()) return;
    setBusy(true); setError(null);
    try { await api.replyHandover(merchantId, handoverId, text.trim()); setText(""); setReplying(null); onRefresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not send reply."); }
    finally { setBusy(false); }
  }

  async function returnToHive(handoverId: string) {
    if (!merchantId) return;
    setBusy(true); setError(null);
    try { await api.returnHandover(merchantId, handoverId); onRefresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update handover."); }
    finally { setBusy(false); }
  }

  return (
    <section id="operations" className="rounded-lg border border-ink-500/70 bg-ink-700/80 shadow-card">
      <div className="flex items-center gap-2.5 border-b border-ink-500/70 px-5 py-4"><HugeiconsIcon icon={CheckmarkCircle01Icon} size={19} className="text-mint" /><h2 className="text-sm font-semibold text-white">Operations and trust</h2></div>
      <div className="grid divide-y divide-ink-500/70 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <Column title="Human handovers" count={handovers.length} icon={BubbleChatIcon}>
          {handovers.length === 0 ? <Empty /> : handovers.slice(0, 5).map((item) => <div key={item.id} className="border-b border-ink-500/40 py-3 last:border-0"><div className="flex items-start justify-between gap-2"><div><div className="text-xs font-semibold text-white">{item.phone}</div><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.reason}</p></div><span className="text-[10px] uppercase text-honey">{item.status}</span></div>{replying === item.id ? <div className="mt-3 flex gap-2"><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply on WhatsApp" className="min-w-0 flex-1 rounded-md border border-ink-500 bg-ink-800 px-2.5 py-2 text-xs text-white outline-none focus:border-honey/60" /><button disabled={busy} onClick={() => send(item.id)} title="Send reply" className="rounded-md bg-honey px-2.5 text-ink-900"><HugeiconsIcon icon={ArrowRight01Icon} size={15} /></button></div> : <div className="mt-2 flex gap-3"><button onClick={() => setReplying(item.id)} className="text-xs font-semibold text-honey">{item.status === "ACTIVE" ? "Reply" : "Take over"}</button>{item.status === "ACTIVE" && <button onClick={() => returnToHive(item.id)} className="text-xs text-slate-400">Return to Hive</button>}</div>}</div>)}
        </Column>
        <Column title="Refunds and disputes" count={disputes.length} icon={Alert02Icon}>{disputes.length === 0 ? <Empty /> : disputes.slice(0, 5).map((item) => <div key={item.id} className="border-b border-ink-500/40 py-3 last:border-0"><div className="flex justify-between gap-2 text-xs"><span className="font-semibold text-white">{item.order ?? "No order"}</span><span className="text-honey">{item.status.replace(/_/g, " ")}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{item.description ?? item.reason}</p></div>)}</Column>
        <Column title="Risk review" count={riskEvents.length} icon={CheckmarkCircle01Icon}>{riskEvents.length === 0 ? <Empty /> : riskEvents.slice(0, 5).map((item) => <div key={item.id} className="border-b border-ink-500/40 py-3 last:border-0"><div className="flex justify-between gap-2 text-xs"><span className="font-semibold text-white">{item.eventType.replace(/_/g, " ")}</span><span className={item.severity === "HIGH" || item.severity === "CRITICAL" ? "text-rose-300" : "text-honey"}>{item.severity}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{item.reason}</p></div>)}</Column>
      </div>
      {error && <p className="border-t border-ink-500/70 px-5 py-3 text-xs text-rose-300">{error}</p>}
    </section>
  );
}

function Column({ title, count, icon, children }: { title: string; count: number; icon: any; children: React.ReactNode }) { return <div className="p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400"><HugeiconsIcon icon={icon} size={16} /><span className="flex-1">{title}</span><span className="rounded-full bg-white/5 px-2 py-0.5 text-slate-500">{count}</span></div><div className="mt-2">{children}</div></div>; }
function Empty() { return <p className="py-6 text-center text-xs text-slate-600">Nothing needs attention.</p>; }
