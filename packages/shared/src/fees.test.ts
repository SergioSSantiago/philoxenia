import { describe, expect, it } from "vitest";
import { PROTOCOL_FEE_PERCENT_OF_CONNECTOR, percentToBps } from "./fees.js";

describe("fees", () => {
  it("keeps protocol take at 10% of the connector reward", () => {
    expect(PROTOCOL_FEE_PERCENT_OF_CONNECTOR).toBe(10);
  });

  it("converts whole percents to basis points", () => {
    expect(percentToBps(0)).toBe(0);
    expect(percentToBps(5)).toBe(500);
    expect(percentToBps(10)).toBe(1000);
    expect(percentToBps(100)).toBe(10000);
  });

  it("rounds fractional percents", () => {
    expect(percentToBps(2.5)).toBe(250);
  });
});
