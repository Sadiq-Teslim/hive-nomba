import type { Persona } from "./types";

/**
 * Simulator identities. Three merchants (one per seeded store) chat with their AI
 * employee "Hive"; a shopper reaches Hive and must pick which store to buy from
 * (there's no default — each customer chooses their store).
 */
export const PERSONAS: Persona[] = [
  {
    id: "merchant-fashion",
    phone: "2348100000001",
    chatName: "Bella's Fashion Hub",
    subtitle: "Hive · AI employee",
    avatarText: "👗",
    avatarColor: "bg-honey/90",
    tagline: "You run this store",
  },
  {
    id: "merchant-food",
    phone: "2348100000002",
    chatName: "Mama Nkechi's Kitchen",
    subtitle: "Hive · AI employee",
    avatarText: "🍲",
    avatarColor: "bg-orange-500/90",
    tagline: "You run this store",
  },
  {
    id: "merchant-tech",
    phone: "2348100000003",
    chatName: "TechBox Gadgets",
    subtitle: "Hive · AI employee",
    avatarText: "📱",
    avatarColor: "bg-sky-500/90",
    tagline: "You run this store",
  },
  {
    id: "customer",
    phone: "2348209000113",
    chatName: "Hive",
    subtitle: "Online stores",
    avatarText: "🛍️",
    avatarColor: "bg-wa-accent",
    tagline: "You're a shopper",
  },
];

const OWNERS: Record<string, string> = {
  "merchant-fashion": "Bella",
  "merchant-food": "Nkechi",
  "merchant-tech": "Tunde",
};

export const greetingFor = (p: Persona): string =>
  p.id === "customer"
    ? "👋 Welcome to Hive! Which store would you like to shop from today?"
    : `👋 Hi ${OWNERS[p.id] ?? "there"}! I'm Hive, your AI employee. Ask me to add products, check sales, update stock, handle refunds — anything to run your business.`;
