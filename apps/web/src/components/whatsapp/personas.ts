import type { Persona } from "./types";

/** The dashboard simulator represents the Orthodox Gadgets seller workspace. */
export const PERSONAS: Persona[] = [
  {
    id: "merchant-orthodox",
    phone: "2348100000001",
    chatName: "Orthodox Gadgets",
    subtitle: "Hive · AI employee",
    avatarText: "📱",
    avatarColor: "bg-sky-500/90",
    tagline: "Seller workspace",
  },
];

const OWNERS: Record<string, string> = {
  "merchant-orthodox": "Teslim",
};

export const greetingFor = (p: Persona): string =>
  `👋 Hi ${OWNERS[p.id] ?? "there"}! I'm Hive, your Orthodox Gadgets AI employee. Send your activation code to connect this seller workspace, then share your business and product details.`;
