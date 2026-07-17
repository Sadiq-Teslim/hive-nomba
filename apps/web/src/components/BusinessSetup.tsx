import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  ArrowReloadHorizontalIcon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  LinkSquare02Icon,
  Store01Icon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";
import { onboardingApi, type SetupStatus } from "../api";

interface Props {
  merchantId: string | null;
  setup: SetupStatus | null;
  onRefresh: () => void;
}

export function BusinessSetup({ merchantId, setup, onRefresh }: Props) {
  const [activation, setActivation] = useState<{ code: string; expiresAt: string; hiveWhatsAppNumber: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const completed = setup?.checklist.filter((item) => item.complete).length ?? 0;
  const qrUrl = useMemo(() => {
    if (!setup?.share.qrPayload) return null;
    return `https://quickchart.io/qr?size=180&margin=1&text=${encodeURIComponent(setup.share.qrPayload)}`;
  }, [setup?.share.qrPayload]);

  async function generateCode() {
    if (!merchantId) return;
    setBusy(true);
    setError(null);
    try {
      setActivation(await onboardingApi.activationCode(merchantId));
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate an activation code.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1600);
  }

  if (!setup) {
    return <div className="h-44 animate-pulse rounded-lg border border-ink-500/70 bg-ink-700/80" />;
  }

  const connected = setup.merchant.whatsappConnectionStatus === "CONNECTED";
  const verified = setup.merchant.verificationStatus === "VERIFIED";
  const expiresAt = activation?.expiresAt ?? setup.activation?.expiresAt;

  return (
    <section id="setup" className="overflow-hidden rounded-lg border border-ink-500/70 bg-ink-700/80 shadow-card">
      <div className="flex flex-col gap-3 border-b border-ink-500/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <HugeiconsIcon icon={Store01Icon} size={19} className="text-honey" strokeWidth={2} />
            <h2 className="text-sm font-semibold text-white">Business setup</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">{completed} of {setup.checklist.length} verification checks complete</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <StatePill ok={verified} label={verified ? "Verified" : setup.merchant.verificationStatus.toLowerCase()} />
          <StatePill ok={connected} label={connected ? "WhatsApp connected" : "WhatsApp not connected"} />
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.15fr_1fr]">
        <div className="border-b border-ink-500/70 p-5 lg:border-b-0 lg:border-r">
          <h3 className="text-xs font-semibold uppercase text-slate-400">Readiness checklist</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {setup.checklist.map((item) => (
              <li key={item.key} className="flex items-center gap-2.5 text-sm text-slate-300">
                <HugeiconsIcon
                  icon={item.complete ? CheckmarkCircle01Icon : Clock01Icon}
                  size={17}
                  className={item.complete ? "text-mint" : "text-slate-600"}
                  strokeWidth={2}
                />
                {item.label}
              </li>
            ))}
          </ul>

          <div className="mt-6 border-t border-ink-500/70 pt-5">
            <div className="flex items-start gap-3">
              <HugeiconsIcon icon={WhatsappIcon} size={21} className="mt-0.5 text-wa-accent" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-white">Connect Hive to WhatsApp</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Generate a one-time code, then send it to the Hive WhatsApp number from your business phone.
                </p>
              </div>
            </div>

            {activation && (
              <div className="mt-4 flex flex-col gap-3 rounded-lg border border-wa-accent/20 bg-wa-accent/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-mono text-xl font-bold text-white">{activation.code}</div>
                  <div className="mt-1 text-xs text-slate-500">Send to +{activation.hiveWhatsAppNumber}</div>
                </div>
                <button onClick={() => copy(activation.code, "code")} className="rounded-md bg-wa-accent px-3 py-2 text-xs font-semibold text-ink-900">
                  {copied === "code" ? "Copied" : "Copy code"}
                </button>
              </div>
            )}

            {expiresAt && !connected && (
              <p className="mt-3 text-xs text-slate-500">Code expires {new Date(expiresAt).toLocaleString()}.</p>
            )}
            {error && <p className="mt-3 flex items-center gap-2 text-xs text-rose-300"><HugeiconsIcon icon={Alert02Icon} size={15} />{error}</p>}

            <button
              onClick={generateCode}
              disabled={busy || !merchantId}
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-wa-accent/30 bg-wa-accent/10 px-3 py-2 text-sm font-semibold text-wa-accent transition hover:bg-wa-accent/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <HugeiconsIcon icon={activation ? ArrowReloadHorizontalIcon : WhatsappIcon} size={17} strokeWidth={2} />
              {busy ? "Generating..." : connected ? "Generate new code" : "Generate activation code"}
            </button>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2.5">
            <HugeiconsIcon icon={LinkSquare02Icon} size={18} className="text-sky-300" strokeWidth={2} />
            <h3 className="text-sm font-semibold text-white">Share your store</h3>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Buyers land in the right store before their conversation begins.</p>

          {setup.share.storeUrl ? (
            <div className="mt-4 flex gap-4">
              {qrUrl && <img src={qrUrl} alt="Store WhatsApp QR code" className="h-28 w-28 rounded-md bg-white p-1" />}
              <div className="min-w-0 flex-1 space-y-3">
                <ShareRow label="Store code" value={setup.share.storeCode ?? ""} onCopy={() => copy(setup.share.storeCode ?? "", "storeCode")} copied={copied === "storeCode"} />
                <ShareRow label="Store link" value={setup.share.storeUrl} onCopy={() => copy(setup.share.storeUrl!, "storeUrl")} copied={copied === "storeUrl"} />
                {setup.share.whatsappUrl && <a href={setup.share.whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-wa-accent hover:underline"><HugeiconsIcon icon={WhatsappIcon} size={15} />Open buyer chat</a>}
              </div>
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-ink-500 bg-ink-800/50 p-4 text-xs text-slate-500">Complete business registration to create your store link and QR code.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function StatePill({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 capitalize ${ok ? "border-mint/20 bg-mint/10 text-mint" : "border-honey/20 bg-honey/10 text-honey"}`}><span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-mint" : "bg-honey"}`} />{label}</span>;
}

function ShareRow({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase text-slate-600">{label}</div>
      <div className="mt-0.5 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-xs text-slate-300">{value}</span>
        <button onClick={onCopy} className="shrink-0 text-xs font-semibold text-honey hover:text-white">{copied ? "Copied" : "Copy"}</button>
      </div>
    </div>
  );
}
