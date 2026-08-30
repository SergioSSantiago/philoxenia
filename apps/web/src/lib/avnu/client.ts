import type { AvnuOptions } from "@avnu/avnu-sdk";
import { PaymasterRpc } from "starknet";

/** Inlined at build time in client bundles; use `isSponsoredGasEnabled()` when testing. */
export const SPONSORED_GAS_ENABLED =
  process.env.NEXT_PUBLIC_SPONSORED_GAS === "true";

export function isSponsoredGasEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SPONSORED_GAS === "true";
}

/** Same-origin proxy that injects `x-paymaster-api-key` server-side. */
export function paymasterProxyUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/paymaster`;
  }
  return "/api/paymaster";
}

/** AVNU SDK options — routes paymaster RPC through `/api/paymaster`. */
export function getAvnuClientOptions(): AvnuOptions | undefined {
  if (!isSponsoredGasEnabled()) return undefined;
  return { paymasterBaseUrl: paymasterProxyUrl() };
}

let cachedPaymaster: PaymasterRpc | null = null;

export function getPaymasterProvider(): PaymasterRpc {
  if (!cachedPaymaster) {
    cachedPaymaster = new PaymasterRpc({
      nodeUrl: paymasterProxyUrl(),
    });
  }
  return cachedPaymaster;
}

/** SNIP-29 params for `executeSwap` when sponsored gas is enabled. */
export function getAvnuSwapPaymasterParams():
  | {
      active: true;
      provider: PaymasterRpc;
      params: { version: "0x1"; feeMode: { mode: "sponsored" } };
    }
  | undefined {
  if (!isSponsoredGasEnabled()) return undefined;
  return {
    active: true,
    provider: getPaymasterProvider(),
    params: {
      version: "0x1",
      feeMode: { mode: "sponsored" },
    },
  };
}
