import { CallData, cairo, hash, uint256, type Call, type STRK20_ACTION } from "starknet";
import { percentToBps } from "@philoxenia/shared";
import { callContract } from "./rpc-call";
import type { FundBookingParams } from "./payment-provider";
import type { WalletAccountV6 } from "starknet";

/** Mainnet shadow-account anonymizer (Starknet Privacy infra — not Philoxenia-owned). */
export const SHADOW_ACCOUNT_ANONYMIZER_MAINNET =
  process.env.NEXT_PUBLIC_SHADOW_ACCOUNT_ANONYMIZER ??
  "0x04f33230dc57855c6e7eabe66dfa0fde82c5458fd0e54827cdb7cb4c474888a7";

export const PHILOXENIA_STRK20_DAPP_NAME = "philoxenia";
export const PHILOXENIA_SHADOW_NONCE = "0x0";

/** Optional team-deployed BookingEscrow anonymizer (privacy_invoke). */
export function bookingAnonymizerAddress(): string | null {
  const a =
    process.env.NEXT_PUBLIC_BOOKING_ANONYMIZER_ADDRESS?.trim() ||
    "0x056a817104ad7544a55873584f3d8fb41a780e5466d152b3e1f12d578e75defb";
  return a || null;
}

function parseAmount(amount: string): bigint {
  const [whole, frac = ""] = amount.trim().split(".");
  const padded = frac.padEnd(18, "0").slice(0, 18);
  return BigInt(whole + padded);
}

/**
 * Wallet API FELTs must be 0x-hex. CallData.compile returns decimal strings,
 * which Ready rejects as INVALID_REQUEST_PAYLOAD.
 */
export function toWalletFelt(value: string | number | bigint): string {
  if (typeof value === "string" && value.startsWith("${")) return value;
  return `0x${BigInt(value).toString(16)}`;
}

export function toWalletCalldata(
  items: ReadonlyArray<string | number | bigint>
): string[] {
  return items.map(toWalletFelt);
}

function toUint256Parts(value: bigint): { low: string; high: string } {
  const u = uint256.bnToUint256(value);
  return {
    low: toWalletFelt(u.low.toString()),
    high: toWalletFelt(u.high.toString()),
  };
}

let cachedClassHash: string | null = null;

async function shadowAccountClassHash(): Promise<string> {
  if (cachedClassHash) return cachedClassHash;
  const result = await callContract({
    contractAddress: SHADOW_ACCOUNT_ANONYMIZER_MAINNET,
    entrypoint: "get_shadow_account_class_hash",
    calldata: [],
  });
  cachedClassHash = result[0];
  return cachedClassHash;
}

/**
 * Deterministic shadow account address for this dapp + nonce.
 * @see https://starknet-js.com/docs/next/guides/account/walletAccount
 */
export async function resolveShadowAccountAddress(
  walletAccount: WalletAccountV6
): Promise<string> {
  const commitment = await walletAccount.strk20ShadowAccountCommitment(
    PHILOXENIA_STRK20_DAPP_NAME,
    PHILOXENIA_SHADOW_NONCE
  );
  const classHash = await shadowAccountClassHash();
  return hash.calculateContractAddressFromHash(
    commitment,
    classHash,
    [],
    SHADOW_ACCOUNT_ANONYMIZER_MAINNET
  );
}

function escrowFundCalls(params: FundBookingParams, amount: bigint): Call[] {
  const bookingId = BigInt(params.onChainBookingId);
  const listingId = BigInt(params.onChainListingId);
  const rewardBps = percentToBps(params.connectorRewardPercent);
  const connector =
    params.connectorAddress && params.connectorRewardPercent > 0
      ? params.connectorAddress
      : "0x0";
  const { low, high } = toUint256Parts(amount);

  return [
    {
      contractAddress: params.tokenAddress,
      entrypoint: "approve",
      calldata: [toWalletFelt(params.escrowAddress), low, high],
    },
    {
      contractAddress: params.escrowAddress,
      entrypoint: "create_booking",
      calldata: toWalletCalldata(
        CallData.compile({
          booking_id: cairo.uint256(bookingId),
          listing_id: cairo.uint256(listingId),
          host: params.hostAddress,
          guest: params.guestAddress,
          connector,
          total_amount: cairo.uint256(amount),
          connector_reward_bps: rewardBps,
        })
      ),
    },
    {
      contractAddress: params.escrowAddress,
      entrypoint: "fund_booking",
      calldata: toWalletCalldata(
        CallData.compile({
          booking_id: cairo.uint256(bookingId),
        })
      ),
    },
    {
      contractAddress: params.escrowAddress,
      entrypoint: "settle_booking",
      calldata: toWalletCalldata(
        CallData.compile({
          booking_id: cairo.uint256(bookingId),
        })
      ),
    },
  ];
}

