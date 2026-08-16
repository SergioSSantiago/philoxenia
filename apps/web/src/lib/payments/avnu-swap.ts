import {
  executeSwap,
  getQuotes,
  type Quote,
} from "@avnu/avnu-sdk";
import type { AccountInterface } from "starknet";
import type { PaymentAsset } from "@philoxenia/shared";
import { tokenAddressForAsset } from "@/lib/tokens";

const SLIPPAGE = 0.01; // 1%
const DECIMALS = 18n;
const SCALE = 10n ** DECIMALS;

export function parseSwapAmount(amount: string): bigint {
  const trimmed = amount.trim();
  if (!trimmed) throw new Error("Enter an amount");
  const [whole, frac = ""] = trimmed.split(".");
  if (!/^\d+$/.test(whole) || (frac && !/^\d+$/.test(frac))) {
    throw new Error("Invalid amount");
  }
  const padded = frac.padEnd(18, "0").slice(0, 18);
  const value = BigInt(whole + padded);
  if (value <= 0n) throw new Error("Amount must be greater than zero");
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
    throw new Error("Choose different tokens to swap");
  }
  const sellAmount = parseSwapAmount(input.sellAmount);
  const quotes = await getQuotes({
    sellTokenAddress: tokenAddressForAsset(input.sellAsset),
    buyTokenAddress: tokenAddressForAsset(input.buyAsset),
    sellAmount,
    takerAddress: input.takerAddress,
    size: 1,
    integratorName: "Philoxenia",
  });
  const quote = quotes[0];
  if (!quote) throw new Error("No AVNU route for this swap right now");
  return quote;
}

export async function executeAvnuSwap(input: {
  account: AccountInterface;
  quote: Quote;
}): Promise<{ transactionHash: string }> {
  const result = await executeSwap({
    provider: input.account,
    quote: input.quote,
    slippage: SLIPPAGE,
    executeApprove: true,
  });
  return { transactionHash: result.transactionHash };
}

export { SLIPPAGE as AVNU_SWAP_SLIPPAGE };
