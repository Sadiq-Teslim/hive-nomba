import { HugeiconsIcon } from "@hugeicons/react";
import {
  WhatsappIcon,
  SparklesIcon,
  ArrowRight01Icon,
  Store01Icon,
  ShoppingBag03Icon,
  Camera01Icon,
  ChartUpIcon,
  PackageIcon,
  Megaphone01Icon,
  CreditCardIcon,
  ArrowReloadHorizontalIcon,
  CheckmarkCircle01Icon,
  Wallet01Icon,
  ArrowDataTransferHorizontalIcon,
  Layers01Icon,
  Calendar03Icon,
  BubbleChatIcon,
  AiBrain01Icon,
  SmartPhone01Icon,
  Rocket01Icon,
  FlashIcon,
  LinkSquare02Icon,
  SmileIcon,
  Attachment01Icon,
  Mic01Icon,
} from "@hugeicons/core-free-icons";

interface Props {
  onTryDemo: () => void;
  onOpenDashboard: () => void;
}

export function Landing({ onTryDemo, onOpenDashboard }: Props) {
  return (
    <div className="relative min-h-screen scroll-smooth text-slate-200">
      {/* Tone-on-tone commerce doodle wallpaper */}
      <div className="hive-doodle-bg" aria-hidden />

      <Nav onTryDemo={onTryDemo} onOpenDashboard={onOpenDashboard} />
      <Hero onTryDemo={onTryDemo} />
      <WhatIsHive />
      <Vendor />
      <Buyer />
      <Nomba />
      <Loop />
      <DemoBanner onTryDemo={onTryDemo} />
      <DashboardPeek onOpenDashboard={onOpenDashboard} />
      <Vision onTryDemo={onTryDemo} />
      <Footer />
    </div>
  );
}

/* ──────────────────────────── building blocks ──────────────────────────── */

function Bubble({ children, mine = false }: { children: React.ReactNode; mine?: boolean }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-[13px] leading-snug shadow ${
          mine ? "rounded-tr-none bg-wa-out text-wa-text" : "rounded-tl-none bg-wa-in text-wa-text"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/** A WhatsApp-style phone screen illustration used across the page. */
function ChatMock({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-[34px] border border-ink-500 bg-wa-panel shadow-2xl ring-1 ring-black/40">
      {/* header */}
      <div className="flex items-center gap-2.5 bg-wa-header px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-honey/90 text-base">🐝</div>
        <div className="leading-tight">
          <div className="text-sm font-medium text-white">{title}</div>
          <div className="text-[11px] text-wa-accent">{sub}</div>
        </div>
        <HugeiconsIcon icon={WhatsappIcon} className="ml-auto text-wa-accent" size={18} />
      </div>
      {/* messages - min-height gives it a proper phone proportion; chat sits at the bottom */}
      <div className="wa-wallpaper flex min-h-[420px] flex-col justify-end gap-1.5 px-3 py-4">{children}</div>
      {/* input bar */}
      <div className="flex items-center gap-2 bg-wa-panel px-3 py-2.5">
        <div className="flex flex-1 items-center gap-2 rounded-full bg-wa-input px-3 py-2 text-wa-sub">
          <HugeiconsIcon icon={SmileIcon} size={18} />
          <span className="text-[13px]">Type a message</span>
          <HugeiconsIcon icon={Attachment01Icon} size={15} className="ml-auto" />
          <HugeiconsIcon icon={Camera01Icon} size={15} />
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wa-accent text-wa-bg">
          <HugeiconsIcon icon={Mic01Icon} size={16} />
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`mx-auto max-w-6xl px-5 sm:px-8 ${className}`}>
      {children}
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-honey/25 bg-honey/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-honey">
      {children}
    </div>
  );
}

/* ──────────────────────────────── nav ──────────────────────────────────── */

function Nav({ onTryDemo, onOpenDashboard }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-ink-500/60 bg-ink-900/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
        <a href="#home" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-white">
          <span className="text-xl">🐝</span> Hive
        </a>
        <nav className="hidden items-center gap-7 text-sm text-slate-400 md:flex">
          <a href="#what" className="hover:text-white">What is Hive</a>
          <a href="#vendors" className="hover:text-white">For Vendors</a>
          <a href="#buyers" className="hover:text-white">For Buyers</a>
          <a href="#nomba" className="hover:text-white">Powered by Nomba</a>
          <button onClick={onOpenDashboard} className="hover:text-white">Dashboard</button>
        </nav>
        <button
          onClick={onTryDemo}
          className="flex items-center gap-2 rounded-xl bg-honey px-4 py-2 text-sm font-bold text-ink-900 transition-transform hover:brightness-105 active:scale-95"
        >
          <HugeiconsIcon icon={WhatsappIcon} size={16} strokeWidth={2} />
          Try the demo
        </button>
      </div>
    </header>
  );
}

