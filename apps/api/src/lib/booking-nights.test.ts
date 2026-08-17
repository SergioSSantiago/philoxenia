import { describe, it, expect } from "vitest";
import { assertNoPastNights, inferNightsForPaidAmount, utcTodayKey } from "./booking-nights.js";

describe("assertNoPastNights", () => {
  it("allows today and future", () => {
    expect(() =>
      assertNoPastNights(["2026-08-15", "2026-08-20"], "2026-08-15")
    ).not.toThrow();
  });

  it("rejects nights before today", () => {
    expect(() =>
      assertNoPastNights(["2026-08-14", "2026-08-20"], "2026-08-15")
    ).toThrow(/past/);
  });

  it("utcTodayKey is YYYY-MM-DD", () => {
    expect(utcTodayKey(new Date("2026-08-15T23:00:00.000Z"))).toBe(
      "2026-08-15"
    );
  });
});

describe("inferNightsForPaidAmount", () => {
  it("picks the single night that matches the paid token amount", () => {
    expect(
      inferNightsForPaidAmount({
        days: [
          { day: "2026-08-18", pricePerNight: "10" },
          { day: "2026-08-19", pricePerNight: "20" },
        ],
        paidAmount: 0.433,
        tokenPerDai: 0.0433,
        fallbackDay: "2026-08-17",
        fallbackPrice: "10",
      })
    ).toEqual(["2026-08-18"]);
  });
});
