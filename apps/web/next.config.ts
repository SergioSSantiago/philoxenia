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
      "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    NEXT_PUBLIC_DAI_TOKEN_ADDRESS:
      process.env.NEXT_PUBLIC_DAI_TOKEN_ADDRESS ??
      "0x00da114221cb83fa859dbdb4c44beeaa0bb37c7537ad5ae66fe5e0efd20e6eb3",
    NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS:
      process.env.NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS ??
      "0x030533c6110ee5c414a5678bd71115be738852d709c74d8136fa965271c2e1f3",
    NEXT_PUBLIC_DAI_BOOKING_ESCROW_ADDRESS:
      process.env.NEXT_PUBLIC_DAI_BOOKING_ESCROW_ADDRESS ??
      "0x004c0322af24bb710f3aa0e48293517777188b42d9c4428b77304008ad0ea712",
    NEXT_PUBLIC_BOOKING_ANONYMIZER_ADDRESS:
      process.env.NEXT_PUBLIC_BOOKING_ANONYMIZER_ADDRESS ??
      "0x056a817104ad7544a55873584f3d8fb41a780e5466d152b3e1f12d578e75defb",
  },
};

export default nextConfig;
