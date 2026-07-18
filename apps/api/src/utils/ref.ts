/** Generate a short, human-readable order reference, e.g. HIVE-7Q2K9F. */
export function orderReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `HIVE-${s}`;
}

export function activationCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `HIVE-${s}`;
}

export function storeCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `SHOP-${s}`;
}

export function slugifyBusinessName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "store";
}

/** Normalize a phone number to a bare E.164-ish digit string (no +, no spaces). */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  return digits.length === 11 && digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
}
