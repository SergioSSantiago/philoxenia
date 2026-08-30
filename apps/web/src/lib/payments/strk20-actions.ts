import type { AccountInterface, STRK20_ACTION } from "starknet";
import {
  detectPrivacyCapable,
  resolvePrivacyWallet,
} from "./wallet-account-v6";

function parseAmount(amount: string): bigint {
  const [whole, frac = ""] = amount.trim().split(".");
  if (!/^\d+$/.test(whole) || (frac && !/^\d+$/.test(frac))) {
    throw new Error("Enter a valid token amount");
  }
  const padded = frac.padEnd(18, "0").slice(0, 18);
  return BigInt(whole + padded);
}

function toHexAmount(amount: string): string {
  const value = parseAmount(amount);
  if (value <= 0n) throw new Error("Amount must be greater than zero");
  return `0x${value.toString(16)}`;
}

export function formatTokenBalance(
  raw: string | number | bigint,
  decimals = 18
): string {
  try {
    const n = typeof raw === "bigint" ? raw : BigInt(raw);
    const scale = 10n ** BigInt(decimals);
    const whole = n / scale;
    const frac = (n % scale).toString().padStart(decimals, "0").slice(0, 4);
    return `${whole}.${frac}`.replace(/\.?0+$/, "") || "0";
  } catch {
    return String(raw);
  }
}

export async function getShieldedTokenBalance(
  account: AccountInterface,
  tokenAddress: string
): Promise<string | null> {
  const supported = await detectPrivacyCapable(account.address);
  if (!supported) return null;

  const session = await resolvePrivacyWallet(account.address);
  if (!session?.privacyCapable) return null;

  try {
    const entries = await session.account.strk20Balances([tokenAddress]);
    const entry = entries.find((e) => {
      try {
        return BigInt(e.token) === BigInt(tokenAddress);
      } catch {
        return false;
      }
    });
    if (!entry) return "0";
    return formatTokenBalance(entry.balance as string | number | bigint);
  } catch {
    return null;
  }
}

export async function shieldToken(
  account: AccountInterface,
  tokenAddress: string,
  amount: string
): Promise<{ txHash: string }> {
  const session = await resolvePrivacyWallet(account.address);
  if (!session?.privacyCapable) {
    throw new Error(
      "Ready X with STRK20 (wallet API ≥ 0.10) is required to shield"
    );
  }

  const actions: STRK20_ACTION[] = [
    {
      type: "deposit",
      token: tokenAddress,
      amount: toHexAmount(amount),
    },
  ];

  const result = await session.account.strk20InvokeTransaction(actions);
  return { txHash: result.transaction_hash };
}

export async function unshieldToken(
  account: AccountInterface,
  tokenAddress: string,
  amount: string,
  recipient: string
): Promise<{ txHash: string }> {
  const session = await resolvePrivacyWallet(account.address);
  if (!session?.privacyCapable) {
    throw new Error(
      "Ready X with STRK20 (wallet API ≥ 0.10) is required to unshield"
    );
  }

  const actions: STRK20_ACTION[] = [
    {
      type: "withdraw",
      token: tokenAddress,
      amount: toHexAmount(amount),
      recipient,
    },
  ];

  const result = await session.account.strk20InvokeTransaction(actions);
  return { txHash: result.transaction_hash };
}
