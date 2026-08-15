import type { PaymentAsset } from "@philoxenia/shared";

/** Native STRK on Starknet mainnet */
export const STRK_TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS ??
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

/** DAI via StarkGate on Starknet mainnet */
export const DAI_TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_DAI_TOKEN_ADDRESS ??
  "0x00da114221cb83fa859dbdb4c44beeaa0bb37c7537ad5ae66fe5e0efd20e6eb3";

/** STRK20 private payments enabled by default (STRK only). */
export const STRK20_PRIVACY_ENABLED =
  process.env.NEXT_PUBLIC_STRK20_PRIVACY !== "false";

export const SUPPORTED_PAYMENT_ASSETS: PaymentAsset[] = ["STRK", "DAI"];

export function tokenAddressForAsset(asset: PaymentAsset): string {
  return asset === "DAI" ? DAI_TOKEN_ADDRESS : STRK_TOKEN_ADDRESS;
}
