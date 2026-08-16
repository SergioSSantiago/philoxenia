import type { AccountInterface, Call, STRK20_ACTION } from "starknet";
import { uint256 } from "starknet";
import type { PaymentAsset } from "@philoxenia/shared";
import { tokenAddressForAsset } from "@/lib/tokens";
import { resolvePrivacyWallet } from "@/lib/payments/wallet-account-v6";
import { toWalletFelt } from "@/lib/payments/private-escrow-fund";

function parseAmount(amount: string): bigint {
  const [whole, frac = ""] = amount.trim().split(".");
  if (!/^\d+$/.test(whole) || (frac && !/^\d+$/.test(frac))) {
    throw new Error("Invalid amount");
  }
  const padded = frac.padEnd(18, "0").slice(0, 18);
  return BigInt(whole + padded);
}

/** Public ERC-20 transfer to a friend's wallet (chat peer payment). */
export async function transferToFriend(
  account: AccountInterface,
  recipientAddress: string,
  amount: string,
  asset: PaymentAsset
): Promise<string> {
  const value = parseAmount(amount);
  if (value <= 0n) throw new Error("Amount must be greater than zero");

  const u = uint256.bnToUint256(value);
  const call: Call = {
    contractAddress: tokenAddressForAsset(asset),
    entrypoint: "transfer",
    calldata: [recipientAddress, u.low.toString(), u.high.toString()],
  };

  const result = await account.execute([call]);
  return result.transaction_hash;
}

/**
 * Private STRK20 transfer from shielded balance to a friend's address.
 * Requires Ready wallet API ≥ 0.10; recipient should be able to discover notes
 * with their viewing key (Ready handles note encryption).
 */
export async function transferToFriendPrivate(
  account: AccountInterface,
  recipientAddress: string,
  amount: string,
  asset: PaymentAsset
): Promise<string> {
  const value = parseAmount(amount);
  if (value <= 0n) throw new Error("Amount must be greater than zero");

  const session = await resolvePrivacyWallet(account.address);
  if (!session?.privacyCapable) {
    throw new Error(
      "Private send needs Ready X with Smart Wallet + Private (wallet API ≥ 0.10). Or choose Public."
    );
  }

  const token = toWalletFelt(tokenAddressForAsset(asset));
  const actions: STRK20_ACTION[] = [
    {
      type: "transfer",
      token,
      amount: toWalletFelt(value),
      recipient: toWalletFelt(recipientAddress),
    },
  ];

  const result = await session.account.strk20InvokeTransaction(actions);
  return result.transaction_hash;
}
