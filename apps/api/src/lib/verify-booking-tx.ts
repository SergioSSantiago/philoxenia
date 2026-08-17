import { CallData, cairo, hash, num } from "starknet";
import {
  escrowAddressesForAsset,
  getRpcProvider,
  MAINNET_DAI_ESCROW,
  MAINNET_STRK_ESCROW,
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
  return `0x${h.slice(2).padStart(64, "0")}`;
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

export function uuidToOnChainId(uuid: string): bigint {
  return BigInt(`0x${uuid.replace(/-/g, "").slice(0, 16)}`);
}

export function weiToTokenAmount(wei: bigint): string {
  const whole = wei / 10n ** 18n;
  const frac = (wei % 10n ** 18n)
    .toString()
    .padStart(18, "0")
    .replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

export function txHashVariants(txHash: string): string[] {
  const hex = normalizeTxHash(txHash).replace(/^0x/, "");
  const padded = `0x${hex.padStart(64, "0")}`;
  const short = `0x${hex.replace(/^0+/, "") || "0"}`;
  return [...new Set([`0x${hex}`, padded, short])];
}

function receiptSucceeded(receipt: {
  execution_status?: string;
  status?: string;
  isSuccess?: () => boolean;
}): boolean {
  const exec = receipt.execution_status ?? receipt.status ?? "";
  return (
    exec === "SUCCEEDED" ||
    exec === "ACCEPTED_ON_L2" ||
    exec === "ACCEPTED_ON_L1" ||
    receipt.isSuccess?.() === true
  );
}

export type InspectedEscrowPayment = {
  txHash: string;
  paymentAsset: "STRK" | "DAI";
  escrowBookingId: string;
  listingOnChainId: string;
  guest: string;
  host: string;
  totalAmount: string;
  hostAmount: string;
  connectorAmount: string;
  protocolAmount: string;
  fromEscrow: string;
};

/**
 * Read a settled Philoxenia escrow payment from a tx (no client booking id required).
 */
export async function inspectEscrowSettledTx(
  txHash: string
): Promise<InspectedEscrowPayment> {
  const normalized = normalizeTxHash(txHash);
  const provider = getRpcProvider();
  let receipt: Awaited<ReturnType<typeof provider.getTransactionReceipt>>;
  try {
    receipt = await provider.getTransactionReceipt(normalized);
  } catch {
    throw new Error(
      "Transaction not found on Starknet yet — wait for confirmation and retry"
    );
  }

  const exec =
    (receipt as { execution_status?: string }).execution_status ??
    (receipt as { status?: string }).status ??
    "";
  if (!receiptSucceeded(receipt as { execution_status?: string }) && exec) {
    throw new Error(`Transaction did not succeed (status: ${exec})`);
  }

  const events =
    (
      receipt as {
        events?: Array<{ from_address: string; keys: string[]; data: string[] }>;
      }
    ).events ?? [];

  const allowed = new Set(
    [...escrowAddressesForAsset("STRK"), ...escrowAddressesForAsset("DAI")].map(
      normalizeFeltAddress
    )
  );
  const daiEscrow = normalizeFeltAddress(MAINNET_DAI_ESCROW);
  const strkEscrow = normalizeFeltAddress(MAINNET_STRK_ESCROW);

  let settled: { from: string; bookingId: bigint; asset: "STRK" | "DAI" } | null =
    null;
  for (const ev of events) {
    const from = normalizeFeltAddress(ev.from_address);
    if (!allowed.has(from)) continue;
    if (!ev.keys?.length) continue;
    const selector = num.toHex(BigInt(ev.keys[0]));
    if (!feltEq(selector, BOOKING_SETTLED)) continue;
    const id = u256FromData(ev.data ?? [], 0);
    if (id == null) continue;
    settled = {
      from,
      bookingId: id,
      asset: from === daiEscrow ? "DAI" : "STRK",
    };
    if (from === strkEscrow) settled.asset = "STRK";
    break;
  }

  if (!settled) {
    throw new Error(
      "Tx has no BookingSettled event on the Philoxenia escrow"
    );
  }

  const raw = await provider.callContract({
    contractAddress: settled.from,
    entrypoint: "get_booking",
    calldata: CallData.compile({
      booking_id: cairo.uint256(settled.bookingId),
    }),
  });
  const r = Array.isArray(raw) ? raw : (raw as { result?: string[] }).result;
  if (!r || r.length < 19) {
    throw new Error("Could not read on-chain booking from escrow");
  }

  const listingOnChainId = BigInt(r[2]) + (BigInt(r[3]) << 128n);
  const total = BigInt(r[7]) + (BigInt(r[8]) << 128n);
  const hostAmt = BigInt(r[9]) + (BigInt(r[10]) << 128n);
  const connectorAmt = BigInt(r[11]) + (BigInt(r[12]) << 128n);
  const protocolAmt = BigInt(r[13]) + (BigInt(r[14]) << 128n);
  const settledFlag = r[17] === "0x1" || r[17] === "1";
  if (!settledFlag) {
    throw new Error("On-chain booking is not settled");
  }

  return {
    txHash: normalized,
    paymentAsset: settled.asset,
    escrowBookingId: settled.bookingId.toString(),
    listingOnChainId: listingOnChainId.toString(),
    guest: r[5],
    host: r[4],
    totalAmount: weiToTokenAmount(total),
    hostAmount: weiToTokenAmount(hostAmt),
    connectorAmount: weiToTokenAmount(connectorAmt),
    protocolAmount: weiToTokenAmount(protocolAmt),
    fromEscrow: settled.from,
  };
}

/** Known settled pays that never got a DB row. */
export const SEEDED_SETTLED_TXS = [
  "0x05bac436e2a9775719de94e0ec1ea62f1cbc9737b23dd780230df66a53cc7813",
  "0x04902a7a2702b9533cf8992f5bf6953947e0d9616f8dbc9bc5b1976e0082f494",
];
const SEEDED_GUEST =
  "0x04912f27036fd23f51cb9cfe719ea0d875bfc462b5f2af8f110a3b1832bb2f59";

/**
 * Recent BookingSettled txs — seeded orphans only (no event scan; that timed out GET /bookings).
 */
export async function listSettledEscrowTxHashes(
  guestWallet?: string
): Promise<string[]> {
  const found = new Map<string, string>();
  const add = (hash: string) => {
    try {
      const n = normalizeTxHash(hash);
      found.set(BigInt(n).toString(), n);
    } catch {
      // skip
    }
  };
  if (!guestWallet || feltEq(guestWallet, SEEDED_GUEST)) {
    for (const h of SEEDED_SETTLED_TXS) add(h);
  }
  return [...found.values()];
}