/* ─────────────────────────────── hero ──────────────────────────────────── */

function Hero({ onTryDemo }: { onTryDemo: () => void }) {
  return (
    <Section id="home" className="grid items-start gap-12 pb-20 pt-6 sm:pt-10 lg:grid-cols-2">
      <div className="lg:pt-4">
        <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
          Run your buying & selling <span className="text-honey">by chatting.</span>
          <br />
          Hive does the work.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
          Hive is an AI employee for everyday traders and agents - the people who buy and sell every day. Add
          products, answer customers, take orders, and collect payments with{" "}
          <span className="font-semibold text-white">Nomba</span> - all by chatting on WhatsApp. No apps, no
          dashboards.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={onTryDemo}
            className="group flex items-center gap-2 rounded-xl bg-honey px-5 py-3 text-sm font-bold text-ink-900 transition-transform hover:brightness-105 active:scale-95"
          >
            <HugeiconsIcon icon={WhatsappIcon} size={18} strokeWidth={2} />
            Try the live demo
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="transition-transform group-hover:translate-x-0.5" />
          </button>
          <a
            href="#what"
            className="rounded-xl border border-ink-500 px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-honey/50 hover:text-white"
          >
            See how it works
          </a>
        </div>
        <div className="mt-9 flex items-center gap-5">
          <span className="text-xs uppercase tracking-wider text-slate-500">Powered by</span>
          <img src="/logos/nomba-dark.svg" alt="Nomba" className="h-5 opacity-90" />
          <span className="h-4 w-px bg-ink-500" />
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
            <img src="/logos/whatsapp.svg" alt="WhatsApp" className="h-5 w-5" /> WhatsApp
          </span>
        </div>
      </div>

      {/* phone chat mock */}
      <div>
        <ChatMock title="Hive" sub="AI employee · online">
          <Bubble mine>add Ankara gown, ₦18,500, 12 in stock</Bubble>
          <Bubble>
            ✅ Added Ankara Gown - ₦18,500.00, 12 in stock. Want to add a photo or another product?
          </Bubble>
          <Bubble mine>how are my sales?</Bubble>
          <Bubble>
            📈 ₦182,000 from 14 orders in the last 30 days. Top seller: Ankara Gown.
          </Bubble>
        </ChatMock>
      </div>
    </Section>
  );
}

/* ───────────────────────────── what is hive ────────────────────────────── */

