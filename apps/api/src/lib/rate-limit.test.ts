import { describe, expect, it } from "vitest";
import { clientIp, rateLimitCheck } from "../lib/rate-limit.js";
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

describe("clientIp", () => {
  it("uses the first x-forwarded-for hop", () => {
    expect(
      clientIp({ "x-forwarded-for": " 1.1.1.1, 2.2.2.2 " }, "unknown")
    ).toBe("1.1.1.1");
  });

  it("falls back when the header is missing", () => {
    expect(clientIp({}, "127.0.0.1")).toBe("127.0.0.1");
  });
});

describe("escrow event selectors", () => {
  it("resolves BookingSettled / Funded / Refunded selectors", () => {
    expect(hash.getSelectorFromName("BookingSettled")).toMatch(/^0x/);
    expect(hash.getSelectorFromName("BookingFunded")).toMatch(/^0x/);
    expect(hash.getSelectorFromName("BookingRefunded")).toMatch(/^0x/);
  });
});
