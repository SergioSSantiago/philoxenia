import { RpcProvider } from "starknet";
import {
  getStarknetMainnetRpcUrl,
  getStarknetSepoliaRpcUrl,
  resolveSnip12ChainId,
} from "@philoxenia/shared";

let cached: RpcProvider | null = null;

/** Shared Starknet RPC for API-side auth + payment verification. */
export function getRpcProvider(): RpcProvider {
  if (cached) return cached;
  const chainId = resolveSnip12ChainId(process.env.STARKNET_CHAIN);
  const nodeUrl =
    chainId === "SN_MAIN"
      ? getStarknetMainnetRpcUrl({
          alchemyApiKey: process.env.ALCHEMY_API_KEY,
          explicitUrl: process.env.STARKNET_RPC_URL,
        })
      : getStarknetSepoliaRpcUrl({
          alchemyApiKey: process.env.ALCHEMY_API_KEY,
          explicitUrl: process.env.STARKNET_SEPOLIA_RPC_URL,
        });
  cached = new RpcProvider({ nodeUrl });
  return cached;
}

export const MAINNET_STRK_ESCROW =
  process.env.BOOKING_ESCROW_ADDRESS?.trim() ||
  process.env.NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS?.trim() ||
  "0x030533c6110ee5c414a5678bd71115be738852d709c74d8136fa965271c2e1f3";

export const MAINNET_DAI_ESCROW =
  process.env.DAI_BOOKING_ESCROW_ADDRESS?.trim() ||
  process.env.NEXT_PUBLIC_DAI_BOOKING_ESCROW_ADDRESS?.trim() ||
  "0x004c0322af24bb710f3aa0e48293517777188b42d9c4428b77304008ad0ea712";

export function escrowAddressesForAsset(
  asset: "STRK" | "DAI"
): string[] {
  return asset === "DAI"
    ? [MAINNET_DAI_ESCROW, MAINNET_STRK_ESCROW]
    : [MAINNET_STRK_ESCROW, MAINNET_DAI_ESCROW];
}

export function normalizeFeltAddress(addr: string): string {
  const hex = addr.toLowerCase().replace(/^0x/, "");
  return `0x${hex.padStart(64, "0")}`;
}
