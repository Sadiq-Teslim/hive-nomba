/** Money helpers. We store everything in kobo (minor units) to avoid float errors. */

export const nairaToKobo = (naira: number): number => Math.round(naira * 100);

export const koboToNaira = (kobo: number): number => kobo / 100;

/** Format kobo as a human-friendly NGN string, e.g. 250000 -> "₦2,500.00". */
export function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(koboToNaira(kobo));
}
