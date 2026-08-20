import { describe, expect, it } from "vitest";
import {
  formatWalletError,
  isWalletCancelled,
  normalizeWalletSignature,
} from "@/lib/wallet-errors";

describe("isWalletCancelled", () => {
  it("detects Ready and wallet-standard abort copy", () => {
    expect(isWalletCancelled(new Error("USER_REFUSED_OP"))).toBe(true);
    expect(isWalletCancelled(new Error("user rejected the request"))).toBe(
      true
    );
    expect(isWalletCancelled(new Error("RPC timeout"))).toBe(false);
  });
});

describe("formatWalletError", () => {
  it("rewrites cancelled, wrong-chain, and missing-wallet errors", () => {
    expect(formatWalletError(new Error("USER_REFUSED_OP"))).toMatch(
      /cancelled in Ready X/i
    );
    expect(
      formatWalletError(
        new Error("Cannot sign the message from a different chainId")
      )
    ).toMatch(/mainnet/i);
    expect(formatWalletError(new Error("connector not found"))).toMatch(
      /Ready X is not available/i
    );
  });

  it("passes through unknown messages", () => {
    expect(formatWalletError(new Error("unique boom"))).toBe("unique boom");
  });
});

describe("normalizeWalletSignature", () => {
  it("accepts r/s objects and decimal arrays", () => {
    expect(normalizeWalletSignature({ r: 10, s: 11 })).toEqual(["0xa", "0xb"]);
    expect(normalizeWalletSignature(["1", "2"])).toEqual(["0x1", "0x2"]);
  });

  it("rejects incomplete arrays", () => {
    expect(() => normalizeWalletSignature(["0x1"])).toThrow(/incomplete/i);
    expect(() => normalizeWalletSignature("nope")).toThrow(/Unexpected/i);
  });
});
