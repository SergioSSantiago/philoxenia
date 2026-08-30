import type { PaymentAsset } from "@philoxenia/shared";

/** Native STRK on Starknet mainnet */
export const STRK_TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS ??
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

/** DAI via StarkGate on Starknet mainnet */
export const DAI_TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_DAI_TOKEN_ADDRESS ??
  "0x00da114221cb83fa859dbdb4c44beeaa0bb37c7537ad5ae66fe5e0efd20e6eb3";

/** Endur xSTRK (ERC-4626 LST) on Starknet mainnet */
export const XSTRK_TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_XSTRK_TOKEN_ADDRESS ??
  "0x28d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a";

/** STRK BookingEscrow (constructor token = STRK). */
export const STRK_BOOKING_ESCROW_ADDRESS =
  process.env.NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS ??
  "0x030533c6110ee5c414a5678bd71115be738852d709c74d8136fa965271c2e1f3";

/** DAI BookingEscrow (constructor token = DAI). */
export const DAI_BOOKING_ESCROW_ADDRESS =
  process.env.NEXT_PUBLIC_DAI_BOOKING_ESCROW_ADDRESS ??
  "0x004c0322af24bb710f3aa0e48293517777188b42d9c4428b77304008ad0ea712";

/** STRK20 private payments enabled by default. */
export const STRK20_PRIVACY_ENABLED =
  process.env.NEXT_PUBLIC_STRK20_PRIVACY !== "false";

/**
 * Team-deployed BookingEscrow anonymizer (privacy_invoke).
 * When set, private pay prefers this over the shadow-account path.
 */
export const BOOKING_ANONYMIZER_ADDRESS =
  process.env.NEXT_PUBLIC_BOOKING_ANONYMIZER_ADDRESS?.trim() ||
  "0x056a817104ad7544a55873584f3d8fb41a780e5466d152b3e1f12d578e75defb";

export const SUPPORTED_PAYMENT_ASSETS: PaymentAsset[] = ["STRK", "DAI"];

export function tokenAddressForAsset(asset: PaymentAsset): string {
  return asset === "DAI" ? DAI_TOKEN_ADDRESS : STRK_TOKEN_ADDRESS;
}

export function escrowAddressForAsset(asset: PaymentAsset): string {
  const addr =
    asset === "DAI" ? DAI_BOOKING_ESCROW_ADDRESS : STRK_BOOKING_ESCROW_ADDRESS;
  if (!addr) {
    throw new Error(
      asset === "DAI"
        ? "DAI escrow not configured (NEXT_PUBLIC_DAI_BOOKING_ESCROW_ADDRESS)"
        : "STRK escrow not configured (NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS)"
    );
  }
  return addr;
}
