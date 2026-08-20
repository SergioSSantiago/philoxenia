import { describe, it, expect } from "vitest";
import { assertNoPastNights, inferNightsForPaidAmount, toDayKey, utcTodayKey } from "./booking-nights.js";

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

  it("toDayKey slices ISO timestamps", () => {
    expect(toDayKey("2026-08-18T12:00:00.000Z")).toBe("2026-08-18");
    expect(toDayKey(new Date("2026-08-18T00:00:00.000Z"))).toBe("2026-08-18");
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

  it("skips nights already taken", () => {
    expect(
      inferNightsForPaidAmount({
        days: [
          { day: "2026-08-18", pricePerNight: "10" },
          { day: "2026-08-19", pricePerNight: "10" },
        ],
        taken: ["2026-08-18"],
        paidAmount: 10,
        tokenPerDai: 1,
        fallbackDay: "2026-08-19",
        fallbackPrice: "10",
      })
    ).toEqual(["2026-08-19"]);
  });

  it("matches two consecutive nights when a single night does not fit", () => {
    expect(
      inferNightsForPaidAmount({
        days: [
          { day: "2026-08-18", pricePerNight: "10" },
          { day: "2026-08-19", pricePerNight: "20" },
        ],
        paidAmount: 30,
        tokenPerDai: 1,
        fallbackDay: "2026-08-18",
        fallbackPrice: "10",
      })
    ).toEqual(["2026-08-18", "2026-08-19"]);
  });

  it("always returns the fallback night so a landed pay can become a stay", () => {
    expect(
      inferNightsForPaidAmount({
        days: [],
        paidAmount: 99,
        tokenPerDai: 1,
        fallbackDay: "2026-08-17T00:00:00.000Z",
        fallbackPrice: "1",
      })
    ).toEqual(["2026-08-17"]);
  });
});
