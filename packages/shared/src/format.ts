/**
 * Format decimal token amounts for UI (trim trailing zeros, keep up to `maxDecimals`).
 * Examples: "11.000000000000000000" → "11", "11.5000" → "11.5"
 */
export function formatTokenAmount(
  value: string | number,
  maxDecimals = 4
): string {
  const raw = typeof value === "number" ? value.toString() : value.trim();
  if (!raw || Number.isNaN(Number(raw))) return raw || "0";

  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [wholePart, fracPart = ""] = unsigned.split(".");
  const trimmedFrac = fracPart.replace(/0+$/, "").slice(0, maxDecimals);
  const formatted = trimmedFrac.length
    ? `${wholePart}.${trimmedFrac}`
    : wholePart || "0";
  return negative ? `-${formatted}` : formatted;
}

/** Price label like "11 DAI". */
export function formatDaiPrice(value: string | number): string {
  return `${formatTokenAmount(value)} DAI`;
}
