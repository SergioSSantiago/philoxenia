import { eq, and, or } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { orderedPair } from "./utils.js";

export async function areFriends(
  userIdA: string,
  userIdB: string
): Promise<boolean> {
  if (userIdA === userIdB) return true;

  const [userAId, userBId] = orderedPair(userIdA, userIdB);

  const friendship = await db.query.friendships.findFirst({
    where: and(
      eq(schema.friendships.userAId, userAId),
      eq(schema.friendships.userBId, userBId)
    ),
  });

  return !!friendship;
}

export async function canViewListing(
  viewerId: string,
  listingId: string,
  hostId: string
): Promise<boolean> {
  if (viewerId === hostId) return true;
  return areFriends(viewerId, hostId);
}

export async function canShareListing(
  userId: string,
  listingId: string,
  hostId: string
): Promise<boolean> {
  if (userId === hostId) return true;
  return areFriends(userId, hostId);
}

export async function getConnectorForGuestListing(
  guestId: string,
  listingId: string
): Promise<string | null> {
  const introduction = await db.query.shareIntroductions.findFirst({
    where: and(
      eq(schema.shareIntroductions.guestId, guestId),
      eq(schema.shareIntroductions.listingId, listingId)
    ),
  });

  return introduction?.connectorId ?? null;
}

export async function resolveConnectorForBooking(
  guestId: string,
  listingId: string,
  hostId: string
): Promise<string | null> {
  const connectorId = await getConnectorForGuestListing(guestId, listingId);
  if (!connectorId) return null;
  // Host shares and self-attribution never earn connector reward
  if (connectorId === hostId || connectorId === guestId) return null;

  const isFriend = await areFriends(connectorId, hostId);
  return isFriend ? connectorId : null;
}

export async function getFriendIds(userId: string): Promise<string[]> {
  const friendships = await db.query.friendships.findMany({
    where: or(
      eq(schema.friendships.userAId, userId),
      eq(schema.friendships.userBId, userId)
    ),
  });

  return friendships.map((f) =>
    f.userAId === userId ? f.userBId : f.userAId
  );
}
