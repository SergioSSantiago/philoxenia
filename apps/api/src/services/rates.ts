/**
 * Live STRK/DAI spot rate for booking quotes.
 * Uses CoinGecko USD prices for both assets: strkPerDai = usdDai / usdStrk.
 */

let cached: {
  strkPerDai: number;
  usdPerStrk: number;
  usdPerDai: number;
  fetchedAt: number;
  source: "coingecko";
} | null = null;
const CACHE_MS = 60 * 1000; // 1 minute — refresh often for “real-time” pay quotes
const FALLBACK_STRK_PER_DAI = Number(
  process.env.STRK_PER_DAI_FALLBACK ?? "8"
);

export type FxQuote = {
  /** How many STRK equal 1 DAI. */
  strkPerDai: number;
  usdPerStrk: number | null;
  usdPerDai: number | null;
  source: "coingecko" | "fallback";
  fetchedAt: string;
};

export async function getStrkPerDai(opts?: {
  /** Skip cache and hit the market feed again (use at pay time). */
  fresh?: boolean;
}): Promise<FxQuote> {
  const now = Date.now();
  if (
    !opts?.fresh &&
    cached &&
    now - cached.fetchedAt < CACHE_MS
  ) {
    return {
      strkPerDai: cached.strkPerDai,
      usdPerStrk: cached.usdPerStrk,
      usdPerDai: cached.usdPerDai,
      source: "coingecko",
      fetchedAt: new Date(cached.fetchedAt).toISOString(),
    };
  }

  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=starknet,dai&vs_currencies=usd",
      {
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      }
    );
    if (!res.ok) throw new Error(`coingecko ${res.status}`);
    const data = (await res.json()) as {
      starknet?: { usd?: number };
      dai?: { usd?: number };
    };
    const usdPerStrk = data.starknet?.usd;
    const usdPerDai = data.dai?.usd ?? 1;
    if (!usdPerStrk || usdPerStrk <= 0 || !usdPerDai || usdPerDai <= 0) {
      throw new Error("bad rate");
    }
    const strkPerDai = usdPerDai / usdPerStrk;
    cached = {
      strkPerDai,
      usdPerStrk,
      usdPerDai,
      fetchedAt: now,
      source: "coingecko",
    };
    return {
      strkPerDai,
      usdPerStrk,
      usdPerDai,
      source: "coingecko",
      fetchedAt: new Date(now).toISOString(),
    };
  } catch {
    return {
      strkPerDai: FALLBACK_STRK_PER_DAI,
      usdPerStrk: null,
      usdPerDai: null,
      source: "fallback",
      fetchedAt: new Date(now).toISOString(),
    };
  }
}

/** Convert a DAI decimal string to STRK at the given rate. */
export function daiToStrk(daiAmount: string, strkPerDai: number): string {
  const dai = Number(daiAmount);
  if (!Number.isFinite(dai) || dai < 0) throw new Error("Invalid DAI amount");
  const strk = dai * strkPerDai;
  // Keep enough precision for escrow u256 while staying human-readable
  return strk.toFixed(8).replace(/\.?0+$/, "") || "0";
}
