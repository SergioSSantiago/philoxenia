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

  it("calculates connector reward split", () => {
    const amounts = calculateBookingAmounts("150", 5, 5);
    expect(amounts.totalPrice).toBe("750");
    expect(amounts.connectorRewardAmount).toBe("37.5");
    expect(amounts.hostAmount).toBe("712.5");
  });

  it("counts nights between dates", () => {
    const nights = daysBetween(
      new Date("2026-09-01"),
      new Date("2026-09-06")
    );
    expect(nights).toBe(5);
  });
});
