import { resolveSnip12ChainId } from "@philoxenia/shared";

export const useMainnet =
  process.env.NEXT_PUBLIC_STARKNET_CHAIN === "mainnet";

export const snip12ChainId = resolveSnip12ChainId(
  process.env.NEXT_PUBLIC_STARKNET_CHAIN === "mainnet" ? "mainnet" : "sepolia"
);
