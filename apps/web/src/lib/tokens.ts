import type { PaymentAsset } from "@philoxenia/shared";

/** Native STRK on Starknet mainnet */
export const STRK_TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS ??
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

/** DAI via StarkGate on Starknet mainnet */
export const DAI_TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_DAI_TOKEN_ADDRESS ??
  "0x00da114221cb83fa859dbdb4c44beeaa0bb37c7537ad5ae66fe5e0efd20e6eb3";

/** STRK BookingEscrow (constructor token = STRK). */
export const STRK_BOOKING_ESCROW_ADDRESS =
  process.env.NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS ??
  "0x071472045bd45e232bb0542f8f6f9a9af42947e15e57575cd7b55650ac9001bd";

/** DAI BookingEscrow (constructor token = DAI). */
export const DAI_BOOKING_ESCROW_ADDRESS =
  process.env.NEXT_PUBLIC_DAI_BOOKING_ESCROW_ADDRESS ??
  "0x00dc7fe1d48edba335f78b2b3155c599d04783623c5e6ecc83ea4da1d1618004";

/** STRK20 private payments enabled by default. */
export const STRK20_PRIVACY_ENABLED =
  process.env.NEXT_PUBLIC_STRK20_PRIVACY !== "false";

/**
 * Optional team-deployed BookingEscrow anonymizer (privacy_invoke).
 * When set, private pay prefers this over the shadow-account path.
 */
export const BOOKING_ANONYMIZER_ADDRESS =
  process.env.NEXT_PUBLIC_BOOKING_ANONYMIZER_ADDRESS?.trim() || "";

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
