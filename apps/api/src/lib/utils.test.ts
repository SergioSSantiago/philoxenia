import { describe, it, expect } from "vitest";
import {
  calculateBookingAmounts,
  daysBetween,
  generateOpaqueToken,
  normalizeWalletAddress,
  orderedPair,
  splitBookingTotal,
} from "./utils.js";

describe("utils", () => {
  it("orders user pair consistently", () => {
    expect(orderedPair("b", "a")).toEqual(["a", "b"]);
    expect(orderedPair("a", "b")).toEqual(["a", "b"]);
  });

  it("calculates connector reward with 10% protocol take", () => {
    const amounts = calculateBookingAmounts("150", 5, 5, true);
    expect(amounts.totalPrice).toBe("750");
    expect(amounts.hostAmount).toBe("712.5");
    // Gross connector 37.5 → protocol 3.75 → connector net 33.75
    expect(amounts.connectorRewardAmount).toBe("33.75");
    expect(amounts.protocolFeeAmount).toBe("3.75");
    expect(amounts.protocolFeePercent).toBe(10);
  });

  it("skips connector and protocol fee when optional connector absent", () => {
    const amounts = calculateBookingAmounts("150", 5, 5, false);
    expect(amounts.totalPrice).toBe("750");
    expect(amounts.hostAmount).toBe("750");
    expect(amounts.connectorRewardAmount).toBe("0");
    expect(amounts.protocolFeeAmount).toBe("0");
    expect(amounts.protocolFeePercent).toBe(0);
    expect(amounts.connectorRewardPercentApplied).toBe(0);
  });

  it("treats a 0% connector reward as a direct stay", () => {
    const amounts = calculateBookingAmounts("100", 1, 0, true);
    expect(amounts.hostAmount).toBe("100");
    expect(amounts.protocolFeeAmount).toBe("0");
  });

  it("splits an already-summed total the same way", () => {
    const amounts = splitBookingTotal("750", 5, true);
    expect(amounts.hostAmount).toBe("712.5");
    expect(amounts.connectorRewardAmount).toBe("33.75");
  });

  it("counts nights between dates", () => {
    const nights = daysBetween(
      new Date("2026-09-01"),
      new Date("2026-09-06")
    );
    expect(nights).toBe(5);
  });

  it("normalizes wallets and mints opaque share tokens", () => {
    expect(normalizeWalletAddress("0xABC")).toBe("0xabc");
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
  });
});

describe("utils", () => {
  it("orders user pair consistently", () => {
    expect(orderedPair("b", "a")).toEqual(["a", "b"]);
    expect(orderedPair("a", "b")).toEqual(["a", "b"]);
  });

  it("calculates connector reward with 10% protocol take", () => {
    const amounts = calculateBookingAmounts("150", 5, 5, true);
    expect(amounts.totalPrice).toBe("750");
    expect(amounts.hostAmount).toBe("712.5");
    // Gross connector 37.5 → protocol 3.75 → connector net 33.75
    expect(amounts.connectorRewardAmount).toBe("33.75");
    expect(amounts.protocolFeeAmount).toBe("3.75");
    expect(amounts.protocolFeePercent).toBe(10);
  });

  it("skips connector and protocol fee when optional connector absent", () => {
    const amounts = calculateBookingAmounts("150", 5, 5, false);
    expect(amounts.totalPrice).toBe("750");
    expect(amounts.hostAmount).toBe("750");
    expect(amounts.connectorRewardAmount).toBe("0");
    expect(amounts.protocolFeeAmount).toBe("0");
    expect(amounts.protocolFeePercent).toBe(0);
    expect(amounts.connectorRewardPercentApplied).toBe(0);
  });

  it("counts nights between dates", () => {
    const nights = daysBetween(
      new Date("2026-09-01"),
      new Date("2026-09-06")
    );
    expect(nights).toBe(5);
  });
});
