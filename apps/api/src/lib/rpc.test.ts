import { describe, expect, it } from "vitest";
import {
  escrowAddressesForAsset,
  MAINNET_DAI_ESCROW,
  MAINNET_STRK_ESCROW,
  normalizeFeltAddress,
} from "./rpc.js";

describe("normalizeFeltAddress", () => {
  it("pads to 32 bytes lowercase", () => {
    expect(normalizeFeltAddress("0x1")).toBe(
      `0x${"0".repeat(63)}1`
    );
    expect(normalizeFeltAddress(MAINNET_STRK_ESCROW.toUpperCase())).toBe(
      normalizeFeltAddress(MAINNET_STRK_ESCROW)
    );
  });
});

describe("escrowAddressesForAsset", () => {
  it("lists the paid asset first, then the other escrow", () => {
    expect(escrowAddressesForAsset("STRK")[0]).toBe(MAINNET_STRK_ESCROW);
    expect(escrowAddressesForAsset("DAI")[0]).toBe(MAINNET_DAI_ESCROW);
    expect(escrowAddressesForAsset("STRK")).toContain(MAINNET_DAI_ESCROW);
  });
});