function WhatIsHive() {
  const cards = [
    {
      icon: AiBrain01Icon,
      title: "An employee, not an app",
      body: "You chat in plain language - Hive actually does the work. No forms, no dashboards to learn.",
    },
    {
      icon: SmartPhone01Icon,
      title: "Lives in WhatsApp",
      body: "Right where African commerce already happens. Vendors and buyers never install anything.",
    },
    {
      icon: Wallet01Icon,
      title: "Runs on Nomba",
      body: "Real payment links, real collection, real reconciliation - money moves and confirms inside the chat.",
    },
  ];
  return (
    <Section id="what" className="border-t border-ink-500/40 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>What is Hive?</Eyebrow>
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          For everyday people who buy and sell.
        </h2>
        <p className="mt-4 text-slate-400">
          Market traders, online vendors, resellers, POS agents - anyone running a buying-and-selling hustle.
          Hive turns the WhatsApp you already use into a business that runs itself.
        </p>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className="rounded-2xl border border-ink-500/70 bg-ink-700 p-6 shadow-card">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-honey/10 text-honey">
              <HugeiconsIcon icon={c.icon} size={22} strokeWidth={2} />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-white">{c.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{c.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ─────────────────────────────── vendor ────────────────────────────────── */

function Vendor() {
  const commands = [
    { icon: Camera01Icon, text: "Add a product by typing - or snap a photo and AI writes the listing" },
    { icon: PackageIcon, text: '"Restock Gele by 20" · "What\'s low on stock?"' },
    { icon: ChartUpIcon, text: '"How are my sales?" → revenue, top products, order counts' },
    { icon: Megaphone01Icon, text: '"Send a promo to my inactive customers"' },
    { icon: CheckmarkCircle01Icon, text: '"Mark HIVE-7Q2K9F as delivered"' },
  ];
  return (
    <Section id="vendors" className="grid items-center gap-12 border-t border-ink-500/40 py-20 lg:grid-cols-2">
      <div className="order-2 lg:order-1">
        <ChatMock title="Hive" sub="AI employee · online">
          <Bubble mine>Add Silk Scarf, 6500, 15 in stock</Bubble>
          <Bubble>✅ Silk Scarf added - ₦6,500.00, 15 in stock.</Bubble>
          <Bubble mine>what's low on stock?</Bubble>
          <Bubble>⚠️ Men's Kaftan is down to 3 left. Want me to restock it?</Bubble>
        </ChatMock>
      </div>
      <div className="order-1 lg:order-2">
        <Eyebrow>
          <HugeiconsIcon icon={Store01Icon} size={14} /> For Vendors
        </Eyebrow>
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Your store, run by text.</h2>
        <p className="mt-4 text-slate-400">
          Whether you sell from a shop, your DMs, or the market - onboarding, inventory, orders, analytics, and
          marketing are all just a message away.
        </p>
        <ul className="mt-6 space-y-3">
          {commands.map((c, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-honey/10 text-honey">
                <HugeiconsIcon icon={c.icon} size={16} strokeWidth={2} />
              </span>
              {c.text}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

/* ──────────────────────────────── buyer ────────────────────────────────── */

function Buyer() {
  return (
    <Section id="buyers" className="grid items-center gap-12 border-t border-ink-500/40 py-20 lg:grid-cols-2">
      <div>
        <Eyebrow>
          <HugeiconsIcon icon={ShoppingBag03Icon} size={14} /> For Buyers
        </Eyebrow>
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Shop without leaving WhatsApp.</h2>
        <p className="mt-4 text-slate-400">
          Customers discover products, order in natural language, and pay with a tap - then get an instant
          confirmation and receipt. No links to strange sites, no app installs.
        </p>
        <div className="mt-6 space-y-3">
          {[
            'Ask "what do you sell?" → browse the catalogue',
            'Order in plain words → "I want 2 gowns"',
            "Tap Pay Now → pay securely via Nomba",
            "Get instant confirmation; stock & receipts update automatically",
          ].map((t, i) => (
            <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} className="shrink-0 text-mint" strokeWidth={2} />
              {t}
            </div>
          ))}
        </div>
      </div>
      <div>
        <ChatMock title="Bella's Fashion Hub" sub="Business account · online">
          <Bubble mine>I want 2 Ankara Gowns</Bubble>
          <Bubble>
            Your order HIVE-9FS52Y is ready! Total ₦37,000.00. Tap below to pay - it's confirmed automatically once
            you do.
            <div className="-mx-2.5 mt-2 flex items-center justify-center gap-2 border-t border-white/10 pt-2 text-[13px] font-semibold text-wa-tick">
              <HugeiconsIcon icon={LinkSquare02Icon} size={16} /> Pay Now
            </div>
          </Bubble>
          <Bubble>✅ Payment received! Your order is confirmed. Thank you for shopping! 🐝</Bubble>
        </ChatMock>
      </div>
    </Section>
  );
}

/* ─────────────────────────────── nomba ─────────────────────────────────── */

function Nomba() {
  const today = [
    { icon: CreditCardIcon, title: "Payment Links / Checkout", body: "Every order becomes a secure Nomba checkout, surfaced as a tap-to-pay button in chat." },
    { icon: Wallet01Icon, title: "Payment Collection", body: "Funds collected and settled to the merchant's Nomba account." },
    { icon: ArrowReloadHorizontalIcon, title: "Webhooks + active verification", body: "We confirm via webhook AND query Nomba directly - a sale reconciles even if a webhook is missed." },
  ];
  const next = [
    { icon: Layers01Icon, title: "Virtual Accounts" },
    { icon: ArrowDataTransferHorizontalIcon, title: "Transfers" },
    { icon: FlashIcon, title: "Split Settlements" },
    { icon: Calendar03Icon, title: "Subscriptions" },
  ];
  return (
    <Section id="nomba" className="border-t border-ink-500/40 py-20">
      <div className="rounded-3xl border border-honey/20 bg-ink-800/40 p-8 sm:p-12">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>
            <HugeiconsIcon icon={FlashIcon} size={14} /> Powered by Nomba
          </Eyebrow>
          <img src="/logos/nomba-dark.svg" alt="Nomba" className="mx-auto h-7" />
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Nomba is the financial engine.
          </h2>
          <p className="mt-4 text-slate-400">
            Without Nomba, Hive is a chatbot. With Nomba, it's a business that runs itself - money moves, confirms,
            and reconciles inside the conversation.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {today.map((c) => (
            <div key={c.title} className="rounded-2xl border border-ink-500/70 bg-ink-800 p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mint/10 text-mint">
                <HugeiconsIcon icon={c.icon} size={22} strokeWidth={2} />
              </span>
              <h3 className="mt-4 font-semibold text-white">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{c.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-ink-500/60 bg-ink-900/50 p-6">
          <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">On the Nomba roadmap</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {next.map((n) => (
              <div key={n.title} className="flex items-center gap-2.5 rounded-xl border border-ink-500/60 bg-ink-700 px-4 py-3 text-sm text-slate-300">
                <HugeiconsIcon icon={n.icon} size={18} className="text-honey" strokeWidth={2} />
                {n.title}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ──────────────────────────── the loop diagram ─────────────────────────── */

function Loop() {
  const steps = [
    { icon: BubbleChatIcon, label: "WhatsApp message", tone: "text-wa-accent" },
    { icon: AiBrain01Icon, label: "Hive AI acts", tone: "text-honey" },
    { icon: CreditCardIcon, label: "Nomba payment", tone: "text-mint" },
    { icon: ArrowReloadHorizontalIcon, label: "Auto-reconcile", tone: "text-sky-300" },
    { icon: ChartUpIcon, label: "Live dashboard", tone: "text-violet-300" },
  ];
  return (
    <Section className="py-20">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">The whole loop, end to end.</h2>
        <p className="mt-3 text-slate-400">One message in, a reconciled sale out - no human glue in between.</p>
      </div>
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-3 md:flex-col md:gap-2 md:text-center">
            <div className="flex flex-1 items-center gap-3 rounded-2xl border border-ink-500/70 bg-ink-700 px-5 py-4 md:w-40 md:flex-col">
              <HugeiconsIcon icon={s.icon} size={26} className={s.tone} strokeWidth={2} />
              <span className="text-sm font-medium text-slate-200">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={20}
                className="rotate-90 text-slate-600 md:rotate-0"
              />
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ─────────────────────────── live demo banner ──────────────────────────── */

function DemoBanner({ onTryDemo }: { onTryDemo: () => void }) {
  return (
    <Section className="py-10">
      <div className="relative overflow-hidden rounded-3xl border border-wa-accent/30 bg-ink-700 p-8 text-center sm:p-12">
        <HugeiconsIcon icon={WhatsappIcon} size={40} className="mx-auto text-wa-accent" />
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">Don't read about it - try it.</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-300">
          Chat with Hive right in your browser - as a vendor running the store, or a buyer placing an order and
          paying. No signup, no phone needed.
        </p>
        <button
          onClick={onTryDemo}
          className="mx-auto mt-7 flex items-center gap-2 rounded-xl bg-honey px-6 py-3 text-sm font-bold text-ink-900 transition-transform hover:brightness-105 active:scale-95"
        >
          <HugeiconsIcon icon={WhatsappIcon} size={18} strokeWidth={2} />
          Open the live demo
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
        </button>
      </div>
    </Section>
  );
}

/* ───────────────────────────── dashboard peek ──────────────────────────── */

function DashboardPeek({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  const stats = [
    { label: "Revenue (30d)", value: "₦182,000" },
    { label: "Paid orders", value: "14" },
    { label: "Avg order", value: "₦13,000" },
    { label: "Customers", value: "37" },
  ];
  return (
    <Section className="grid items-center gap-12 border-t border-ink-500/40 py-20 lg:grid-cols-2">
      <div>
        <Eyebrow>The dashboard</Eyebrow>
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          WhatsApp runs it. The dashboard proves it.
        </h2>
        <p className="mt-4 text-slate-400">
          A live console for the numbers a chat can't show at a glance - revenue, orders, and top products,
          updating in real time as customers pay.
        </p>
        <button
          onClick={onOpenDashboard}
          className="mt-6 flex items-center gap-2 rounded-xl border border-ink-500 px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-honey/50 hover:text-white"
        >
          View the dashboard
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
        </button>
      </div>
      <div className="rounded-2xl border border-ink-500/70 bg-ink-700 p-5 shadow-card">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-ink-500/60 bg-ink-800 p-4">
              <div className="text-xs text-slate-500">{s.label}</div>
              <div className="mt-1 text-2xl font-bold text-white">{s.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-ink-500/60 bg-ink-800 p-4">
          <div className="mb-3 text-xs font-medium text-slate-400">Top products</div>
          {[
            ["Ankara Gown", 78],
            ["Men's Kaftan", 54],
            ["Gele Headwrap", 36],
          ].map(([name, pct]) => (
            <div key={name as string} className="mb-2.5">
              <div className="mb-1 flex justify-between text-xs text-slate-300">
                <span>{name}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-500">
                <div className="h-full rounded-full bg-honey" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────────── vision ────────────────────────────────── */

function Vision({ onTryDemo }: { onTryDemo: () => void }) {
  return (
    <Section className="py-24 text-center">
      <span className="text-4xl">🐝</span>
      <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
        Today, an AI employee.
        <br />
        Tomorrow, the <span className="text-honey">operating system for African commerce.</span>
      </h2>
      <button
        onClick={onTryDemo}
        className="mx-auto mt-9 flex items-center gap-2 rounded-xl bg-honey px-6 py-3.5 text-sm font-bold text-ink-900 transition-transform hover:brightness-105 active:scale-95"
      >
        <HugeiconsIcon icon={Rocket01Icon} size={18} strokeWidth={2} />
        Try Hive now
      </button>
    </Section>
  );
}

/* ─────────────────────────────── footer ────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-ink-500/50 py-10">
      <Section className="flex flex-col items-center justify-between gap-6 text-sm text-slate-500 sm:flex-row">
        <div className="flex items-center gap-2 font-bold text-white">
          <span>🐝</span> Hive
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wider text-slate-600">Powered by</span>
          <img src="/logos/nomba-dark.svg" alt="Nomba" className="h-4 opacity-80" />
          <img src="/logos/whatsapp.svg" alt="WhatsApp" className="h-4 w-4" />
        </div>
        <div className="text-center sm:text-right">
          Built for the DevCareer × Nomba Hackathon
          <div className="text-xs text-slate-600">The first AI employee for African SMEs</div>
        </div>
      </Section>
    </footer>
  );
}
