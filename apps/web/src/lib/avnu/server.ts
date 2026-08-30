const MAINNET_PAYMASTER = "https://starknet.paymaster.avnu.fi";
const SEPOLIA_PAYMASTER = "https://sepolia.paymaster.avnu.fi";
const SPONSOR_ACTIVITY_URL =
  "https://starknet.api.avnu.fi/paymaster/v1/sponsor-activity";

/** Server-only AVNU paymaster API key (`AVNU_PAYMASTER_API_KEY` or `AVNU_API_KEY`). */
export function getAvnuApiKey(): string | null {
  const key =
    process.env.AVNU_PAYMASTER_API_KEY?.trim() ||
    process.env.AVNU_API_KEY?.trim();
  return key || null;
}

export function isAvnuPaymasterNetworkSepolia(): boolean {
  return process.env.NEXT_PUBLIC_STARKNET_CHAIN === "sepolia";
}

export function getAvnuPaymasterUpstreamUrl(): string | null {
  if (!getAvnuApiKey()) return null;
  return isAvnuPaymasterNetworkSepolia()
    ? SEPOLIA_PAYMASTER
    : MAINNET_PAYMASTER;
}

export function isAvnuSponsoredGasEnabled(): boolean {
  return (
    Boolean(getAvnuApiKey()) &&
    process.env.NEXT_PUBLIC_SPONSORED_GAS === "true"
  );
}

export type AvnuSponsorActivity = {
  name: string;
  txCount: number;
  remainingStrkCredits: string;
  remainingCredits: string;
};

/** Minimum STRK balance (wei) before we expect mainnet sponsorship to succeed. */
const MIN_SPONSOR_STRK_WEI = 10n ** 16n; // 0.01 STRK

export function parseAvnuHexCredits(hex: string): bigint {
  try {
    return BigInt(hex);
  } catch {
    return 0n;
  }
}

export function hasAvnuSponsorCredits(
  activity: AvnuSponsorActivity | null | undefined
): boolean {
  if (!activity) return false;
  return parseAvnuHexCredits(activity.remainingStrkCredits) >= MIN_SPONSOR_STRK_WEI;
}

export function formatAvnuStrkCredits(hex: string): string {
  const wei = parseAvnuHexCredits(hex);
  const whole = wei / 10n ** 18n;
  const frac = (wei % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

/** Fetch sponsor metrics for the configured API key (server-side only). */
export async function fetchAvnuSponsorActivity(): Promise<AvnuSponsorActivity | null> {
  const apiKey = getAvnuApiKey();
  if (!apiKey) return null;

  const params = new URLSearchParams({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
  });

  try {
    const response = await fetch(`${SPONSOR_ACTIVITY_URL}?${params}`, {
      headers: { "api-key": apiKey },
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      name?: string;
      txCount?: number;
      remainingStrkCredits?: string;
      remainingCredits?: string;
    };
    return {
      name: data.name ?? "Philoxenia",
      txCount: data.txCount ?? 0,
      remainingStrkCredits: data.remainingStrkCredits ?? "0x0",
      remainingCredits: data.remainingCredits ?? "0x0",
    };
  } catch {
    return null;
  }
}
