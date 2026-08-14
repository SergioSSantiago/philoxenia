"use client";

import { sepolia, mainnet } from "@starknet-react/chains";
import {
  StarknetConfig,
  publicProvider,
  argent,
  braavos,
} from "@starknet-react/core";
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";

const chain =
  process.env.NEXT_PUBLIC_STARKNET_CHAIN === "mainnet" ? mainnet : sepolia;

export function Providers({ children }: { children: ReactNode }) {
  const connectors = [argent(), braavos()];

  return (
    <StarknetConfig
      chains={[chain]}
      provider={publicProvider()}
      connectors={connectors}
      autoConnect
    >
      <AuthProvider>{children}</AuthProvider>
    </StarknetConfig>
  );
}
