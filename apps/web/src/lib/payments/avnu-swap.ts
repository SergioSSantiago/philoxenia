import {
  createStrk20WalletProver,
  executePrivateSwap,
  executeSwap,
  getQuotes,
  PRIVACY_POOL_ADDRESS,
  type Quote,
} from "@avnu/avnu-sdk";
import type { AccountInterface } from "starknet";
import type { PaymentAsset } from "@philoxenia/shared";
import {
  getAvnuClientOptions,
  getAvnuSwapPaymasterParams,
} from "@/lib/avnu/client";
import { tokenAddressForAsset } from "@/lib/tokens";
import { resolvePrivacyWallet } from "@/lib/payments/wallet-account-v6";

const SLIPPAGE = 0.01; // 1%
const DECIMALS = 18n;
const SCALE = 10n ** DECIMALS;

export function parseSwapAmount(amount: string): bigint {
  const trimmed = amount.trim();
  if (!trimmed) throw new Error("Enter a STRK or DAI amount");
  const [whole, frac = ""] = trimmed.split(".");
  if (!/^\d+$/.test(whole) || (frac && !/^\d+$/.test(frac))) {
    throw new Error("Enter a valid STRK or DAI amount");
  }
  const padded = frac.padEnd(18, "0").slice(0, 18);
  const value = BigInt(whole + padded);
  if (value <= 0n) throw new Error("Amount of STRK or DAI must be greater than zero");
  return value;
}

export function formatSwapAmount(value: bigint, maxFrac = 6): string {
  const whole = value / SCALE;
  const frac = (value % SCALE).toString().padStart(18, "0").slice(0, maxFrac);
  const trimmed = frac.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole.toString();
}

export async function quoteAvnuSwap(input: {
  sellAsset: PaymentAsset;
  buyAsset: PaymentAsset;
  sellAmount: string;
  takerAddress: string;
}): Promise<Quote> {
  if (input.sellAsset === input.buyAsset) {
    throw new Error("Choose different tokens to swap STRK ↔ DAI");
  }
  const sellAmount = parseSwapAmount(input.sellAmount);
  const quotes = await getQuotes(
    {
      sellTokenAddress: tokenAddressForAsset(input.sellAsset),
      buyTokenAddress: tokenAddressForAsset(input.buyAsset),
      sellAmount,
      takerAddress: input.takerAddress,
      size: 1,
      integratorName: "Philoxenia",
    },
    getAvnuClientOptions()
  );
  const quote = quotes[0];
  if (!quote) throw new Error("No AVNU route to swap STRK ↔ DAI right now");
  return quote;
}

export async function executeAvnuSwap(input: {
  account: AccountInterface;
  quote: Quote;
}): Promise<{ transactionHash: string }> {
  const paymaster = getAvnuSwapPaymasterParams();
  const result = await executeSwap(
    {
      provider: input.account,
      quote: input.quote,
      slippage: SLIPPAGE,
      executeApprove: true,
      ...(paymaster ? { paymaster } : {}),
    },
    getAvnuClientOptions()
  );
  return { transactionHash: result.transactionHash };
}

/**
 * Private STRK ↔ DAI swap inside the STRK20 pool via AVNU (no app anonymizer).
 * Sell token must already be shielded on Ready X.
 *
 * @see https://strk20-by-example.org/starknet-wallet-api/avnu-private-swaps
 */
export async function executeAvnuPrivateSwap(input: {
  walletAddress: string;
  quote: Quote;
}): Promise<{ transactionHash: string }> {
  const session = await resolvePrivacyWallet(input.walletAddress);
  if (!session?.privacyCapable) {
    throw new Error(
      "Private swap needs Ready X with STRK20 (wallet API ≥ 0.10). Shield the sell token on Ready X first."
    );
  }

  const prover = createStrk20WalletProver(session.account);
  const result = await executePrivateSwap(
    {
      quote: input.quote,
      slippage: SLIPPAGE,
      takerAddress: input.walletAddress,
      poolAddress: PRIVACY_POOL_ADDRESS,
      feeMode: { poolFeeToken: input.quote.sellTokenAddress },
      prover,
    },
    getAvnuClientOptions()
  );
  return { transactionHash: result.transactionHash };
}

export { SLIPPAGE as AVNU_SWAP_SLIPPAGE };
