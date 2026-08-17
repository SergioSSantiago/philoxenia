import type { Booking, PaymentAsset } from "@philoxenia/shared";
import { api } from "@/lib/api";

const KEY = "philoxenia_pending_paid_booking";

export type PendingPaidBooking = {
  bookingId: string;
  listingId: string;
  nights: string[];
  fundTxHash: string;
  escrowBookingId: string;
  privacyMode: "private" | "public";
  paymentAsset: PaymentAsset;
  totalPrice: string;
  fxRate?: string;
};

export function savePendingPaidBooking(row: PendingPaidBooking) {
  try {
    localStorage.setItem(KEY, JSON.stringify(row));
  } catch {
    // ignore quota
  }
}

export function loadPendingPaidBooking(): PendingPaidBooking | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingPaidBooking;
  } catch {
    return null;
  }
}

export function clearPendingPaidBooking() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Ready sometimes puts the hash on the error after the tx already landed. */
export function extractTxHashFromError(err: unknown): string | null {
  const walk = (v: unknown, depth: number): string | null => {
    if (depth > 5 || v == null) return null;
    if (typeof v === "string" && /^0x[0-9a-fA-F]{1,64}$/.test(v.trim())) {
      return v.trim();
    }
    if (typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    for (const k of [
      "transaction_hash",
      "transactionHash",
      "txHash",
      "hash",
    ]) {
      const hit = o[k];
      if (typeof hit === "string" && /^0x[0-9a-fA-F]{1,64}$/.test(hit)) {
        return hit;
      }
    }
    if (o.message) {
      const m = String(o.message).match(/0x[0-9a-fA-F]{50,64}/);
      if (m) return m[0];
    }
    for (const child of [o.cause, o.error, o.baseError, o.data]) {
      const nested = walk(child, depth + 1);
      if (nested) return nested;
    }
    return null;
  };
  return walk(err, 0);
}

export async function confirmPaidBookingWithRetry(
  pending: PendingPaidBooking,
  attempts = 12
): Promise<Booking> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const booking = await api.post<Booking>("/bookings/confirm", {
        bookingId: pending.bookingId,
        listingId: pending.listingId,
        nights: pending.nights,
        fundTxHash: pending.fundTxHash,
        escrowBookingId: pending.escrowBookingId,
        privacyMode: pending.privacyMode,
        paymentAsset: pending.paymentAsset,
        totalPrice: pending.totalPrice,
        totalPriceStrk:
          pending.paymentAsset === "STRK" ? pending.totalPrice : undefined,
        fxRate: pending.fxRate,
      });
      clearPendingPaidBooking();
      return booking;
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable =
        /not found on Starknet yet|wait for confirmation|Could not read/i.test(
          msg
        );
      if (!retryable || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Confirm booking failed");
}
