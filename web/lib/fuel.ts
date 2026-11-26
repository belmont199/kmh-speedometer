/** US gallon, as used by a US-spec car's MPG display. */
export const LITERS_PER_US_GALLON = 3.785411784;
export const KM_PER_MILE = 1.609344;

/** Parse what the driver typed ("13.7" or "13,7"); null if it isn't a usable MPG. */
export function parseMpg(text: string): number | null {
  const n = Number(text.trim().replace(",", "."));
  return text.trim() !== "" && Number.isFinite(n) && n > 0 && n < 1000 ? n : null;
}

export function mpgToKmPerLiter(mpg: number): number {
  return (mpg * KM_PER_MILE) / LITERS_PER_US_GALLON;
}

export function mpgToLitersPer100Km(mpg: number): number {
  return 100 / mpgToKmPerLiter(mpg);
}
