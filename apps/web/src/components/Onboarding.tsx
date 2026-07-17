import { useState, type FormEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, ArrowRight01Icon, CheckmarkCircle01Icon, Store01Icon } from "@hugeicons/core-free-icons";
import { onboardingApi, saveMerchantSession } from "../api";

export function Onboarding({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [step, setStep] = useState<"account" | "business">("account");
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        const result = await onboardingApi.login({ email: String(data.get("email")), password: String(data.get("password")) });
        saveMerchantSession(result.merchant.id, result.session.token);
        if (result.merchant.businessName) {
          onComplete();
        } else {
          setMerchantId(result.merchant.id);
          setStep("business");
        }
      } else {
        const result = await onboardingApi.account({
          fullName: String(data.get("fullName")),
          email: String(data.get("email")),
          phone: String(data.get("phone")),
          password: String(data.get("password")),
        });
        saveMerchantSession(result.merchant.id, result.session.token);
        setMerchantId(result.merchant.id);
        setStep("business");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not continue.");
    } finally {
      setBusy(false);
    }
  }

  async function submitBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!merchantId) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await onboardingApi.business(merchantId, {
        businessName: String(data.get("businessName")),
        businessCategory: String(data.get("businessCategory")),
        businessDescription: String(data.get("businessDescription")),
        businessPhone: String(data.get("businessPhone")),
        businessAddress: String(data.get("businessAddress")),
        cityState: String(data.get("cityState")),
        deliveryOption: String(data.get("deliveryOption")),
        deliveryLocations: String(data.get("deliveryLocations")),
        returnPolicy: String(data.get("returnPolicy")),
        cacRegistrationNumber: String(data.get("cacRegistrationNumber")),
        logoUrl: String(data.get("logoUrl")),
        settlementBankName: String(data.get("settlementBankName")),
        settlementAccountNumber: String(data.get("settlementAccountNumber")),
        settlementAccountName: String(data.get("settlementAccountName")),
      });
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your business.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-ink-900 px-5 py-8 text-slate-200">
      <div className="mx-auto max-w-3xl">
        <button onClick={onBack} className="text-sm font-semibold text-slate-400 hover:text-white">Hive</button>
        <div className="mt-8 grid gap-8 md:grid-cols-[220px_1fr]">
          <aside>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-honey/10 text-honey"><HugeiconsIcon icon={Store01Icon} size={24} /></div>
            <h1 className="mt-4 text-2xl font-bold text-white">Set up your Hive business</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Create your account, register the store, then connect the business WhatsApp number.</p>
            {mode === "register" && <div className="mt-6 space-y-3 text-sm"><StepLine active={step === "account"} done={step === "business"} label="Account" /><StepLine active={step === "business"} done={false} label="Business details" /><StepLine active={false} done={false} label="Connect WhatsApp" /></div>}
          </aside>

          <section className="rounded-lg border border-ink-500/70 bg-ink-700/80 p-5 sm:p-7">
            {step === "account" ? (
              <>
                <div className="flex border-b border-ink-500/70">
                  <ModeButton active={mode === "register"} onClick={() => setMode("register")}>Create account</ModeButton>
                  <ModeButton active={mode === "login"} onClick={() => setMode("login")}>Sign in</ModeButton>
                </div>
                <form onSubmit={submitAccount} className="mt-6 space-y-4">
                  {mode === "register" && <><Field name="fullName" label="Full name" required /><Field name="phone" label="Phone number" type="tel" required /></>}
                  <Field name="email" label="Email" type="email" required />
                  <Field name="password" label="Password" type="password" minLength={8} required />
                  <Submit busy={busy} label={mode === "register" ? "Continue" : "Sign in"} />
                </form>
              </>
            ) : (
              <form onSubmit={submitBusiness} className="space-y-4">
                <div><h2 className="text-lg font-semibold text-white">Business registration</h2><p className="mt-1 text-xs text-slate-500">Verification stays pending until Hive completes the relevant checks.</p></div>
                <div className="grid gap-4 sm:grid-cols-2"><Field name="businessName" label="Business name" required /><Field name="businessCategory" label="Category" required /><Field name="businessPhone" label="Business phone" type="tel" /><Field name="cityState" label="City / state" /></div>
                <Field name="businessDescription" label="What do you sell?" />
                <Field name="businessAddress" label="Business address" />
                <label className="block text-xs font-medium text-slate-400">Fulfilment<select name="deliveryOption" defaultValue="BOTH" className={controlClass}><option value="DELIVERY">Delivery</option><option value="PICKUP">Pickup</option><option value="BOTH">Delivery and pickup</option></select></label>
                <div className="grid gap-4 sm:grid-cols-2"><Field name="deliveryLocations" label="Delivery locations" /><Field name="returnPolicy" label="Return policy" /></div>
                <Field name="cacRegistrationNumber" label="CAC number (optional)" />
                <Field name="logoUrl" label="Logo image URL (optional)" type="url" />
                <div className="border-t border-ink-500/70 pt-4"><h3 className="text-sm font-semibold text-white">Settlement account</h3><div className="mt-3 grid gap-4 sm:grid-cols-2"><Field name="settlementBankName" label="Bank" /><Field name="settlementAccountNumber" label="Account number" /><Field name="settlementAccountName" label="Account name" /></div></div>
                <Submit busy={busy} label="Open dashboard" />
              </form>
            )}
            {error && <p className="mt-4 flex items-center gap-2 text-xs text-rose-300"><HugeiconsIcon icon={Alert02Icon} size={15} />{error}</p>}
          </section>
        </div>
      </div>
    </main>
  );
}

const controlClass = "mt-1.5 w-full rounded-md border border-ink-500 bg-ink-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-honey/60";
function Field({ label, ...inputProps }: { name: string; label: string; type?: string; required?: boolean; minLength?: number }) { return <label className="block text-xs font-medium text-slate-400">{label}<input {...inputProps} className={controlClass} /></label>; }
function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`flex-1 border-b-2 pb-3 text-sm font-semibold ${active ? "border-honey text-white" : "border-transparent text-slate-500"}`}>{children}</button>; }
function StepLine({ active, done, label }: { active: boolean; done: boolean; label: string }) { return <div className={`flex items-center gap-2.5 ${active || done ? "text-white" : "text-slate-600"}`}><HugeiconsIcon icon={done ? CheckmarkCircle01Icon : Store01Icon} size={16} className={done ? "text-mint" : active ? "text-honey" : ""} />{label}</div>; }
function Submit({ busy, label }: { busy: boolean; label: string }) { return <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-md bg-honey px-4 py-3 text-sm font-bold text-ink-900 disabled:opacity-50">{busy ? "Please wait..." : label}<HugeiconsIcon icon={ArrowRight01Icon} size={16} /></button>; }
