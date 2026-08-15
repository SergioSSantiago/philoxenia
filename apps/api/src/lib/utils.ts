import { randomBytes } from "node:crypto";
import { PROTOCOL_FEE_PERCENT_OF_CONNECTOR } from "@philoxenia/shared";

export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function normalizeWalletAddress(address: string): string {
  return address.toLowerCase();
}

export function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/**
 * Split booking amounts.
 * - With connector: host gets remainder; connector gets reward minus protocol take;
 *   protocol gets PROTOCOL_FEE_PERCENT_OF_CONNECTOR % of the connector reward.
 * - Without connector: host gets 100%; protocol 0.
 */
export function calculateBookingAmounts(
  pricePerNight: string,
  nights: number,
  connectorRewardPercent: number,
  hasConnector: boolean
): {
  totalPrice: string;
  connectorRewardAmount: string;
  protocolFeeAmount: string;
  protocolFeePercent: number;
  hostAmount: string;
  connectorRewardPercentApplied: number;
} {
  const price = BigInt(Math.round(parseFloat(pricePerNight) * 1e18));
  const total = price * BigInt(nights);
  return splitTotalAmount(
    total,
    connectorRewardPercent,
    hasConnector
  );
}

/** Split an already-summed total (e.g. sum of per-night prices). */
export function splitBookingTotal(
  totalPrice: string,
  connectorRewardPercent: number,
  hasConnector: boolean
) {
  const total = BigInt(Math.round(parseFloat(totalPrice) * 1e18));
  return splitTotalAmount(total, connectorRewardPercent, hasConnector);
}

function splitTotalAmount(
  total: bigint,
  connectorRewardPercent: number,
  hasConnector: boolean
) {
  const format = (value: bigint) =>
    (Number(value) / 1e18).toFixed(18).replace(/\.?0+$/, "");

  if (!hasConnector || connectorRewardPercent <= 0) {
    return {
      totalPrice: format(total),
      connectorRewardAmount: "0",
      protocolFeeAmount: "0",
      protocolFeePercent: 0,
      hostAmount: format(total),
      connectorRewardPercentApplied: 0,
    };
  }

  const connectorGross =
    (total * BigInt(connectorRewardPercent)) / BigInt(100);
  const protocolFee =
    (connectorGross * BigInt(PROTOCOL_FEE_PERCENT_OF_CONNECTOR)) / BigInt(100);
  const connectorNet = connectorGross - protocolFee;
  const hostAmount = total - connectorGross;

  return {
    totalPrice: format(total),
    connectorRewardAmount: format(connectorNet),
    protocolFeeAmount: format(protocolFee),
    protocolFeePercent: PROTOCOL_FEE_PERCENT_OF_CONNECTOR,
    hostAmount: format(hostAmount),
    connectorRewardPercentApplied: connectorRewardPercent,
  };
}

export function daysBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
