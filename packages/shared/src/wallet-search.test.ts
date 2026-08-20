import { describe, expect, it } from "vitest";
import {
  normalizeWalletSearchQuery,
  walletQueryMatchesAddress,
} from "./wallet-search.js";

const WALLET =
  "0x04912f27036fd23f51cb9cfe719ea0d875bfc462b5f2af8f110a3b1832bb2f59";

describe("normalizeWalletSearchQuery", () => {
  it("lowercases, strips spaces, and prefixes 0x", () => {
    expect(normalizeWalletSearchQuery("  4912 F270  ")).toBe("0x4912f270");
    expect(normalizeWalletSearchQuery("0xABCD")).toBe("0xabcd");
  });

  it("returns empty for blank input", () => {
    expect(normalizeWalletSearchQuery("")).toBe("");
    expect(normalizeWalletSearchQuery("   ")).toBe("");
  });
});

describe("walletQueryMatchesAddress", () => {
  it("matches a full address and a hex infix of 4+ chars after 0x", () => {
    expect(walletQueryMatchesAddress(WALLET, WALLET)).toBe(true);
    expect(walletQueryMatchesAddress("4912f270", WALLET)).toBe(true);
    expect(walletQueryMatchesAddress("0xbb2f59", WALLET)).toBe(true);
  });

  it("rejects short or empty queries", () => {
    expect(walletQueryMatchesAddress("0x12", WALLET)).toBe(false);
    expect(walletQueryMatchesAddress("", WALLET)).toBe(false);
    expect(walletQueryMatchesAddress("zzz", WALLET)).toBe(false);
  });
});
