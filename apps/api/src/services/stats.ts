import { count, eq, gte, inArray, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export type NetworkStats = {
  users: number;
  countries: number;
  listingsOpen: number;
  nightsBooked: number;
  transferredDai: string;
  transferredStrk: string;
  updatedAt: string;
};

let cached: { at: number; data: NetworkStats } | null = null;
const CACHE_MS = 15_000;

/** Last comma segment of a Nominatim-style address ≈ country. */
export function countryFromLocation(location: string): string | null {
  const parts = location
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  let country = parts[parts.length - 1];
  // Prefer previous segment if last looks like a postal code
  if (/^[\dA-Z]{2,}[\d\s-]*$/i.test(country) && parts.length > 1) {
    country = parts[parts.length - 2];
  }
  const key = country.toLowerCase();
  if (key.length < 2) return null;
  return key;
}

function normalizeAmount(value: string | null | undefined): string {
  if (!value) return "0";
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "0";
  return n.toFixed(8).replace(/\.?0+$/, "") || "0";
}

export async function getNetworkStats(): Promise<NetworkStats> {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_MS) {
    return cached.data;
  }

  const [userRow] = await db
    .select({ value: count() })
    .from(schema.users);

  const listingRows = await db
    .select({ location: schema.listings.location })
    .from(schema.listings);

  const countries = new Set<string>();
  for (const row of listingRows) {
    const c = countryFromLocation(row.location);
    if (c) countries.add(c);
  }

  // Listings with at least one future (or today) open night in inventory
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayStart = new Date(`${todayKey}T00:00:00.000Z`);
  const openDayRows = await db
    .select({
      listingId: schema.listingAvailableDays.listingId,
    })
    .from(schema.listingAvailableDays)
    .where(gte(schema.listingAvailableDays.day, todayStart));
  const listingsOpen = new Set(openDayRows.map((r) => r.listingId)).size;

  // Paid stay nights (fund / confirm / complete)
  const [nightsRow] = await db
    .select({
      value: sql<string>`coalesce(sum(${schema.bookings.nights}), 0)`,
    })
    .from(schema.bookings)
    .where(
      inArray(schema.bookings.status, [
        "funded",
        "confirmed",
        "completed",
      ])
    );
  const nightsBooked = Math.max(0, Math.floor(Number(nightsRow?.value ?? 0)));

  // Confirmed on-chain booking payments (actual transferred amounts)
  const paid = await db
    .select({
      asset: schema.payments.asset,
      total: sql<string>`coalesce(sum(${schema.payments.amount}), 0)`,
    })
    .from(schema.payments)
    .where(eq(schema.payments.status, "confirmed"))
    .groupBy(schema.payments.asset);

  // Fallback: completed/funded bookings if payments table empty for some rows
  const bookingSums = await db
    .select({
      asset: schema.bookings.paymentAsset,
      total: sql<string>`coalesce(sum(${schema.bookings.totalPrice}), 0)`,
    })
    .from(schema.bookings)
    .where(
      inArray(schema.bookings.status, [
        "funded",
        "confirmed",
        "completed",
      ])
    )
    .groupBy(schema.bookings.paymentAsset);

  const fromPayments = {
    DAI: "0",
    STRK: "0",
  };
  for (const row of paid) {
    fromPayments[row.asset] = normalizeAmount(row.total);
  }

  const hasPaymentTotals =
    Number(fromPayments.DAI) > 0 || Number(fromPayments.STRK) > 0;

  let transferredDai = fromPayments.DAI;
  let transferredStrk = fromPayments.STRK;
  if (!hasPaymentTotals) {
    for (const row of bookingSums) {
      if (row.asset === "DAI") transferredDai = normalizeAmount(row.total);
      if (row.asset === "STRK") transferredStrk = normalizeAmount(row.total);
    }
  }

  const data: NetworkStats = {
    users: Number(userRow?.value ?? 0),
    countries: countries.size,
    listingsOpen,
    nightsBooked,
    transferredDai,
    transferredStrk,
    updatedAt: new Date(now).toISOString(),
  };
  cached = { at: now, data };
  return data;
}