/**
 * Fund escrow from shielded balance via the user's Philoxenia shadow account.
 * Hides the main wallet as tx payer; guest/host/amounts remain in escrow storage.
 */
export async function fundBookingViaShadowAccount(
  walletAccount: WalletAccountV6,
  params: FundBookingParams
): Promise<{ transaction_hash: string }> {
  const amount = parseAmount(params.amount);
  const shadow = await resolveShadowAccountAddress(walletAccount);
  const hexAmount = `0x${amount.toString(16)}`;

  const actions: STRK20_ACTION[] = [
    {
      type: "withdraw",
      token: toWalletFelt(params.tokenAddress),
      amount: hexAmount,
      recipient: toWalletFelt(shadow),
    },
    {
      type: "transfer",
      token: toWalletFelt(params.tokenAddress),
      amount: "OPEN",
      recipient: toWalletFelt(params.guestAddress),
    },
    {
      type: "shadow_account_invoke",
      dapp_name: PHILOXENIA_STRK20_DAPP_NAME,
      nonce: PHILOXENIA_SHADOW_NONCE,
      calls: escrowFundCalls(params, amount),
      collect_policy: { type: "diff" },
    },
  ];

  return walletAccount.strk20InvokeTransaction(actions);
}

/**
 * Fund escrow from shielded balance via team BookingEscrowAnonymizer.
 * Observers see pool ↔ anonymizer; guest/host/amounts remain in escrow storage.
 *
 * Wallet API / pool shape for full-consume settle (no leftover):
 * 1. `withdraw` to the anonymizer — pool sends `total_amount` publicly
 * 2. `invoke` anonymizer `privacy_invoke` (returns empty OpenNoteDeposit span)
 *
 * Do **not** create an `OPEN` note here. The pool asserts
 * `UNDEPOSITED_OPEN_NOTES == 0` at tx end, and rejects zero-amount deposits —
 * so OPEN + empty leftover always reverts (Paymaster error 156).
 *
 * @see https://github.com/starkware-libs/starknet-privacy/blob/main/packages/privacy/src/privacy.cairo
 * @see https://strk20-by-example.org/helpers/escrow (Deposit returns empty span, no OPEN)
 */
export async function fundBookingViaAnonymizer(
  walletAccount: WalletAccountV6,
  params: FundBookingParams,
  anonymizer: string
): Promise<{ transaction_hash: string }> {
  const amount = parseAmount(params.amount);
  const hexAmount = toWalletFelt(amount);
  const bookingId = BigInt(params.onChainBookingId);
  const listingId = BigInt(params.onChainListingId);
  const rewardBps = percentToBps(params.connectorRewardPercent);
  const connector =
    params.connectorAddress && params.connectorRewardPercent > 0
      ? params.connectorAddress
      : "0x0";
  const anon = toWalletFelt(anonymizer);
  const token = toWalletFelt(params.tokenAddress);

  const actions: STRK20_ACTION[] = [
    {
      type: "withdraw",
      token,
      amount: hexAmount,
      recipient: anon,
    },
    {
      type: "invoke",
      contract: anon,
      // note_id unused when leftover is zero (empty deposit span).
      calldata: toWalletCalldata([
        ...CallData.compile({
          escrow: params.escrowAddress,
          token: params.tokenAddress,
          booking_id: cairo.uint256(bookingId),
          listing_id: cairo.uint256(listingId),
          host: params.hostAddress,
          guest: params.guestAddress,
          connector,
          total_amount: cairo.uint256(amount),
          connector_reward_bps: rewardBps,
        }),
        "0x0",
      ]),
    },
  ];

  return walletAccount.strk20InvokeTransaction(actions);
}

