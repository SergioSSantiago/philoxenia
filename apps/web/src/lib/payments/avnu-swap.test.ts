import { describe, expect, it } from "vitest";
import {
  formatSwapAmount,
  parseSwapAmount,
  AVNU_SWAP_SLIPPAGE,
} from "./avnu-swap";

describe("parseSwapAmount", () => {
  it("parses 18-decimal token amounts", () => {
    expect(parseSwapAmount("1")).toBe(10n ** 18n);
    expect(parseSwapAmount("1.5")).toBe(15n * 10n ** 17n);
    expect(parseSwapAmount(" 2.0 ")).toBe(2n * 10n ** 18n);
  });

  it("rejects empty, zero, and non-numeric input", () => {
    expect(() => parseSwapAmount("")).toThrow(/amount/i);
    expect(() => parseSwapAmount("0")).toThrow(/greater than zero/i);
    expect(() => parseSwapAmount("1.2a")).toThrow(/valid STRK or DAI/i);
    expect(() => parseSwapAmount("abc")).toThrow(/valid STRK or DAI/i);
  });
});

describe("quoteAvnuSwap", () => {
  it("refuses swapping a token for itself", async () => {
    const { quoteAvnuSwap } = await import("./avnu-swap");
    await expect(
      quoteAvnuSwap({
        sellAsset: "STRK",
        buyAsset: "STRK",
        sellAmount: "1",
        takerAddress: "0x1",
      })
    ).rejects.toThrow(/different tokens/i);
  });
});

describe("formatSwapAmount", () => {
  it("formats wei back to a human decimal", () => {
    expect(formatSwapAmount(10n ** 18n)).toBe("1");
    expect(formatSwapAmount(15n * 10n ** 17n)).toBe("1.5");
  });
});

describe("AVNU_SWAP_SLIPPAGE", () => {
  it("is 1%", () => {
    expect(AVNU_SWAP_SLIPPAGE).toBe(0.01);
  });
});
