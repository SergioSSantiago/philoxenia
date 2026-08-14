"use client";

import { sepolia, mainnet } from "@starknet-react/chains";
import { StarknetConfig, jsonRpcProvider } from "@starknet-react/core";
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { availableConnectors } from "@/lib/wallet-connectors";
import { useMainnet } from "@/lib/starknet-config";
import { publicMainnetRpcFallback } from "@philoxenia/shared";

const chain = useMainnet ? mainnet : sepolia;
const mainnetRpc =
  process.env.NEXT_PUBLIC_STARKNET_MAINNET_RPC || publicMainnetRpcFallback;
const sepoliaRpc =
  process.env.NEXT_PUBLIC_STARKNET_SEPOLIA_RPC ||
  "https://rpc.starknet-testnet.lava.build";

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
  // Resolve connectors on the client so Ready in-app browser is detected.
  const connectors = availableConnectors();

  return (
    <StarknetConfig
      chains={[chain]}
      provider={provider}
      connectors={connectors}
      autoConnect={false}
    >
      <AuthProvider>{children}</AuthProvider>
    </StarknetConfig>
  );
}
