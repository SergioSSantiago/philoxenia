import type { AccountInterface, Call } from "starknet";
import { uint256 } from "starknet";
import type { PaymentAsset } from "@philoxenia/shared";
import { tokenAddressForAsset } from "@/lib/tokens";

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
