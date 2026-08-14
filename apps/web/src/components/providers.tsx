"use client";

import { sepolia, mainnet } from "@starknet-react/chains";
import {
  StarknetConfig,
  jsonRpcProvider,
  argent,
  braavos,
} from "@starknet-react/core";
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";

const useMainnet = process.env.NEXT_PUBLIC_STARKNET_CHAIN === "mainnet";
const chain = useMainnet ? mainnet : sepolia;
const mainnetRpc =
  process.env.NEXT_PUBLIC_STARKNET_MAINNET_RPC ||
  "https://starknet-mainnet.public.blastapi.io/rpc/v0_8";
const sepoliaRpc = "https://starknet-sepolia.public.blastapi.io/rpc/v0_8";

const provider = jsonRpcProvider({
  rpc: (c) => {
    if (c.id === BigInt(mainnet.id)) {
      return { nodeUrl: mainnetRpc };
    }
    if (c.id === BigInt(sepolia.id)) {
      return { nodeUrl: sepoliaRpc };
    }
    return null;
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const connectors = [argent(), braavos()];

  return (
    <StarknetConfig
      chains={[chain]}
      provider={provider}
      connectors={connectors}
      autoConnect
    >
      <AuthProvider>{children}</AuthProvider>
    </StarknetConfig>
  );
}
