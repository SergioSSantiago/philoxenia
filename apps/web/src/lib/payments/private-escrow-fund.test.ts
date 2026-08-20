import { CallData, cairo } from "starknet";
import { describe, expect, it } from "vitest";
import {
  bookingAnonymizerAddress,
  toWalletCalldata,
  toWalletFelt,
} from "./private-escrow-fund";

describe("toWalletFelt", () => {
  it("encodes decimals as 0x-hex Ready can accept", () => {
    expect(toWalletFelt("1000")).toBe("0x3e8");
    expect(toWalletFelt(0)).toBe("0x0");
    expect(toWalletFelt(10n ** 18n)).toMatch(/^0x[0-9a-f]+$/);
  });

  it("passes through wallet template placeholders", () => {
    expect(toWalletFelt("${amount}")).toBe("${amount}");
  });
});

describe("toWalletCalldata", () => {
  it("re-encodes CallData.compile decimals to hex felts", () => {
    const compiled = CallData.compile({
      escrow: "0x030533c6110ee5c414a5678bd71115be738852d709c74d8136fa965271c2e1f3",
      booking_id: cairo.uint256(1n),
    });
    const hex = toWalletCalldata([...compiled, "0x0"]);
    expect(hex.every((item) => /^0x[0-9a-f]+$/i.test(item))).toBe(true);
    expect(hex[hex.length - 1]).toBe("0x0");
  });
});

describe("bookingAnonymizerAddress", () => {
  it("defaults to the mainnet anonymizer", () => {
    expect(bookingAnonymizerAddress()).toMatch(/^0x056a8171/);
  });
});
