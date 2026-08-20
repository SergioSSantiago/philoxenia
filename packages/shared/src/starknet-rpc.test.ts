import { describe, expect, it } from "vitest";
import {
  getStarknetMainnetRpcUrl,
  getStarknetSepoliaRpcUrl,
  publicMainnetRpcFallback,
} from "./starknet-rpc.js";

describe("RPC URL resolution", () => {
  it("prefers an explicit URL over Alchemy", () => {
    expect(
      getStarknetMainnetRpcUrl({
        alchemyApiKey: "key",
        explicitUrl: " https://custom.example/rpc ",
      })
    ).toBe("https://custom.example/rpc");
  });

  it("builds Alchemy URLs when a key is set", () => {
    expect(getStarknetMainnetRpcUrl({ alchemyApiKey: "abc" })).toBe(
      "https://starknet-mainnet.g.alchemy.com/v2/abc"
    );
    expect(getStarknetSepoliaRpcUrl({ alchemyApiKey: "abc" })).toBe(
      "https://starknet-sepolia.g.alchemy.com/v2/abc"
    );
  });

  it("falls back to public Lava endpoints", () => {
    expect(getStarknetMainnetRpcUrl()).toBe("https://rpc.starknet.lava.build");
    expect(getStarknetSepoliaRpcUrl()).toBe(
      "https://rpc.starknet-testnet.lava.build"
    );
  });

  it("exposes Cartridge as the browser fallback", () => {
    expect(publicMainnetRpcFallback).toContain("cartridge.gg");
  });
});
