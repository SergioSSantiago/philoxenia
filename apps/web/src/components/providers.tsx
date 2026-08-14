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
const mainnetRpc = process.env.NEXT_PUBLIC_STARKNET_MAINNET_RPC;

const provider = jsonRpcProvider({
  rpc: (c) => {
    if (c.id === BigInt(mainnet.id) && mainnetRpc) {
      return { nodeUrl: mainnetRpc };
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
