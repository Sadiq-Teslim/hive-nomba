# 🐝 Hive — The First AI Employee for African SMEs

Hive is an AI employee that lives inside **WhatsApp**. Merchants run their entire
business by chatting — adding products, updating stock, generating payment links,
tracking sales — and customers browse, order, and pay without leaving the chat.
**Nomba** is the financial engine: payment links + webhooks that auto-reconcile
inventory, orders, and receipts.

> Built for the DevCareer × Nomba Hackathon.

## What's built (backend + AI — the demo-critical path)

- **Conversational AI employee** — Groq (Llama 3.3 70B) with function calling. The
  agent *does work* (creates products, orders, payment links) rather than just chatting.
- **Two modes, one number** — the same WhatsApp number serves merchants (manage
  store) and customers (shop), routed automatically.
- **Nomba integration** — payment-link creation + signed webhook → auto stock
  decrement, order status, and receipts. A built-in **mock checkout** lets the
  full payment loop run locally with no Nomba account.
- **WhatsApp Cloud API** — inbound webhook (text + product images) and outbound
  replies. Falls back to logging when not configured.
- **AI product onboarding from images** — send a product photo; a Groq vision
  model (Llama 4 Scout) drafts the listing.
- **Dashboard API** — read-only REST endpoints for the (secondary) web dashboard.

