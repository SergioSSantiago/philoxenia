import { describe, expect, it } from "vitest";
import { formatDaiPrice, formatTokenAmount } from "./format.js";

describe("formatTokenAmount", () => {
  it("trims trailing zeros and the decimal point", () => {
    expect(formatTokenAmount("11.000000000000000000")).toBe("11");
    expect(formatTokenAmount("11.5000")).toBe("11.5");
  });

  it("respects maxDecimals", () => {
    expect(formatTokenAmount("1.23456789", 2)).toBe("1.23");
    expect(formatTokenAmount("1.23999", 2)).toBe("1.23");
  });

  it("keeps a leading minus", () => {
    expect(formatTokenAmount("-3.1400")).toBe("-3.14");
  });

  it("accepts numbers", () => {
    expect(formatTokenAmount(10)).toBe("10");
  });

  it("returns 0 for empty and preserves non-numeric strings", () => {
    expect(formatTokenAmount("")).toBe("0");
    expect(formatTokenAmount("   ")).toBe("0");
    expect(formatTokenAmount("n/a")).toBe("n/a");
  });
});

describe("formatDaiPrice", () => {
  it("appends DAI", () => {
    expect(formatDaiPrice("11.00")).toBe("11 DAI");
    expect(formatDaiPrice(8.5)).toBe("8.5 DAI");
  });
});
