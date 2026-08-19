import type { User } from "./index.js";

/** Normalize a wallet search query (lowercase, optional 0x prefix). */
export function normalizeWalletSearchQuery(raw: string): string {
  let q = raw.trim().toLowerCase().replace(/\s/g, "");
  if (!q) return "";
  if (!q.startsWith("0x")) q = `0x${q}`;
  return q;
}

/** True when the query would match this wallet (partial or full hex). */
export function walletQueryMatchesAddress(
  query: string,
  walletAddress: string
): boolean {
  const normalized = normalizeWalletSearchQuery(query);
  if (!normalized || normalized.length < 6) return false;
  const wallet = walletAddress.toLowerCase();
  const hex = normalized.startsWith("0x") ? normalized.slice(2) : normalized;
  return wallet === normalized || wallet.includes(hex);
}

export type FriendSearchRelationship =
  | "none"
  | "friend"
  | "pending_outgoing"
  | "pending_incoming";

export interface FriendSearchHit {
  user: User;
  relationship: FriendSearchRelationship;
  /** Pending friend request id when relationship is pending_* */
  requestId?: string;
}

export interface FriendSearchResponse {
  /** Query matches the searcher’s own wallet and no one else was found. */
  self: boolean;
  users: FriendSearchHit[];
}
