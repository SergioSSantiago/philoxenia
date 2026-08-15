import { describe, it, expect } from "vitest";
import { assertNoPastNights, utcTodayKey } from "./booking-nights.js";

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
