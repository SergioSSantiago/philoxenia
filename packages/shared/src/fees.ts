/** Protocol take as % of the connector reward (not of booking total). */
export const PROTOCOL_FEE_PERCENT_OF_CONNECTOR = 10;

/** Convert a whole-number percent (0–100) to basis points for on-chain calls. */
export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}
