import type { NextConfig } from "next";
import path from "node:path";

const alchemyKey = process.env.ALCHEMY_API_KEY ?? "";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  env: {
    NEXT_PUBLIC_STARKNET_MAINNET_RPC: alchemyKey
      ? `https://starknet-mainnet.g.alchemy.com/v2/${alchemyKey}`
      : "",
  },
};

export default nextConfig;
