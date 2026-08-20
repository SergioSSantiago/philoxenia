import { describe, expect, it } from "vitest";
import {
  buildPhiloxeniaAuthTypedData,
  resolveSnip12ChainId,
} from "./auth-typed-data.js";

describe("resolveSnip12ChainId", () => {
  it("maps mainnet aliases to SN_MAIN", () => {
    expect(resolveSnip12ChainId("SN_MAIN")).toBe("SN_MAIN");
    expect(resolveSnip12ChainId("mainnet")).toBe("SN_MAIN");
  });

  it("defaults everything else to SN_SEPOLIA", () => {
    expect(resolveSnip12ChainId("sepolia")).toBe("SN_SEPOLIA");
    expect(resolveSnip12ChainId(null)).toBe("SN_SEPOLIA");
    expect(resolveSnip12ChainId(undefined)).toBe("SN_SEPOLIA");
  });
});

describe("buildPhiloxeniaAuthTypedData", () => {
  it("builds SNIP-12 revision 1 with a hex nonce", () => {
    const td = buildPhiloxeniaAuthTypedData({
      nonce: "abc",
      chainId: "SN_MAIN",
    });
    expect(td.primaryType).toBe("Authentication");
    expect(td.domain).toEqual({
      name: "Philoxenia",
      chainId: "SN_MAIN",
      version: "1",
      revision: "1",
    });
    expect(td.message.nonce).toBe("0xabc");
  });

  it("keeps an already-prefixed nonce", () => {
    const td = buildPhiloxeniaAuthTypedData({
      nonce: "0xdead",
      chainId: "SN_SEPOLIA",
    });
    expect(td.message.nonce).toBe("0xdead");
    expect(td.domain.chainId).toBe("SN_SEPOLIA");
  });
});
