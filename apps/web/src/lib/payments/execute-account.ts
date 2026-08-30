import { WalletAccountV6, type AccountInterface, type Call } from "starknet";
import {
  getPaymasterProvider,
  isSponsoredGasEnabled,
} from "@/lib/payments/paymaster";
import { createReadProvider } from "@/lib/payments/rpc-call";
import { resolvePrivacyWallet } from "@/lib/payments/wallet-account-v6";

export type ExecuteAccountOptions = {
  /** When true, do not fall back to self-paid gas if sponsorship fails. */
  requireSponsored?: boolean;
};

type PaymasterExecuteAccount = AccountInterface & {
  executePaymasterTransaction: (
    calls: Call[],
    paymasterDetails: {
      version: "0x1";
      feeMode: { mode: "sponsored" };
    }
  ) => Promise<{ transaction_hash: string }>;
};

/**
 * Execute wallet calls, preferring sponsored gas (AVNU paymaster via /api/paymaster)
 * when enabled. Falls back to user-paid gas unless requireSponsored is set.
 */
export async function executeAccountCalls(
  account: AccountInterface,
  calls: Call | Call[],
  options?: ExecuteAccountOptions
): Promise<{ transaction_hash: string }> {
  const callList = Array.isArray(calls) ? calls : [calls];

  if (!isSponsoredGasEnabled()) {
    return account.execute(callList);
  }

  try {
    const session = await resolvePrivacyWallet(account.address);
    if (!session) {
      throw new Error("Ready X session unavailable for sponsored gas");
    }

    const sponsoredAccount = (await WalletAccountV6.connect(
      createReadProvider(),
      session.wallet,
      undefined,
      getPaymasterProvider()
    )) as PaymasterExecuteAccount;

    return await sponsoredAccount.executePaymasterTransaction(callList, {
      version: "0x1",
      feeMode: { mode: "sponsored" },
    });
  } catch (err) {
    if (options?.requireSponsored) throw err;
    return account.execute(callList);
  }
}
