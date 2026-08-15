/** Postal / zip-like segments (not country names). */
export function looksLikePostalCode(segment: string): boolean {
  const s = segment.trim();
  if (!s) return false;
  if (/^\d{3,10}([-\s]\d+)?$/.test(s)) return true;
  if (/^[A-Z]{1,3}[-\s]?\d{2,}/i.test(s) && /\d/.test(s)) return true;
  return false;
}

/** Normalize common Nominatim country labels to a stable key. */
const COUNTRY_ALIASES: Record<string, string> = {
  suiza: "switzerland",
  switzerland: "switzerland",
  schweiz: "switzerland",
  suisse: "switzerland",
  svizzera: "switzerland",
  españa: "spain",
  espana: "spain",
  spain: "spain",
  frankreich: "france",
  france: "france",
  francia: "france",
  deutschland: "germany",
  germany: "germany",
  alemania: "germany",
  italia: "italy",
  italy: "italy",
  portugal: "portugal",
  "united kingdom": "united kingdom",
  "reino unido": "united kingdom",
  uk: "united kingdom",
  "united states": "united states",
  "united states of america": "united states",
  usa: "united states",
  "estados unidos": "united states",
};

/**
 * Last meaningful Nominatim address segment ≈ country.
 * Must not treat letter-only names (Suiza, España) as postcodes.
 */
export function countryFromLocation(location: string): string | null {
  const parts = location
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  let country = parts[parts.length - 1];
  if (looksLikePostalCode(country) && parts.length > 1) {
    country = parts[parts.length - 2];
  }
  if (looksLikePostalCode(country) && parts.length > 2) {
    country = parts[parts.length - 3];
  }

  const raw = country.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (raw.length < 2) return null;
  return COUNTRY_ALIASES[raw] ?? raw;
}

function dayKey(d: string): string {
  return d.slice(0, 10);
}

/** True if any paid night is today or in the future. */
export function hasActivePaidNights(
  nights: string[],
  checkOut: string,
  todayKey = new Date().toISOString().slice(0, 10)
): boolean {
  if (nights.some((n) => dayKey(n) >= todayKey)) return true;
  return dayKey(checkOut) > todayKey;
}
