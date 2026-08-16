/**
 * Optional Phase B: post a sealed-payload hash via the privacy pool → MessageMailbox.
 * When NEXT_PUBLIC_MESSAGE_MAILBOX_ADDRESS is unset, helpers no-op.
 *
 * Full viewing-key discovery remains Phase C.
 */

import { hash, type STRK20_ACTION, type WalletAccountV6 } from "starknet";
import { toWalletCalldata, toWalletFelt } from "@/lib/payments/private-escrow-fund";

export const STRK20_PRIVACY_POOL_MAINNET =
  "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a";

export function messageMailboxAddress(): string | null {
  const a =
    process.env.NEXT_PUBLIC_MESSAGE_MAILBOX_ADDRESS?.trim() ||
    "0x00db59cc85293629eacd959ea17faaa13c6e9116afa68274c465738692e53691";
  return a || null;
}

/** Deterministic channel id from two wallet addresses (unordered). */
export function channelIdForPair(a: string, b: string): string {
  const [x, y] = [a.toLowerCase(), b.toLowerCase()].sort();
  return toWalletFelt(hash.starknetKeccak(`${x}:${y}`));
}

function payloadHashFromSealed(sealed: string): string {
  return toWalletFelt(hash.starknetKeccak(sealed));
}

/**
 * Best-effort on-chain commit. Never throws — sealed API delivery already succeeded.
 * Requires Ready Wallet API ≥ 0.10 and a deployed MessageMailbox.
 */
export async function tryPostSealedOnChain(opts: {
  account: WalletAccountV6;
  myWallet: string;
  friendWallet: string;
  sealedBody: string;
}): Promise<{ txHash?: string; skipped: boolean; reason?: string }> {
  const mailbox = messageMailboxAddress();
  if (!mailbox) {
    return { skipped: true, reason: "mailbox not configured" };
  }

  const channelId = channelIdForPair(opts.myWallet, opts.friendWallet);
  const payloadHash = payloadHashFromSealed(opts.sealedBody);
  const contract = toWalletFelt(mailbox);

  const actions: STRK20_ACTION[] = [
    {
      type: "invoke",
      contract,
      calldata: toWalletCalldata([channelId, payloadHash, 1, 0]),
    },
  ];

  try {
    const result = await opts.account.strk20InvokeTransaction(actions);
    return { txHash: result.transaction_hash, skipped: false };
  } catch (err) {
    return {
      skipped: true,
      reason: err instanceof Error ? err.message : "on-chain post failed",
    };
  }
}
