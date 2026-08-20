import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPayInflight,
  clearPendingPaidBooking,
  extractTxHashFromError,
  loadPayInflight,
  loadPendingPaidBooking,
  nightsOverlap,
  savePayInflight,
  savePendingPaidBooking,
} from "./pending-paid-booking";

describe("nightsOverlap", () => {
  it("detects shared calendar nights even with timestamps", () => {
    expect(
      nightsOverlap(["2026-08-18T00:00:00.000Z"], ["2026-08-18"])
    ).toBe(true);
    expect(nightsOverlap(["2026-08-18"], ["2026-08-19"])).toBe(false);
  });
});

describe("extractTxHashFromError", () => {
  it("finds transaction_hash on nested wallet errors", () => {
    expect(
      extractTxHashFromError({
        message: "failed",
        error: {
          transaction_hash:
            "0x05bac436e2a9775719de94e0ec1ea62f1cbc9737b23dd780230df66a53cc7813",
        },
      })
    ).toMatch(/^0x05bac43/);
  });

  it("parses a 0x hash out of the message", () => {
    const hash =
      "0x04902a7a2702b9533cf8992f5bf6953947e0d9616f8dbc9bc5b1976e0082f494";
    expect(extractTxHashFromError(new Error(`tx ${hash} failed`))).toBe(hash);
  });

  it("returns null when nothing looks like a hash", () => {
    expect(extractTxHashFromError(new Error("nope"))).toBeNull();
  });
});

describe("pay inflight session storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("round-trips inflight rows and expires stale ones", () => {
    savePayInflight({
      listingId: "l1",
      nights: ["2026-08-20"],
      bookingId: "b1",
      escrowBookingId: "1",
      startedAt: Date.now(),
    });
    expect(loadPayInflight()?.listingId).toBe("l1");
    clearPayInflight();
    expect(loadPayInflight()).toBeNull();
  });

  it("drops inflight older than 20 minutes", () => {
    savePayInflight({
      listingId: "l1",
      nights: ["2026-08-20"],
      bookingId: "b1",
      escrowBookingId: "1",
      startedAt: Date.now() - 21 * 60 * 1000,
    });
    expect(loadPayInflight()).toBeNull();
  });

  it("round-trips pending paid bookings", () => {
    savePendingPaidBooking({
      bookingId: "b1",
      listingId: "l1",
      nights: ["2026-08-20"],
      fundTxHash: "0x1",
      escrowBookingId: "9",
      privacyMode: "private",
      paymentAsset: "STRK",
      totalPrice: "1",
    });
    expect(loadPendingPaidBooking()?.privacyMode).toBe("private");
    clearPendingPaidBooking();
    expect(loadPendingPaidBooking()).toBeNull();
  });
});
