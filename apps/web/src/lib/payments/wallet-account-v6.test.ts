import { describe, expect, it } from "vitest";
import { isStrk20WalletApi } from "./wallet-account-v6";

describe("isStrk20WalletApi", () => {
  it("accepts wallet API 0.10 and above", () => {
    expect(isStrk20WalletApi(["0.9.0"])).toBe(false);
    expect(isStrk20WalletApi(["0.10.0"])).toBe(true);
    expect(isStrk20WalletApi(["0.10.3"])).toBe(true);
    expect(isStrk20WalletApi(["v0.10.1"])).toBe(true);
    expect(isStrk20WalletApi(["1.0.0"])).toBe(true);
  });

  it("ignores unparseable versions", () => {
    expect(isStrk20WalletApi([])).toBe(false);
    expect(isStrk20WalletApi(["not-a-version"])).toBe(false);
  });
});
