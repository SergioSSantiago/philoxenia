import { Call, CallData, uint256 } from "starknet";
import { callContract } from "@/lib/payments/rpc-call";
import { STRK_TOKEN_ADDRESS, XSTRK_TOKEN_ADDRESS } from "@/lib/tokens";
import { formatTokenBalance } from "@/lib/payments/strk20-actions";

const ENDUR_STATS_URL = "https://app.endur.fi/api/lst/stats";

function parseAmount(amount: string): bigint {
  const [whole, frac = ""] = amount.trim().split(".");
  if (!/^\d+$/.test(whole) || (frac && !/^\d+$/.test(frac))) {
    throw new Error("Enter a valid STRK amount");
  }
  const padded = frac.padEnd(18, "0").slice(0, 18);
  return BigInt(whole + padded);
}

function toUint256Calldata(value: bigint): string[] {
  const u = uint256.bnToUint256(value);
  return [u.low.toString(), u.high.toString()];
}

function readUint256Calldata(values: string[]): bigint {
  return BigInt(values[0] ?? "0") + (BigInt(values[1] ?? "0") << 128n);
}

export type EndurStrkStats = {
  apy: number;
  apyLabel: string;
  tvlUsd: number;
};

export async function fetchEndurStrkStats(): Promise<EndurStrkStats | null> {
  try {
    const res = await fetch(ENDUR_STATS_URL);
    if (!res.ok) return null;
    const raw = (await res.json()) as unknown;
    if (!Array.isArray(raw)) return null;
    const item = raw.find(
      (row) =>
        row &&
        typeof row === "object" &&
        String((row as { asset?: string }).asset).toUpperCase() === "STRK"
    ) as
      | {
          apy?: number;
          apyInPercentage?: string;
          tvlUsd?: number;
        }
      | undefined;
    if (!item || typeof item.apy !== "number") return null;
    return {
      apy: item.apy,
      apyLabel: item.apyInPercentage ?? `${(item.apy * 100).toFixed(2)}%`,
      tvlUsd: typeof item.tvlUsd === "number" ? item.tvlUsd : 0,
    };
  } catch {
    return null;
  }
}

export async function getPublicTokenBalance(
  tokenAddress: string,
  owner: string
): Promise<string> {
  const balance = await callContract({
    contractAddress: tokenAddress,
    entrypoint: "balanceOf",
    calldata: [owner],
  });
  return formatTokenBalance(readUint256Calldata(balance));
}

export async function previewXstrkFromStrk(strkAmount: string): Promise<string> {
  const assets = parseAmount(strkAmount);
  const shares = await callContract({
    contractAddress: XSTRK_TOKEN_ADDRESS,
    entrypoint: "preview_deposit",
    calldata: toUint256Calldata(assets),
  });
  return formatTokenBalance(readUint256Calldata(shares));
}

export async function previewStrkFromXstrk(
  xstrkAmount: string
): Promise<string> {
  const shares = parseAmount(xstrkAmount);
  const assets = await callContract({
    contractAddress: XSTRK_TOKEN_ADDRESS,
    entrypoint: "preview_redeem",
    calldata: toUint256Calldata(shares),
  });
  return formatTokenBalance(readUint256Calldata(assets));
}

export function buildStakeStrkCalls(
  ownerAddress: string,
  strkAmount: string
): Call[] {
  const assets = parseAmount(strkAmount);
  return [
    {
      contractAddress: STRK_TOKEN_ADDRESS,
      entrypoint: "approve",
      calldata: [XSTRK_TOKEN_ADDRESS, ...toUint256Calldata(assets)],
    },
    {
      contractAddress: XSTRK_TOKEN_ADDRESS,
      entrypoint: "deposit",
      calldata: CallData.compile([
        uint256.bnToUint256(assets),
        ownerAddress,
      ]),
    },
  ];
}

export function buildRedeemXstrkCalls(
  ownerAddress: string,
  xstrkAmount: string
): Call[] {
  const shares = parseAmount(xstrkAmount);
  return [
    {
      contractAddress: XSTRK_TOKEN_ADDRESS,
      entrypoint: "redeem",
      calldata: CallData.compile([
        uint256.bnToUint256(shares),
        ownerAddress,
        ownerAddress,
      ]),
    },
  ];
}
