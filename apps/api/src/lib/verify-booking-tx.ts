import { hash, num } from "starknet";
import {
  escrowAddressesForAsset,
  getRpcProvider,
  normalizeFeltAddress,
} from "./rpc.js";

const BOOKING_SETTLED = num.toHex(hash.getSelectorFromName("BookingSettled"));
const BOOKING_FUNDED = num.toHex(hash.getSelectorFromName("BookingFunded"));
const BOOKING_REFUNDED = num.toHex(hash.getSelectorFromName("BookingRefunded"));

function normalizeTxHash(txHash: string): string {
  const h = txHash.trim().toLowerCase();
  if (!/^0x[0-9a-f]{1,64}$/.test(h)) {
    throw new Error("Invalid transaction hash");
  }
  return h;
}

function feltEq(a: string, b: string): boolean {
  try {
    return BigInt(a) === BigInt(b);
  } catch {
    return false;
  }
}

function u256FromData(data: string[], offset: number): bigint | null {
  if (offset + 1 >= data.length) return null;
  try {
    return BigInt(data[offset]) + (BigInt(data[offset + 1]) << 128n);
  } catch {
    return null;
  }
}

/**
 * Prove a booking payment tx on Starknet before writing DB state.
 * Accepts public multicall and private anonymizer paths — both emit escrow events.
 */
export async function verifyEscrowPaymentTx(input: {
  txHash: string;
  escrowBookingId: string;
  paymentAsset: "STRK" | "DAI";
  requireSettled?: boolean;
}): Promise<{
  txHash: string;
  executionStatus: string;
  matchedEvent: "BookingSettled" | "BookingFunded";
  fromEscrow: string;
}> {
  const txHash = normalizeTxHash(input.txHash);
  let bookingId: bigint;
  try {
    bookingId = BigInt(input.escrowBookingId);
  } catch {
    throw new Error("Invalid escrow booking id");
  }
  if (bookingId <= 0n) {
    throw new Error("Invalid escrow booking id");
  }

  const provider = getRpcProvider();
  let receipt: Awaited<ReturnType<typeof provider.getTransactionReceipt>>;
  try {
    receipt = await provider.getTransactionReceipt(txHash);
  } catch {
    throw new Error(
      "Transaction not found on Starknet yet — wait for confirmation and retry"
    );
  }

  const exec =
    (receipt as { execution_status?: string }).execution_status ??
    (receipt as { status?: string }).status ??
    "";
  const ok =
    exec === "SUCCEEDED" ||
    exec === "ACCEPTED_ON_L2" ||
    exec === "ACCEPTED_ON_L1" ||
    (receipt as { isSuccess?: () => boolean }).isSuccess?.() === true;

  if (!ok && exec && exec !== "SUCCEEDED") {
    throw new Error(`Transaction did not succeed (status: ${exec})`);
  }

  const events =
    (receipt as { events?: Array<{ from_address: string; keys: string[]; data: string[] }> })
      .events ?? [];

  const allowed = new Set(
    escrowAddressesForAsset(input.paymentAsset).map(normalizeFeltAddress)
  );

  let fundedMatch: {
    fromEscrow: string;
  } | null = null;

  for (const ev of events) {
    const from = normalizeFeltAddress(ev.from_address);
    if (!allowed.has(from)) continue;
    if (!ev.keys?.length) continue;

    const selector = num.toHex(BigInt(ev.keys[0]));
    const idFromData = u256FromData(ev.data ?? [], 0);
    // Some builds put booking_id in keys[1]/keys[2] when #[key]
    const idFromKeys =
      ev.keys.length >= 3
        ? (() => {
            try {
              return BigInt(ev.keys[1]) + (BigInt(ev.keys[2]) << 128n);
            } catch {
              return null;
            }
          })()
        : ev.keys.length >= 2
          ? (() => {
              try {
                return BigInt(ev.keys[1]);
              } catch {
                return null;
              }
            })()
          : null;

    const matchedId =
      idFromData === bookingId
        ? idFromData
        : idFromKeys === bookingId
          ? idFromKeys
          : null;
    if (matchedId === null) continue;

    if (feltEq(selector, BOOKING_SETTLED)) {
      return {
        txHash,
        executionStatus: exec || "SUCCEEDED",
        matchedEvent: "BookingSettled",
        fromEscrow: from,
      };
    }
    if (feltEq(selector, BOOKING_FUNDED)) {
      fundedMatch = { fromEscrow: from };
    }
  }

  if (input.requireSettled !== false) {
    if (fundedMatch) {
      throw new Error(
        "Tx funded escrow but did not settle — Philoxenia requires fund+settle in one payment"
      );
    }
    throw new Error(
      "Tx has no BookingSettled event for this booking on the Philoxenia escrow"
    );
  }

  if (fundedMatch) {
    return {
      txHash,
      executionStatus: exec || "SUCCEEDED",
      matchedEvent: "BookingFunded",
      fromEscrow: fundedMatch.fromEscrow,
    };
  }

  throw new Error(
    "Tx has no matching BookingFunded/BookingSettled event on Philoxenia escrow"
  );
}

export async function verifyEscrowRefundTx(input: {
  txHash: string;
  escrowBookingId: string;
  paymentAsset: "STRK" | "DAI";
}): Promise<{ txHash: string }> {
  const txHash = normalizeTxHash(input.txHash);
  let bookingId: bigint;
  try {
    bookingId = BigInt(input.escrowBookingId);
  } catch {
    throw new Error("Invalid escrow booking id");
  }

  const provider = getRpcProvider();
  const receipt = await provider.getTransactionReceipt(txHash);
  const exec =
    (receipt as { execution_status?: string }).execution_status ?? "";
  if (exec && exec !== "SUCCEEDED") {
    throw new Error(`Refund transaction did not succeed (status: ${exec})`);
  }

  const events =
    (receipt as { events?: Array<{ from_address: string; keys: string[]; data: string[] }> })
      .events ?? [];
  const allowed = new Set(
    escrowAddressesForAsset(input.paymentAsset).map(normalizeFeltAddress)
  );

  for (const ev of events) {
    const from = normalizeFeltAddress(ev.from_address);
    if (!allowed.has(from)) continue;
    if (!ev.keys?.length) continue;
    const selector = num.toHex(BigInt(ev.keys[0]));
    if (!feltEq(selector, BOOKING_REFUNDED)) continue;
    const id = u256FromData(ev.data ?? [], 0);
    if (id === bookingId) {
      return { txHash };
    }
  }

  throw new Error(
    "Tx has no BookingRefunded event for this booking on Philoxenia escrow"
  );
}
