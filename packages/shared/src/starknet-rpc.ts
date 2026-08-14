const LAVA_MAINNET = "https://rpc.starknet.lava.build";
const LAVA_SEPOLIA = "https://rpc.starknet-testnet.lava.build";
const CARTRIDGE_MAINNET = "https://api.cartridge.gg/x/starknet/mainnet";

export function getStarknetMainnetRpcUrl(options?: {
  alchemyApiKey?: string | null;
  explicitUrl?: string | null;
}): string {
  if (options?.explicitUrl?.trim()) return options.explicitUrl.trim();
  const key = options?.alchemyApiKey?.trim();
  if (key) return `https://starknet-mainnet.g.alchemy.com/v2/${key}`;
  return LAVA_MAINNET;
}

export function getStarknetSepoliaRpcUrl(options?: {
  alchemyApiKey?: string | null;
  explicitUrl?: string | null;
}): string {
  if (options?.explicitUrl?.trim()) return options.explicitUrl.trim();
  const key = options?.alchemyApiKey?.trim();
  if (key) return `https://starknet-sepolia.g.alchemy.com/v2/${key}`;
  return LAVA_SEPOLIA;
}

/** Public mainnet RPC without API key (web client fallback). */
export const publicMainnetRpcFallback = CARTRIDGE_MAINNET;
