import { PaymasterRpc } from "starknet";

/** Client flag — set when AVNU paymaster API key is configured server-side. */
export const SPONSORED_GAS_ENABLED =
  process.env.NEXT_PUBLIC_SPONSORED_GAS === "true";

let cachedPaymaster: PaymasterRpc | null = null;

export function isSponsoredGasEnabled(): boolean {
  return SPONSORED_GAS_ENABLED;
}

export function getPaymasterProvider(): PaymasterRpc {
  if (!cachedPaymaster) {
    cachedPaymaster = new PaymasterRpc({
      nodeUrl:
        typeof window !== "undefined"
          ? `${window.location.origin}/api/paymaster`
          : "/api/paymaster",
    });
  }
  return cachedPaymaster;
}