- **Live merchant dashboard** (`apps/web`) — a responsive React/Tailwind console
  that reads the dashboard API and **auto-refreshes every 4s**, so a payment made
  over WhatsApp visibly updates revenue, orders, and stock on screen. Icons by
  [Hugeicons](https://hugeicons.com).

```
apps/
├── api/                   # backend + AI
│   ├── src/
│   │   ├── agent/         # LLM provider (Groq), prompts, tool registry, agent loop
│   │   ├── config/        # env, logger, prisma client
│   │   ├── integrations/  # nomba/, whatsapp/
│   │   ├── routes/        # health, chat, whatsapp, nomba, mock, dashboard
│   │   ├── services/      # merchant, product, customer, order, payment, analytics, ...
│   │   └── utils/         # money (kobo), references
│   └── prisma/            # schema + seed
└── web/                   # live merchant dashboard (Vite + React + Tailwind)
    └── src/
        ├── components/    # StatCard, OrdersTable, TopProducts, ProductsPanel, Header
        ├── hooks/         # useDashboard (polling)
        └── api.ts         # typed client for the dashboard API
```

## Prerequisites

- Node 20+ and pnpm 10+
- PostgreSQL (local, or a free [Neon](https://neon.tech) / [Supabase](https://supabase.com) DB)

## Setup

```bash
pnpm install

cd apps/api
cp .env.example .env          # then fill in values (see below)

pnpm db:push                  # create tables
pnpm db:seed                  # seed the demo store "Bella's Fashion Hub"
pnpm dev                      # start the API on http://localhost:4000
```

### Run the dashboard + WhatsApp simulator

```bash
# from repo root — runs API + web together
pnpm dev:all
# API  → http://localhost:4000
# Web  → http://localhost:5173            (dashboard; proxies /api to the backend)
#      → http://localhost:5173/#/whatsapp (WhatsApp-style chat simulator)
```

### WhatsApp simulator

A pixel-faithful WhatsApp chat UI to test the whole product without a Meta app —
open it from the **Simulator** button on the dashboard, or go to `/#/whatsapp`.
Two chats mirror the two sides of Hive:

- **Hive** — you're *Bella, the merchant*: "add a product", "how are sales?", or
  send a product photo for AI onboarding.
- **Bella's Fashion Hub** — you're a *customer*: browse, order, and get a real
  Nomba payment link rendered right in the chat.

Messages hit the same `/api/chat` backend, so the simulator drives the real agent,
real Nomba links, and the live dashboard.

### Minimum env to demo locally

You can run the **entire loop** with just a database + a Groq key. WhatsApp and
Nomba run in mock mode until you add their credentials.

| Variable | Needed for | Notes |
|---|---|---|
| `DATABASE_URL` | always | Local Postgres or Neon/Supabase. |
| `GROQ_API_KEY` | the AI | Free key from [console.groq.com/keys](https://console.groq.com/keys). |
| `WHATSAPP_*` | live WhatsApp | Optional — mock-logs replies when absent. |
| `NOMBA_*` | live payments | Optional — uses mock checkout when absent. |

## Try it without WhatsApp (local simulator)

`POST /api/chat` simulates a WhatsApp message and returns Hive's reply.

```bash
# Talk to Hive as the MERCHANT (the seeded demo phone)
curl -s localhost:4000/api/chat -H 'content-type: application/json' \
  -d '{"phone":"2348100000001","text":"Add a new product: Silk Scarf, ₦6000, 15 in stock"}'

# Talk to Hive as a CUSTOMER (any other number) and place an order
curl -s localhost:4000/api/chat -H 'content-type: application/json' \
  -d '{"phone":"2348190000002","text":"What do you sell?"}'

curl -s localhost:4000/api/chat -H 'content-type: application/json' \
  -d '{"phone":"2348190000002","text":"I want 2 Ankara Gowns and 1 Gele"}'
# → Hive replies with a payment link. Open it, click Pay (mock Nomba),
#   and stock/order/receipts update automatically.
```

## Testing payments (Nomba sandbox)

Hive runs on Nomba's **sandbox**, so no real money moves. To complete a payment on
the Nomba checkout page, choose **Pay with card** and use Nomba's test card:

| Field | Value |
|---|---|
| Card number | `5434621074252808` (successful Mastercard) |
| Expiry / CVV | any (e.g. `12/29`, `123`) — not validated |
| Card PIN | `1234` |
| OTP | `9999` → "Approved by Financial Institution" |

> Use `5484497218317651` to simulate a **declined** card. The bank-transfer /
> virtual-account option won't auto-settle in sandbox (no real inflow) — card is
> the instant path. Once approved, Hive auto-verifies with Nomba and confirms the
> order. See the [Nomba sandbox docs](https://developer.nomba.com/docs/products/accept-payment/sandbox-testing).

## Going live

### Public tunnel (Outray)

Webhooks need a stable public URL. We use [Outray](https://outray.dev) with a
**fixed subdomain** so the URL never changes — even across restarts — which means
you submit it to Nomba once and never again.

```bash
# one-off
outray start --config outray.toml          # → https://hive-ace.outray.app

# resilient: auto-restarts if the tunnel drops (same URL comes back)
pwsh ./scripts/tunnel.ps1                   # Windows
bash  ./scripts/tunnel.sh                    # macOS/Linux/Git Bash
```

Set `PUBLIC_BASE_URL=https://hive-ace.outray.app` in `apps/api/.env` (already done).

- **Nomba:** credentials are in `.env` (TEST active, LIVE commented). Submit your
  webhook URL + sub-account ID to Nomba:
  **`https://hive-ace.outray.app/api/webhooks/nomba`**.
  When Nomba gives you a signing secret, set `NOMBA_WEBHOOK_SECRET` to enable
  signature verification. Real `pay.nomba.com` checkout links replace the mock.
- **WhatsApp (Twilio — recommended, fastest):** in the
  [Twilio Console](https://console.twilio.com) → Messaging → **Try it out → WhatsApp Sandbox**:
  1. From your phone, send `join <your-sandbox-code>` to the sandbox number to opt in.
  2. Set **"When a message comes in"** to
     **`https://hive-ace.outray.app/api/webhooks/twilio`** (HTTP POST).
  3. Put `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_FROM`
     (e.g. `whatsapp:+14155238886`) in `.env`, keep `WHATSAPP_PROVIDER=twilio`, restart.
  Now WhatsApp messages to the sandbox number hit the live agent.
- **WhatsApp (Meta) alternative:** set `WHATSAPP_PROVIDER=meta`, point the Meta app
  webhook to `https://hive-ace.outray.app/api/webhooks/whatsapp` with your
  `WHATSAPP_VERIFY_TOKEN`, and fill the `WHATSAPP_*` vars.

> **Roles on one number:** everyone messages the same WhatsApp number; Hive routes
> by sender. A sender whose number is registered as a Merchant manages the store;
> everyone else is a customer of the demo store. To run the business from your own
> phone, register your number as the merchant (seed it or update the merchant's
> `whatsappPhone`).

## Demo script (matches the PRD)

1. Merchant: *"Set up my store — Bella's Fashion Hub, fashion."*
2. Merchant: *"Add Ankara Gown ₦18,500, 12 in stock"* (or send a photo).
3. Customer (different number): *"What do you have?"* → *"I want 2 Ankara Gowns."*
4. Hive creates the order + Nomba payment link and sends it.
5. Customer pays → webhook confirms → stock drops, both parties get notified.
6. Merchant: *"How are sales going?"* → revenue, orders, top products.

## Roadmap (next)

- Web dashboard (`apps/web`, React + Tailwind) consuming the dashboard API.
- Redis-backed queue for webhook/agent processing.
- Nomba virtual accounts, transfers, split settlements; promotions broadcast.
