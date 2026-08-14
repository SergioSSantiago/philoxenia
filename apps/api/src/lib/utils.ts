import { randomBytes } from "node:crypto";

export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function normalizeWalletAddress(address: string): string {
  return address.toLowerCase();
}

export function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function calculateBookingAmounts(
  pricePerNight: string,
  nights: number,
  connectorRewardPercent: number
): {
  totalPrice: string;
  connectorRewardAmount: string;
  hostAmount: string;
} {
  const price = BigInt(Math.round(parseFloat(pricePerNight) * 1e18));
  const total = price * BigInt(nights);
  const connectorReward =
    (total * BigInt(connectorRewardPercent)) / BigInt(100);
  const hostAmount = total - connectorReward;

  const format = (value: bigint) =>
    (Number(value) / 1e18).toFixed(18).replace(/\.?0+$/, "");

  return {
    totalPrice: format(total),
    connectorRewardAmount: format(connectorReward),
    hostAmount: format(hostAmount),
  };
}

export function daysBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
