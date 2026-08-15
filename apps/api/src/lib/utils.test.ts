import { describe, it, expect } from "vitest";
import {
  calculateBookingAmounts,
  daysBetween,
  orderedPair,
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

  it("counts nights between dates", () => {
    const nights = daysBetween(
      new Date("2026-09-01"),
      new Date("2026-09-06")
    );
    expect(nights).toBe(5);
  });
});
