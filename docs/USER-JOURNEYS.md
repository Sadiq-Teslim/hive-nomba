# 🐝 Hive - How it's used (Merchant & Buyer journeys)

This is the end-to-end plan for how people use Hive: a **merchant** going from the
landing page to running their store on WhatsApp, and a **buyer** discovering a
store and purchasing. Everything described here is implemented today.

> **One idea:** Hive is an AI employee that lives in WhatsApp. Merchants run their
> business by chatting; buyers shop and pay by chatting. **Nomba** moves the money.

---

## A) The Merchant Journey - from landing page to a running store

### 1. Discover (landing page)
The merchant lands on **hive's site** and immediately sees the promise: *"Run your
buying & selling by chatting. Hive does the work."* They scroll through:
- **What is Hive** - an employee, not an app; lives in WhatsApp; runs on Nomba.
- **For Vendors** - the exact things they'll type ("add Ankara gown ₦18,500…").
- **Powered by Nomba** - payments, virtual accounts, refunds.
- **Try the live demo** - they can play with the WhatsApp simulator in-browser.

CTA → **"Start on WhatsApp"** (opens a chat with the Hive number; future: a QR /
click-to-chat link prefilled with "Hi").

### 2. Onboard (first WhatsApp messages)
The merchant messages the Hive number. Hive recognises a new business and helps set
it up conversationally - no forms:
- *"I sell fashion, my shop is Bella's Fashion Hub"* → Hive saves the business name,
  owner and category (`update_business_profile`).
- *"We open Mon–Sat 9–7, we're in Surulere, delivery is ₦2,500 in Lagos"* → Hive
  saves the store info customers will ask about (`update_store_info`).

### 3. Stock the store
- *"Add Ankara gown, ₦18,500, 12 in stock"* → product created (`add_product`).
- **Or send a product photo** → Hive drafts the name & description from the image,
  then confirms price/stock (AI image onboarding).
- *"Restock gele by 20"*, *"change kaftan price to ₦26,000"*, *"remove silk scarf"* →
  inventory managed by chat (`adjust_inventory`, `update_product`, `remove_product`).

### 4. Run the business (day to day)
Everything is a message:
- **Orders:** *"show my unpaid orders"*, *"mark HIVE-7Q2K9F as delivered"*
  (`list_orders`, `fulfill_order`).
- **Money:** *"send me a payment link for ₦15,000"* (`create_payment_link`),
  *"refund order HIVE-9FS52Y"* → refunded via Nomba + stock restored (`refund_order`).
- **Insights:** *"how are sales?"*, *"what's low on stock?"* (`get_analytics`,
  `get_low_stock`).
- **Customers & marketing:** *"who are my customers?"*, *"send a promo to inactive
  customers: 20% off this week"* (`list_customers`, `send_promotion`).
- **Support:** Hive alerts the merchant when a customer complains, and they can
  *"show open complaints"* (`list_support`).

### 5. See it at a glance (web dashboard - secondary)
WhatsApp is where the work happens; the **dashboard** is the at-a-glance view:
live revenue chart, order-status breakdown, recent orders, top products, top
customers, inventory health - updating in real time as customers pay.

---

## B) The Buyer Journey - discovering a store and purchasing

### 1. Reach Hive
A buyer messages the Hive number (from a store's link/flyer/QR, a friend, or the
demo). **There is no default store** - Hive asks which store they're buying from.
- Hive: *"Welcome to Hive! Which store would you like to shop from today?"* and
  shows tappable buttons: **Bella's Fashion Hub · Mama Nkechi's Kitchen · TechBox**.
- Buyer taps one → Hive locks the conversation to that store (`choose_store`).
  *(In production each store has its own entry point, so this step is instant.)*

### 2. Browse & ask
- *"What do you sell?"* → catalogue with prices/stock (`list_products`).
- *"Do you deliver to Lekki? What time do you close?"* → answered from the store's
  info (`get_store_info`).
- Natural questions about products are answered conversationally.

### 3. Order
- *"I want 2 Ankara gowns"* → Hive creates the order and states the total
  (`place_order`).
- *"Actually make it 3"* / *"add a gele too"* → order updated before paying
  (`modify_order`).

### 4. Choose how to pay  ← the moment of payment
Hive shows the total and offers two buttons: **Pay with card · Bank transfer**.
- **Card / link:** Hive sends a secure Nomba checkout as a tappable **"Pay Now"**
  button (`pay_with_card`). Buyer pays on Nomba's hosted page.
- **Bank transfer:** Hive creates a **dedicated Nomba virtual account** for the
  order and sends the bank name + account number + exact amount
  (`pay_with_transfer`). Buyer transfers from any banking app.

### 5. Automatic confirmation
The instant payment lands, Hive confirms - it **verifies with Nomba's API** (and via
webhook), so it never wrongly says "not paid":
- Buyer gets a receipt: *"✅ Payment received! Your order HIVE-9FS52Y is confirmed."*
- The merchant gets a sale alert; **stock decrements automatically**; the dashboard
  ticks up live.

### 6. After the sale - track, refund, support
- **Track:** *"what's the status of HIVE-9FS52Y?"* (`check_order_status`).
- **Refund / return:** *"I want to return this, it's the wrong size"* → Hive refunds
  via Nomba and restores stock (`request_refund`).
- **Complaints / anger / issues:** Hive stays calm and empathetic, apologises,
  offers a refund where fair, and **escalates to the merchant** by logging a support
  ticket (`raise_support`) - the customer always feels heard.

---

## The payment loop (why Nomba is the engine)

```
Buyer message → Hive (AI tools) → Nomba (Pay Now link OR virtual account)
     → payment confirmed (API verification + webhook)
     → stock ↓, order = PAID, receipts sent, dashboard live
     → (later) refund via Nomba → stock ↑, order = REFUNDED
```

Without Nomba, Hive is a chatbot. With Nomba - payment links, collection, virtual
accounts, refunds, and reconciliation - it's a business that runs itself inside a
chat.
