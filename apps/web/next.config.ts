import type { NextConfig } from "next";

const alchemyKey = process.env.ALCHEMY_API_KEY ?? "";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_STARKNET_MAINNET_RPC: alchemyKey
      ? `https://starknet-mainnet.g.alchemy.com/v2/${alchemyKey}`
      : "",
  },
};

export default nextConfig;
