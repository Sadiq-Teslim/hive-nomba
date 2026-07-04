/**
 * One-time setup: create Twilio WhatsApp "quick-reply" Content Templates so Hive
 * can send native tappable buttons (Twilio's basic Messages API only sends text).
 *
 * Each template's body is a single variable {{1}} = the full message text, and the
 * buttons are fixed — so any dynamic message reuses the same template.
 *
 * Usage (from repo root):
 *   node --env-file=apps/api/.env apps/api/scripts/setup-twilio-content.mjs
 *
 * Then copy the printed SIDs into your env:
 *   TWILIO_CONTENT_WELCOME_SID=HX...
 *   TWILIO_CONTENT_PAYMENT_SID=HX...
 */
const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
if (!SID || !TOKEN) {
  console.error("Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN in env.");
  process.exit(1);
}
const auth = "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64");

const TEMPLATES = [
  {
    friendly_name: "hive_welcome_menu",
    language: "en",
    variables: { 1: "How can I help you today?" },
    types: {
      "twilio/quick-reply": {
        body: "{{1}}",
        actions: [
          { title: "Browse products", id: "Browse products" },
          { title: "Track my order", id: "Track my order" },
        ],
      },
      "twilio/text": { body: "{{1}}" },
    },
  },
  {
    friendly_name: "hive_payment_method",
    language: "en",
    variables: { 1: "How would you like to pay?" },
    types: {
      "twilio/quick-reply": {
        body: "{{1}}",
        actions: [
          { title: "Pay with card", id: "Pay with card" },
          { title: "Bank transfer", id: "Bank transfer" },
        ],
      },
      "twilio/text": { body: "{{1}}" },
    },
  },
];

for (const t of TEMPLATES) {
  const res = await fetch("https://content.twilio.com/v1/Content", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify(t),
  });
  const data = await res.json();
  if (data.sid) {
    console.log(`${t.friendly_name} -> ${data.sid}`);
  } else {
    console.error(`FAILED ${t.friendly_name}:`, JSON.stringify(data).slice(0, 300));
  }
}
