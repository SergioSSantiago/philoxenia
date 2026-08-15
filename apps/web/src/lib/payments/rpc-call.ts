import { RpcProvider, type Call } from "starknet";
import { getStarknetMainnetRpcUrl, publicMainnetRpcFallback } from "@philoxenia/shared";

/** Shared read RPC for ERC-20 views (AccountInterface no longer exposes callContract). */
export function createReadProvider(): RpcProvider {
  const nodeUrl = getStarknetMainnetRpcUrl({
    alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
    explicitUrl: process.env.NEXT_PUBLIC_STARKNET_MAINNET_RPC,
  });
  return new RpcProvider({
    nodeUrl: nodeUrl || publicMainnetRpcFallback,
  });
}

export async function callContract(call: Call): Promise<string[]> {
  const provider = createReadProvider();
  return provider.callContract(call);
}
