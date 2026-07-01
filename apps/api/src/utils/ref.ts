/** Generate a short, human-readable order reference, e.g. HIVE-7Q2K9F. */
export function orderReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `HIVE-${s}`;
}

/** Normalize a phone number to a bare E.164-ish digit string (no +, no spaces). */
export function normalizePhone(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}
