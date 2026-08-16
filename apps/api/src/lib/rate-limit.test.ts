import { describe, expect, it } from "vitest";
import { rateLimitCheck } from "../lib/rate-limit.js";
import { hash } from "starknet";

describe("rateLimitCheck", () => {
  it("allows under the limit and blocks over", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    expect(rateLimitCheck(key, 3, 60_000).ok).toBe(true);
    expect(rateLimitCheck(key, 3, 60_000).ok).toBe(true);
    expect(rateLimitCheck(key, 3, 60_000).ok).toBe(true);
    const blocked = rateLimitCheck(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});

describe("escrow event selectors", () => {
  it("resolves BookingSettled / Funded / Refunded selectors", () => {
    expect(hash.getSelectorFromName("BookingSettled")).toMatch(/^0x/);
    expect(hash.getSelectorFromName("BookingFunded")).toMatch(/^0x/);
    expect(hash.getSelectorFromName("BookingRefunded")).toMatch(/^0x/);
  });
});
