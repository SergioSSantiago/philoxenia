import type { NextConfig } from "next";
import path from "node:path";

const alchemyKey = process.env.ALCHEMY_API_KEY ?? "";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["starknetkit"],
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  env: {
    NEXT_PUBLIC_STARKNET_MAINNET_RPC: alchemyKey
      ? `https://starknet-mainnet.g.alchemy.com/v2/${alchemyKey}`
      : "",
    NEXT_PUBLIC_STRK20_PRIVACY:
      process.env.NEXT_PUBLIC_STRK20_PRIVACY ?? "true",
    NEXT_PUBLIC_STRK_TOKEN_ADDRESS:
      process.env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS ??
      "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d1ab4b5195650d67ce8d3",
    NEXT_PUBLIC_DAI_TOKEN_ADDRESS:
      process.env.NEXT_PUBLIC_DAI_TOKEN_ADDRESS ??
      "0x00da114221cb83fa859dbdb4c44beeaa0bb37c7537ad5ae66fe5e0efd20e6eb3",
  },
};

export default nextConfig;
