import { NextResponse } from "next/server";
import {
  fetchAvnuSponsorActivity,
  formatAvnuStrkCredits,
  getAvnuApiKey,
  hasAvnuSponsorCredits,
  isAvnuPaymasterNetworkSepolia,
  isAvnuSponsoredGasEnabled,
} from "@/lib/avnu/server";

/** AVNU paymaster + sponsor activity (API key stays server-side). */
export async function GET() {
  const paymasterConfigured = Boolean(getAvnuApiKey());
  const sponsoredGasEnabled = isAvnuSponsoredGasEnabled();
  const sponsorActivity =
    paymasterConfigured && sponsoredGasEnabled
      ? await fetchAvnuSponsorActivity()
      : null;

  const hasUsage = (sponsorActivity?.txCount ?? 0) > 0;
  const sponsorReady = paymasterConfigured && hasAvnuSponsorCredits(sponsorActivity);

  return NextResponse.json({
    paymasterConfigured,
    sponsoredGasEnabled,
    hasUsage,
    sponsorReady,
    network: isAvnuPaymasterNetworkSepolia() ? "sepolia" : "mainnet",
    sponsorActivity: sponsorActivity
      ? {
          ...sponsorActivity,
          remainingStrkCreditsFormatted: formatAvnuStrkCredits(
            sponsorActivity.remainingStrkCredits
          ),
        }
      : null,
    hint: !paymasterConfigured
      ? "Set AVNU_PAYMASTER_API_KEY on Vercel."
      : !sponsoredGasEnabled
        ? "Set NEXT_PUBLIC_SPONSORED_GAS=true and redeploy."
        : !sponsorReady
          ? "Add STRK credits on portal.avnu.fi — current balance is too low to sponsor txs."
          : !hasUsage
            ? "Run a public Book & pay (or public AVNU swap) once to register key usage."
            : null,
  });
}
