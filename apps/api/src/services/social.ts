import { eq, and, or, ilike, desc, asc, inArray, ne, gt, lt } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import {
  areFriends,
  canViewListing,
  canShareListing,
  getFriendIds,
  resolveConnectorForBooking,
} from "../lib/authorization.js";
import {
  generateOpaqueToken,
  orderedPair,
  splitBookingTotal,
  daysBetween,
} from "../lib/utils.js";
import { toUserResponse } from "./auth.js";
import { createNotification } from "./notifications.js";
import { daiToStrk, getStrkPerDai } from "./rates.js";
import { hasActivePaidNights } from "../lib/geo.js";
import { assertNoPastNights } from "../lib/booking-nights.js";

function mapListing(
  listing: typeof schema.listings.$inferSelect,
  host?: typeof schema.users.$inferSelect
) {
  return {
    id: listing.id,
    hostId: listing.hostId,
    title: listing.title,
    description: listing.description,
    location: listing.location,
    locationLat: listing.locationLat,
    locationLng: listing.locationLng,
    pricePerNight: listing.pricePerNight,
    paymentAsset: listing.paymentAsset,
    minStay: listing.minStay,
    maxStay: listing.maxStay,
    cancellationTerms: listing.cancellationTerms,
    connectorRewardPercent: listing.connectorRewardPercent,
    photos: listing.photos,
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
    host: host ? toUserResponse(host) : undefined,
  };
}

const LISTING_UNAVAILABLE = "Listing unavailable.";

export async function getUserById(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });
  return user ? toUserResponse(user) : null;
}

export async function updateUserDisplayName(userId: string, displayName: string) {
  const name = displayName.trim();
  if (name.length < 1 || name.length > 64) {
    throw new Error("Display name must be 1–64 characters");
  }

  const [updated] = await db
    .update(schema.users)
    .set({ displayName: name })
    .where(eq(schema.users.id, userId))
    .returning();

  if (!updated) {
    throw new Error("User not found");
  }

  return toUserResponse(updated);
}

export async function searchUsers(query: string, currentUserId: string) {
  let normalized = query.trim().toLowerCase().replace(/\s/g, "");
  if (!normalized) return [];
  if (!normalized.startsWith("0x")) {
    normalized = `0x${normalized}`;
  }
  if (normalized.length < 6) return [];

  const results = await db.query.users.findMany({
    where: and(
      ilike(schema.users.walletAddress, `%${normalized}%`),
      ne(schema.users.id, currentUserId)
    ),
    limit: 20,
  });

  return results.map(toUserResponse);
}

export async function sendFriendRequest(fromUserId: string, toUserId: string) {
  if (fromUserId === toUserId) {
    throw new Error("Cannot send friend request to yourself");
  }

  const alreadyFriends = await areFriends(fromUserId, toUserId);
  if (alreadyFriends) {
    throw new Error("Already friends");
  }

  const existing = await db.query.friendRequests.findFirst({
    where: and(
      eq(schema.friendRequests.fromUserId, fromUserId),
      eq(schema.friendRequests.toUserId, toUserId),
      eq(schema.friendRequests.status, "pending")
    ),
  });

  if (existing) {
    throw new Error("Friend request already pending");
  }

  const reverse = await db.query.friendRequests.findFirst({
    where: and(
      eq(schema.friendRequests.fromUserId, toUserId),
      eq(schema.friendRequests.toUserId, fromUserId),
      eq(schema.friendRequests.status, "pending")
    ),
  });
  if (reverse) {
    throw new Error(
      "They already sent you a request — check Incoming requests"
    );
  }

  const [request] = await db
    .insert(schema.friendRequests)
    .values({ fromUserId, toUserId })
    .returning();

  const fromUser = await getUserById(fromUserId);
  await createNotification({
    userId: toUserId,
    type: "friend_request",
    title: "New friend request",
    body: `${fromUser?.displayName ?? "Someone"} wants to connect`,
    href: "/friends",
  });

  return request;
}

export async function acceptFriendRequest(
  requestId: string,
  currentUserId: string
) {
  const request = await db.query.friendRequests.findFirst({
    where: eq(schema.friendRequests.id, requestId),
  });

  if (!request || request.toUserId !== currentUserId) {
    throw new Error("Friend request not found");
  }

  if (request.status !== "pending") {
    throw new Error("Friend request is not pending");
  }

  const [userAId, userBId] = orderedPair(request.fromUserId, request.toUserId);

  await db.transaction(async (tx) => {
    await tx
      .update(schema.friendRequests)
      .set({ status: "accepted" })
      .where(eq(schema.friendRequests.id, requestId));

    await tx
      .insert(schema.friendships)
      .values({ userAId, userBId })
      .onConflictDoNothing();
  });

  const accepter = await getUserById(currentUserId);
  await createNotification({
    userId: request.fromUserId,
    type: "friend_accepted",
    title: "Friend request accepted",
    body: `${accepter?.displayName ?? "Someone"} accepted your request`,
    href: "/friends",
  });

  return { success: true };
}

export async function rejectFriendRequest(
  requestId: string,
  currentUserId: string
) {
  const request = await db.query.friendRequests.findFirst({
    where: eq(schema.friendRequests.id, requestId),
  });

  if (!request || request.toUserId !== currentUserId) {
    throw new Error("Friend request not found");
  }

  if (request.status !== "pending") {
    throw new Error("Friend request is not pending");
  }

  await db
    .update(schema.friendRequests)
    .set({ status: "rejected" })
    .where(eq(schema.friendRequests.id, requestId));

  const rejecter = await getUserById(currentUserId);
  await createNotification({
    userId: request.fromUserId,
    type: "friend_rejected",
    title: "Friend request declined",
    body: `${rejecter?.displayName ?? "Someone"} declined your request`,
    href: "/friends",
  });

  return { success: true };
}

/** Sender withdraws a pending outgoing request. */
export async function cancelFriendRequest(
  requestId: string,
  currentUserId: string
) {
  const request = await db.query.friendRequests.findFirst({
    where: eq(schema.friendRequests.id, requestId),
  });

  if (!request || request.fromUserId !== currentUserId) {
    throw new Error("Friend request not found");
  }

  if (request.status !== "pending") {
    throw new Error("Friend request is not pending");
  }

  await db
    .delete(schema.friendRequests)
    .where(eq(schema.friendRequests.id, requestId));

  const sender = await getUserById(currentUserId);
  await createNotification({
    userId: request.toUserId,
    type: "friend_cancelled",
    title: "Friend request withdrawn",
    body: `${sender?.displayName ?? "Someone"} cancelled their request`,
    href: "/friends",
  });

  return { success: true };
}

export async function removeFriend(currentUserId: string, friendId: string) {
  if (currentUserId === friendId) {
    throw new Error("Cannot remove yourself");
  }

  const [userAId, userBId] = orderedPair(currentUserId, friendId);

  const deleted = await db
    .delete(schema.friendships)
    .where(
      and(
        eq(schema.friendships.userAId, userAId),
        eq(schema.friendships.userBId, userBId)
      )
    )
    .returning();

  if (deleted.length === 0) {
    throw new Error("Friendship not found");
  }

  const remover = await getUserById(currentUserId);
  await createNotification({
    userId: friendId,
    type: "friend_removed",
    title: "Friendship ended",
    body: `${remover?.displayName ?? "Someone"} removed you as a friend`,
    href: "/friends",
  });

  return { success: true };
}

export async function getFriendsData(currentUserId: string) {
  const friendIds = await getFriendIds(currentUserId);

  const friends =
    friendIds.length > 0
      ? await db.query.users.findMany({
          where: inArray(schema.users.id, friendIds),
        })
      : [];

  const pendingIncoming = await db.query.friendRequests.findMany({
    where: and(
      eq(schema.friendRequests.toUserId, currentUserId),
      eq(schema.friendRequests.status, "pending")
    ),
    with: { fromUser: true },
  });

  const pendingOutgoing = await db.query.friendRequests.findMany({
    where: and(
      eq(schema.friendRequests.fromUserId, currentUserId),
      eq(schema.friendRequests.status, "pending")
    ),
    with: { toUser: true },
  });

  return {
    friends: friends.map(toUserResponse),
    pendingIncoming: pendingIncoming.map((r) => ({
      id: r.id,
      fromUserId: r.fromUserId,
      toUserId: r.toUserId,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      fromUser: r.fromUser ? toUserResponse(r.fromUser) : undefined,
    })),
    pendingOutgoing: pendingOutgoing.map((r) => ({
      id: r.id,
      fromUserId: r.fromUserId,
      toUserId: r.toUserId,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      toUser: r.toUser ? toUserResponse(r.toUser) : undefined,
    })),
  };
}

export async function createListing(
  hostId: string,
  input: {
    title: string;
    description: string;
    location: string;
    locationLat?: number | null;
    locationLng?: number | null;
    pricePerNight: string;
    paymentAsset?: "STRK" | "DAI";
    minStay?: number;
    maxStay?: number;
    cancellationTerms: string;
    connectorRewardPercent: number;
    photos: string[];
    /** Preferred: explicit open nights with per-night DAI prices. */
    availableDays?: { day: string; pricePerNight: string }[];
    /** Legacy contiguous windows (expanded at default pricePerNight). */
    availability?: { startDate: string; endDate: string }[];
  }
) {
  if (!input.photos.length) {
    throw new Error("Add at least one photo");
  }
  if (input.photos.length > 8) {
    throw new Error("Maximum 8 photos");
  }
  for (const photo of input.photos) {
    if (
      !photo.startsWith("data:image/") &&
      !photo.startsWith("https://") &&
      !photo.startsWith("http://")
    ) {
      throw new Error("Photos must be uploaded images or https URLs");
    }
    if (photo.startsWith("data:image/") && photo.length > 900_000) {
      throw new Error("A photo is too large — compress and try again");
    }
  }

  if (
    input.locationLat == null ||
    input.locationLng == null ||
    Number.isNaN(input.locationLat) ||
    Number.isNaN(input.locationLng)
  ) {
    throw new Error("Pin the exact location on the map");
  }
  if (
    input.locationLat < -90 ||
    input.locationLat > 90 ||
    input.locationLng < -180 ||
    input.locationLng > 180
  ) {
    throw new Error("Invalid map coordinates");
  }

  let dayRows: { day: string; pricePerNight: string }[] = [];
  if (input.availableDays && input.availableDays.length > 0) {
    const seen = new Set<string>();
    for (const row of input.availableDays) {
      const day = toDayKey(row.day);
      if (seen.has(day)) continue;
      seen.add(day);
      const price = row.pricePerNight.trim();
      if (!price || Number(price) <= 0) {
        throw new Error(`Invalid price for ${day}`);
      }
      dayRows.push({ day, pricePerNight: price });
    }
  } else if (input.availability && input.availability.length > 0) {
    for (const window of input.availability) {
      const start = new Date(window.startDate);
      const end = new Date(window.endDate);
      if (daysBetween(start, end) < 1) {
        throw new Error("Availability end must be after start");
      }
      for (const day of nightsInWindow(window.startDate, window.endDate)) {
        dayRows.push({ day, pricePerNight: input.pricePerNight });
      }
    }
  } else {
    throw new Error("Select at least one available night on the calendar");
  }

  dayRows.sort((a, b) => a.day.localeCompare(b.day));
  const derivedMax = Math.max(1, dayRows.length);
  const minStay = input.minStay ?? 1;
  const maxStay = input.maxStay ?? derivedMax;
  if (minStay < 1 || maxStay < minStay) {
    throw new Error("Invalid stay limits");
  }

  const [listing] = await db
    .insert(schema.listings)
    .values({
      hostId,
      title: input.title,
      description: input.description,
      location: input.location,
      locationLat: input.locationLat.toFixed(7),
      locationLng: input.locationLng.toFixed(7),
      pricePerNight: input.pricePerNight,
      paymentAsset: input.paymentAsset ?? "DAI",
      minStay,
      maxStay,
      cancellationTerms: input.cancellationTerms,
      connectorRewardPercent: input.connectorRewardPercent,
      photos: input.photos,
    })
    .returning();

  const start = dayRows[0].day;
  const last = dayRows[dayRows.length - 1].day;
  const endDate = dayUtcNoon(last);
  endDate.setUTCDate(endDate.getUTCDate() + 1);

  await db.insert(schema.listingAvailability).values({
    listingId: listing.id,
    startDate: dayUtcNoon(start),
    endDate,
  });

  await db.insert(schema.listingAvailableDays).values(
    dayRows.map((d) => ({
      listingId: listing.id,
      day: dayUtcNoon(d.day),
      pricePerNight: d.pricePerNight,
    }))
  );

  return getListingForViewer(listing.id, hostId);
}

function dayUtcNoon(day: string): Date {
  return new Date(`${day.slice(0, 10)}T12:00:00.000Z`);
}

function toDayKey(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/** Nights in [start, end) — end is check-out day. */
function nightsInWindow(startDate: string, endDate: string): string[] {
  const start = toDayKey(startDate);
  const end = toDayKey(endDate);
  const out: string[] = [];
  let cur = start;
  while (cur < end) {
    out.push(cur);
    const d = dayUtcNoon(cur);
    d.setUTCDate(d.getUTCDate() + 1);
    cur = toDayKey(d);
  }
  return out;
}

export async function getListingForViewer(
  listingId: string,
  viewerId: string | null
) {
  const listing = await db.query.listings.findFirst({
    where: eq(schema.listings.id, listingId),
    with: { host: true },
  });

  if (!listing) {
    throw new Error(LISTING_UNAVAILABLE);
  }

  if (!viewerId) {
    throw new Error(LISTING_UNAVAILABLE);
  }

  const authorized = await canViewListing(
    viewerId,
    listing.id,
    listing.hostId
  );

  if (!authorized) {
    throw new Error(LISTING_UNAVAILABLE);
  }

  const availability = await db.query.listingAvailability.findMany({
    where: eq(schema.listingAvailability.listingId, listingId),
  });

  const days = await db.query.listingAvailableDays.findMany({
    where: eq(schema.listingAvailableDays.listingId, listingId),
    orderBy: [asc(schema.listingAvailableDays.day)],
  });

  const bookedRanges = await getPaidBookedRanges(listingId);
  const bookedNights = new Set<string>();
  for (const b of bookedRanges) {
    for (const n of b.nights) bookedNights.add(n);
  }

  const availableByDay = new Map<
    string,
    {
      id: string;
      listingId: string;
      day: string;
      pricePerNight: string;
      booked: boolean;
    }
  >();
  for (const d of days) {
    const key = toDayKey(d.day);
    availableByDay.set(key, {
      id: d.id,
      listingId: d.listingId,
      day: key,
      pricePerNight: d.pricePerNight,
      booked: bookedNights.has(key),
    });
  }
  // Ensure paid nights always appear (locked) even if missing from inventory
  for (const night of bookedNights) {
    if (availableByDay.has(night)) continue;
    availableByDay.set(night, {
      id: night,
      listingId,
      day: night,
      pricePerNight: listing.pricePerNight,
      booked: true,
    });
  }

  return {
    ...mapListing(listing, listing.host ?? undefined),
    availability: availability.map((a) => ({
      id: a.id,
      listingId: a.listingId,
      startDate: a.startDate.toISOString(),
      endDate: a.endDate.toISOString(),
    })),
    availableDays: [...availableByDay.values()].sort((a, b) =>
      a.day.localeCompare(b.day)
    ),
    bookedRanges,
  };
}

/** Paid stays that occupy nights (social-cancelled frees them). */
export async function getPaidBookedRanges(listingId: string) {
  const rows = await db.query.bookings.findMany({
    where: and(
      eq(schema.bookings.listingId, listingId),
      inArray(schema.bookings.status, ["funded", "confirmed", "completed"])
    ),
  });
  return rows.map((b) => {
    const nights =
      b.selectedNights && b.selectedNights.length > 0
        ? b.selectedNights.map(toDayKey)
        : nightsInWindow(b.checkIn.toISOString(), b.checkOut.toISOString());
    return {
      bookingId: b.id,
      checkIn: b.checkIn.toISOString(),
      checkOut: b.checkOut.toISOString(),
      nights,
      status: b.status,
    };
  });
}

/**
 * Host replaces open nights + per-night DAI prices.
 * Paid (booked) nights are preserved and cannot be removed or repriced here.
 */
export async function setListingAvailableDays(
  listingId: string,
  hostId: string,
  days: { day: string; pricePerNight: string }[]
) {
  const listing = await db.query.listings.findFirst({
    where: eq(schema.listings.id, listingId),
  });
  if (!listing || listing.hostId !== hostId) {
    throw new Error(LISTING_UNAVAILABLE);
  }

  const paid = await getPaidBookedRanges(listingId);
  const paidNights = new Set(paid.flatMap((b) => b.nights));

  const existingRows = await db.query.listingAvailableDays.findMany({
    where: eq(schema.listingAvailableDays.listingId, listingId),
  });
  const existingByDay = new Map(
    existingRows.map((d) => [toDayKey(d.day), d.pricePerNight])
  );

  const seen = new Set<string>();
  const normalized: { day: string; pricePerNight: string }[] = [];
  for (const row of days) {
    const day = toDayKey(row.day);
    if (seen.has(day)) continue;
    if (paidNights.has(day)) {
      throw new Error(
        `Night ${day} is already booked — leave it locked`
      );
    }
    seen.add(day);
    const price = row.pricePerNight.trim();
    if (!price || Number(price) <= 0) {
      throw new Error(`Invalid price for ${day}`);
    }
    normalized.push({ day, pricePerNight: price });
  }

  // Keep paid nights in inventory (locked) with their prior price
  for (const day of [...paidNights].sort()) {
    if (seen.has(day)) continue;
    seen.add(day);
    normalized.push({
      day,
      pricePerNight:
        existingByDay.get(day) ?? listing.pricePerNight,
    });
  }

  normalized.sort((a, b) => a.day.localeCompare(b.day));
  const openCount = normalized.filter((d) => !paidNights.has(d.day)).length;
  const maxStay = Math.max(1, openCount || normalized.length);

  await db.transaction(async (tx) => {
    await tx
      .delete(schema.listingAvailableDays)
      .where(eq(schema.listingAvailableDays.listingId, listingId));

    if (normalized.length > 0) {
      await tx.insert(schema.listingAvailableDays).values(
        normalized.map((d) => ({
          listingId,
          day: dayUtcNoon(d.day),
          pricePerNight: d.pricePerNight,
        }))
      );

      const start = normalized[0].day;
      const last = normalized[normalized.length - 1].day;
      const endDate = dayUtcNoon(last);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      await tx
        .delete(schema.listingAvailability)
        .where(eq(schema.listingAvailability.listingId, listingId));
      await tx.insert(schema.listingAvailability).values({
        listingId,
        startDate: dayUtcNoon(start),
        endDate,
      });
    } else {
      await tx
        .delete(schema.listingAvailability)
        .where(eq(schema.listingAvailability.listingId, listingId));
    }

    await tx
      .update(schema.listings)
      .set({
        minStay: 1,
        maxStay,
        updatedAt: new Date(),
      })
      .where(eq(schema.listings.id, listingId));
  });

  return getListingForViewer(listingId, hostId);
}

export async function updateListingAvailability(
  listingId: string,
  hostId: string,
  availability: { startDate: string; endDate: string }[]
) {
  const listing = await db.query.listings.findFirst({
    where: eq(schema.listings.id, listingId),
  });
  if (!listing || listing.hostId !== hostId) {
    throw new Error(LISTING_UNAVAILABLE);
  }
  const days: { day: string; pricePerNight: string }[] = [];
  for (const w of availability) {
    for (const day of nightsInWindow(w.startDate, w.endDate)) {
      days.push({ day, pricePerNight: listing.pricePerNight });
    }
  }
  return setListingAvailableDays(listingId, hostId, days);
}

export async function getMyListings(hostId: string) {
  const rows = await db.query.listings.findMany({
    where: eq(schema.listings.hostId, hostId),
    orderBy: [desc(schema.listings.createdAt)],
  });

  return rows.map((l) => mapListing(l));
}

/** True if any paid night is today or in the future. */
export { hasActivePaidNights } from "../lib/geo.js";

/**
 * Host deletes their listing when no active paid bookings remain.
 * Past paid stays are OK — only today/future paid nights block delete.
 */
export async function deleteListing(listingId: string, hostId: string) {
  const listing = await db.query.listings.findFirst({
    where: eq(schema.listings.id, listingId),
  });
  if (!listing || listing.hostId !== hostId) {
    throw new Error(LISTING_UNAVAILABLE);
  }

  const paid = await getPaidBookedRanges(listingId);
  const todayKey = new Date().toISOString().slice(0, 10);
  for (const b of paid) {
    if (hasActivePaidNights(b.nights, b.checkOut, todayKey)) {
      throw new Error(
        "Cannot delete listing while it has active paid bookings. Wait until those stays are past, or mark them cancelled with the guest."
      );
    }
  }

  try {
    await db.transaction(async (tx) => {
      const bookingRows = await tx.query.bookings.findMany({
        where: eq(schema.bookings.listingId, listingId),
        columns: { id: true },
      });
      const bookingIds = bookingRows.map((b) => b.id);

      if (bookingIds.length > 0) {
        await tx
          .delete(schema.payments)
          .where(inArray(schema.payments.bookingId, bookingIds));
        await tx
          .update(schema.directMessages)
          .set({ bookingId: null })
          .where(inArray(schema.directMessages.bookingId, bookingIds));
        await tx
          .delete(schema.bookings)
          .where(inArray(schema.bookings.id, bookingIds));
      }

      await tx
        .delete(schema.listingAvailableDays)
        .where(eq(schema.listingAvailableDays.listingId, listingId));
      await tx
        .delete(schema.listingAvailability)
        .where(eq(schema.listingAvailability.listingId, listingId));
      await tx
        .delete(schema.shareIntroductions)
        .where(eq(schema.shareIntroductions.listingId, listingId));
      await tx
        .delete(schema.listingShares)
        .where(eq(schema.listingShares.listingId, listingId));
      await tx
        .delete(schema.listings)
        .where(eq(schema.listings.id, listingId));
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "database error";
    throw new Error(`Could not delete listing (${detail})`);
  }

  return { ok: true as const, id: listingId };
}

export async function getNetworkListings(userId: string) {
  const friendIds = await getFriendIds(userId);
  if (friendIds.length === 0) return [];

  const rows = await db.query.listings.findMany({
    where: inArray(schema.listings.hostId, friendIds),
    with: { host: true },
    orderBy: [desc(schema.listings.createdAt)],
  });

  return rows.map((l) => mapListing(l, l.host ?? undefined));
}

export async function getSharedWithMeListings(userId: string) {
  const introductions = await db.query.shareIntroductions.findMany({
    where: eq(schema.shareIntroductions.guestId, userId),
  });

  const listingIds = [...new Set(introductions.map((i) => i.listingId))];
  if (listingIds.length === 0) return [];

  const authorized: ReturnType<typeof mapListing>[] = [];

  for (const listingId of listingIds) {
    try {
      const listing = await getListingForViewer(listingId, userId);
      authorized.push(listing);
    } catch {
      // Not yet authorized — friendship pending
    }
  }

  return authorized;
}

export async function createListingShare(
  listingId: string,
  sharerId: string
) {
  const listing = await db.query.listings.findFirst({
    where: eq(schema.listings.id, listingId),
  });

  if (!listing) {
    throw new Error(LISTING_UNAVAILABLE);
  }

  const canShare = await canShareListing(
    sharerId,
    listingId,
    listing.hostId
  );

  if (!canShare) {
    throw new Error("Not authorized to share this listing");
  }

  // Host may share for discovery, but is never a connector (0% connector path).
  // A friend who shares becomes the connector for guests who use that link.
  const connectorId = sharerId === listing.hostId ? null : sharerId;

  const token = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [share] = await db
    .insert(schema.listingShares)
    .values({
      listingId,
      hostId: listing.hostId,
      connectorId,
      token,
      expiresAt,
    })
    .returning();

  return {
    id: share.id,
    token: share.token,
    inviteUrl: `/invite/${share.token}`,
    expiresAt: share.expiresAt?.toISOString() ?? null,
    hasConnector: connectorId !== null,
    connectorId,
  };
}

export async function resolveInvite(token: string, guestId?: string) {
  const share = await db.query.listingShares.findFirst({
    where: eq(schema.listingShares.token, token),
    with: { host: true, connector: true },
  });

  if (!share || share.status !== "active") {
    throw new Error("Invitation unavailable.");
  }

  if (share.expiresAt && share.expiresAt < new Date()) {
    await db
      .update(schema.listingShares)
      .set({ status: "expired" })
      .where(eq(schema.listingShares.id, share.id));
    throw new Error("Invitation unavailable.");
  }

  let canViewListing = false;
  let friendshipRequired = true;
  let friendshipPending = false;

  if (guestId) {
    if (guestId === share.hostId) {
      canViewListing = true;
      friendshipRequired = false;
    } else {
      const isFriend = await areFriends(guestId, share.hostId);
      canViewListing = isFriend;
      friendshipRequired = !isFriend;

      const pending = await db.query.friendRequests.findFirst({
        where: and(
          eq(schema.friendRequests.fromUserId, guestId),
          eq(schema.friendRequests.toUserId, share.hostId),
          eq(schema.friendRequests.status, "pending")
        ),
      });

      friendshipPending = !!pending;
    }

    // Always attribute the opened share (last-touch). Multiple connectors can
    // share the same listing; the link the guest opens decides the connector.
    await db
      .insert(schema.shareIntroductions)
      .values({
        shareId: share.id,
        guestId,
        connectorId: share.connectorId,
        hostId: share.hostId,
        listingId: share.listingId,
      })
      .onConflictDoUpdate({
        target: [
          schema.shareIntroductions.guestId,
          schema.shareIntroductions.listingId,
        ],
        set: {
          shareId: share.id,
          connectorId: share.connectorId,
        },
      });
  }

  return {
    shareId: share.id,
    listingId: share.listingId,
    hostId: share.hostId,
    connectorId: share.connectorId,
    hasConnector: share.connectorId !== null,
    host: toUserResponse(share.host!),
    connector: share.connector ? toUserResponse(share.connector) : null,
    canViewListing,
    friendshipRequired,
    friendshipPending,
  };
}

export async function quoteBooking(
  guestId: string,
  input: {
    listingId: string;
    /** Preferred: explicit nights (may be non-contiguous). */
    nights?: string[];
    checkIn?: string;
    checkOut?: string;
    paymentAsset?: "STRK" | "DAI";
  }
) {
  const prepared = await prepareBooking(guestId, input);
  const fx = await getStrkPerDai({ fresh: true });
  const totalPriceDai = prepared.amountsDai.totalPrice;
  const totalPriceStrk = daiToStrk(totalPriceDai, fx.strkPerDai);
  const amountsStrk = {
    totalPrice: totalPriceStrk,
    connectorRewardAmount: daiToStrk(
      prepared.amountsDai.connectorRewardAmount,
      fx.strkPerDai
    ),
    protocolFeeAmount: daiToStrk(
      prepared.amountsDai.protocolFeeAmount,
      fx.strkPerDai
    ),
    protocolFeePercent: prepared.amountsDai.protocolFeePercent,
    hostAmount: daiToStrk(prepared.amountsDai.hostAmount, fx.strkPerDai),
    connectorRewardPercentApplied:
      prepared.amountsDai.connectorRewardPercentApplied,
  };

  const paymentAsset = input.paymentAsset === "DAI" ? "DAI" : "STRK";
  const payAmounts =
    paymentAsset === "DAI"
      ? {
          totalPrice: totalPriceDai,
          connectorRewardAmount: prepared.amountsDai.connectorRewardAmount,
          protocolFeeAmount: prepared.amountsDai.protocolFeeAmount,
          protocolFeePercent: prepared.amountsDai.protocolFeePercent,
          hostAmount: prepared.amountsDai.hostAmount,
          connectorRewardPercentApplied:
            prepared.amountsDai.connectorRewardPercentApplied,
        }
      : amountsStrk;

  return {
    listingId: prepared.listing.id,
    hostId: prepared.listing.hostId,
    checkIn: prepared.checkIn.toISOString(),
    checkOut: prepared.checkOut.toISOString(),
    selectedNights: prepared.selectedNights,
    nights: prepared.nights,
    pricePerNightDai: prepared.listing.pricePerNight,
    totalPriceDai,
    totalPriceStrk,
    paymentAsset,
    displayAsset: paymentAsset,
    fxRate: String(fx.strkPerDai),
    fxUsdPerStrk: fx.usdPerStrk,
    fxUsdPerDai: fx.usdPerDai,
    fxSource: fx.source,
    fxFetchedAt: fx.fetchedAt,
    connectorId: prepared.connectorId,
    connectorWallet: prepared.connectorWallet,
    hasConnector: prepared.hasConnector,
    connectorRewardPercent: payAmounts.connectorRewardPercentApplied,
    connectorRewardAmount: payAmounts.connectorRewardAmount,
    protocolFeeAmount: payAmounts.protocolFeeAmount,
    protocolFeePercent: payAmounts.protocolFeePercent,
    hostAmount: payAmounts.hostAmount,
    totalPrice: payAmounts.totalPrice,
    nightBreakdown: prepared.nightBreakdown,
    note:
      paymentAsset === "DAI"
        ? "List prices are DAI per night. Paying in DAI settles 1:1. Host + connector are paid immediately on pay."
        : "List prices are DAI per night. STRK amount uses the live DAI/STRK market rate at quote time. Host + connector are paid immediately on pay.",
  };
}

/**
 * Creates a completed booking only after on-chain payment (fund+settle).
 * Client generates `bookingId` before the escrow multicall so ids match.
 */
export async function confirmPaidBooking(
  guestId: string,
  input: {
    bookingId: string;
    listingId: string;
    nights?: string[];
    checkIn?: string;
    checkOut?: string;
    fundTxHash: string;
    escrowBookingId: string;
    privacyMode?: "private" | "public";
    paymentAsset?: "STRK" | "DAI";
    /** Amount actually funded on-chain in `paymentAsset`. */
    totalPrice?: string;
    /** @deprecated Prefer totalPrice; kept for STRK clients. */
    totalPriceStrk?: string;
    fxRate?: string;
  }
) {
  const existing = await db.query.bookings.findFirst({
    where: eq(schema.bookings.id, input.bookingId),
  });
  if (existing) {
    throw new Error("Booking already exists");
  }

  const prepared = await prepareBooking(guestId, {
    listingId: input.listingId,
    nights: input.nights,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
  });

  const paymentAsset = input.paymentAsset === "DAI" ? "DAI" : "STRK";
  const totalPriceDai = prepared.amountsDai.totalPrice;
  const paidInput = input.totalPrice ?? input.totalPriceStrk;

  let totalPrice: string;
  let fxRateUsed: string | null;
  let amounts: {
    connectorRewardAmount: string;
    protocolFeeAmount: string;
    protocolFeePercent: number;
    hostAmount: string;
    connectorRewardPercentApplied: number;
  };

  if (paymentAsset === "DAI") {
    totalPrice = totalPriceDai;
    if (paidInput && Number(paidInput) > 0) {
      const paid = Number(paidInput);
      const expected = Number(totalPriceDai);
      if (expected > 0 && Math.abs(paid - expected) / expected > 0.01) {
        throw new Error(
          "DAI amount does not match the quote — refresh and try again"
        );
      }
      totalPrice = paidInput;
    }
    fxRateUsed = "1";
    amounts = {
      connectorRewardAmount: prepared.amountsDai.connectorRewardAmount,
      protocolFeeAmount: prepared.amountsDai.protocolFeeAmount,
      protocolFeePercent: prepared.amountsDai.protocolFeePercent,
      hostAmount: prepared.amountsDai.hostAmount,
      connectorRewardPercentApplied:
        prepared.amountsDai.connectorRewardPercentApplied,
    };
  } else {
    const fx = await getStrkPerDai({ fresh: true });
    const freshStrk = daiToStrk(totalPriceDai, fx.strkPerDai);
    totalPrice = freshStrk;
    fxRateUsed = String(fx.strkPerDai);
    if (paidInput && Number(paidInput) > 0) {
      const paid = Number(paidInput);
      const fresh = Number(freshStrk);
      if (fresh > 0 && Math.abs(paid - fresh) / fresh > 0.05) {
        throw new Error(
          "STRK amount drifted too far from the live rate — refresh quote and try again"
        );
      }
      totalPrice = paidInput;
      fxRateUsed =
        input.fxRate && Number(input.fxRate) > 0
          ? input.fxRate
          : String(paid / Number(totalPriceDai));
    }
    const strkPerDai = Number(fxRateUsed);
    amounts = {
      connectorRewardAmount: daiToStrk(
        prepared.amountsDai.connectorRewardAmount,
        strkPerDai
      ),
      protocolFeeAmount: daiToStrk(
        prepared.amountsDai.protocolFeeAmount,
        strkPerDai
      ),
      protocolFeePercent: prepared.amountsDai.protocolFeePercent,
      hostAmount: daiToStrk(prepared.amountsDai.hostAmount, strkPerDai),
      connectorRewardPercentApplied:
        prepared.amountsDai.connectorRewardPercentApplied,
    };
  }

  const [booking] = await db
    .insert(schema.bookings)
    .values({
      id: input.bookingId,
      listingId: prepared.listing.id,
      hostId: prepared.listing.hostId,
      guestId,
      connectorId: prepared.connectorId ?? null,
      checkIn: prepared.checkIn,
      checkOut: prepared.checkOut,
      nights: prepared.nights,
      selectedNights: prepared.selectedNights,
      totalPrice,
      totalPriceDai,
      fxRate: fxRateUsed,
      connectorRewardPercent: amounts.connectorRewardPercentApplied,
      connectorRewardAmount: amounts.connectorRewardAmount,
      protocolFeeAmount: amounts.protocolFeeAmount,
      protocolFeePercent: amounts.protocolFeePercent,
      hostAmount: amounts.hostAmount,
      paymentAsset,
      status: "completed",
      fundTxHash: input.fundTxHash,
      settleTxHash: input.fundTxHash,
      escrowBookingId: input.escrowBookingId,
    })
    .returning();

  await db.insert(schema.payments).values({
    bookingId: booking.id,
    amount: booking.totalPrice,
    asset: paymentAsset,
    txHash: input.fundTxHash,
    privacyMode: input.privacyMode ?? "public",
    status: "confirmed",
  });

  try {
    const { postBookingChatNotice } = await import("./chat.js");
    await postBookingChatNotice({
      guestId,
      hostId: prepared.listing.hostId,
      bookingId: booking.id,
      listingTitle: prepared.listing.title,
      checkIn: booking.checkIn.toISOString(),
      checkOut: booking.checkOut.toISOString(),
      totalPrice: booking.totalPrice,
      paymentAsset,
    });
  } catch {
    // best-effort
  }

  return mapBooking(booking);
}

async function prepareBooking(
  guestId: string,
  input: {
    listingId: string;
    nights?: string[];
    checkIn?: string;
    checkOut?: string;
  }
) {
  const listing = await db.query.listings.findFirst({
    where: eq(schema.listings.id, input.listingId),
  });

  if (!listing) {
    throw new Error(LISTING_UNAVAILABLE);
  }

  const authorized = await canViewListing(
    guestId,
    listing.id,
    listing.hostId
  );

  if (!authorized) {
    throw new Error(LISTING_UNAVAILABLE);
  }

  if (listing.hostId === guestId) {
    throw new Error("You cannot book your own listing");
  }

  let nightKeys: string[];
  if (input.nights && input.nights.length > 0) {
    nightKeys = [...new Set(input.nights.map(toDayKey))].sort();
  } else if (input.checkIn && input.checkOut) {
    nightKeys = nightsInWindow(input.checkIn, input.checkOut);
  } else {
    throw new Error("Select at least one night");
  }

  if (nightKeys.length < 1) {
    throw new Error("Select at least one night");
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  assertNoPastNights(nightKeys, todayKey);

  const checkInDay = nightKeys[0];
  const checkOutDay = (() => {
    const d = dayUtcNoon(nightKeys[nightKeys.length - 1]);
    d.setUTCDate(d.getUTCDate() + 1);
    return toDayKey(d);
  })();
  const checkIn = dayUtcNoon(checkInDay);
  const checkOut = dayUtcNoon(checkOutDay);
  const nights = nightKeys.length;

  const dayRows = await db.query.listingAvailableDays.findMany({
    where: eq(schema.listingAvailableDays.listingId, listing.id),
  });
  const dayMap = new Map(
    dayRows.map((d) => [toDayKey(d.day), d.pricePerNight])
  );

  const nightBreakdown: { day: string; pricePerNight: string }[] = [];
  let totalDaiNum = 0;
  for (const day of nightKeys) {
    const price = dayMap.get(day);
    if (!price) {
      throw new Error(`Night ${day} is not available`);
    }
    nightBreakdown.push({ day, pricePerNight: price });
    totalDaiNum += Number(price);
  }

  const paid = await getPaidBookedRanges(listing.id);
  const taken = new Set(paid.flatMap((b) => b.nights));
  for (const day of nightKeys) {
    if (taken.has(day)) {
      throw new Error(`Night ${day} is already booked`);
    }
  }

  const connectorId = await resolveConnectorForBooking(
    guestId,
    listing.id,
    listing.hostId
  );
  const hasConnector = Boolean(connectorId);
  const rewardPercent = hasConnector ? listing.connectorRewardPercent : 0;
  const totalPriceDai = totalDaiNum.toFixed(18).replace(/\.?0+$/, "") || "0";
  const amountsDai = splitBookingTotal(
    totalPriceDai,
    rewardPercent,
    hasConnector
  );

  let connectorWallet: string | null = null;
  if (connectorId) {
    const connector = await db.query.users.findFirst({
      where: eq(schema.users.id, connectorId),
    });
    connectorWallet = connector?.walletAddress ?? null;
  }

  return {
    listing,
    checkIn,
    checkOut,
    nights,
    selectedNights: nightKeys,
    nightBreakdown,
    connectorId,
    connectorWallet,
    hasConnector,
    rewardPercent,
    amountsDai,
  };
}

/** @deprecated Unpaid bookings are no longer created — use quote + confirmPaidBooking. */
export async function createBooking(
  guestId: string,
  input: {
    listingId: string;
    checkIn: string;
    checkOut: string;
    paymentAsset?: "STRK" | "DAI";
  }
) {
  throw new Error(
    "Bookings are created only after payment. Use POST /bookings/quote then pay and POST /bookings/confirm."
  );
}

function mapBooking(
  booking: typeof schema.bookings.$inferSelect,
  relations?: {
    listing?: typeof schema.listings.$inferSelect;
    host?: typeof schema.users.$inferSelect;
    guest?: typeof schema.users.$inferSelect;
    connector?: typeof schema.users.$inferSelect;
  }
) {
  return {
    id: booking.id,
    listingId: booking.listingId,
    hostId: booking.hostId,
    guestId: booking.guestId,
    connectorId: booking.connectorId,
    checkIn: booking.checkIn.toISOString(),
    checkOut: booking.checkOut.toISOString(),
    nights: booking.nights,
    selectedNights: booking.selectedNights ?? [],
    totalPrice: booking.totalPrice,
    totalPriceDai: booking.totalPriceDai,
    fxRate: booking.fxRate,
    connectorRewardPercent: booking.connectorRewardPercent,
    connectorRewardAmount: booking.connectorRewardAmount,
    protocolFeeAmount: booking.protocolFeeAmount,
    protocolFeePercent: booking.protocolFeePercent,
    hostAmount: booking.hostAmount,
    paymentAsset: booking.paymentAsset,
    status: booking.status,
    escrowBookingId: booking.escrowBookingId,
    fundTxHash: booking.fundTxHash,
    settleTxHash: booking.settleTxHash,
    refundTxHash: booking.refundTxHash,
    createdAt: booking.createdAt.toISOString(),
    listing: relations?.listing
      ? mapListing(relations.listing)
      : undefined,
    host: relations?.host ? toUserResponse(relations.host) : undefined,
    guest: relations?.guest ? toUserResponse(relations.guest) : undefined,
    connector: relations?.connector
      ? toUserResponse(relations.connector)
      : undefined,
  };
}

export async function getMyBookings(userId: string) {
  const rows = await db.query.bookings.findMany({
    where: or(
      eq(schema.bookings.guestId, userId),
      eq(schema.bookings.hostId, userId)
    ),
    with: { listing: true, host: true, guest: true, connector: true },
    orderBy: [desc(schema.bookings.createdAt)],
  });

  return rows.map((b) =>
    mapBooking(b, {
      listing: b.listing ?? undefined,
      host: b.host ?? undefined,
      guest: b.guest ?? undefined,
      connector: b.connector ?? undefined,
    })
  );
}

export async function getConnectorEarnings(connectorId: string) {
  const rows = await db.query.bookings.findMany({
    where: and(
      eq(schema.bookings.connectorId, connectorId),
      inArray(schema.bookings.status, ["confirmed", "completed"])
    ),
    with: { listing: true },
    orderBy: [desc(schema.bookings.createdAt)],
  });

  const totalEarned = rows.reduce(
    (sum, b) => sum + parseFloat(b.connectorRewardAmount),
    0
  );

  return {
    totalEarned: totalEarned.toFixed(18).replace(/\.?0+$/, ""),
    bookings: rows.map((b) =>
      mapBooking(b, { listing: b.listing ?? undefined })
    ),
  };
}

export async function updateBookingPayment(
  bookingId: string,
  guestId: string,
  data: {
    fundTxHash: string;
    escrowBookingId?: string;
    privacyMode?: "private" | "public";
  }
) {
  const booking = await db.query.bookings.findFirst({
    where: eq(schema.bookings.id, bookingId),
  });

  if (!booking || booking.guestId !== guestId) {
    throw new Error("Booking not found");
  }

  if (booking.status !== "pending") {
    throw new Error("Booking cannot be funded in current state");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(schema.bookings)
      .set({
        status: "funded",
        fundTxHash: data.fundTxHash,
        escrowBookingId: data.escrowBookingId ?? null,
      })
      .where(eq(schema.bookings.id, bookingId));

    await tx.insert(schema.payments).values({
      bookingId,
      amount: booking.totalPrice,
      asset: booking.paymentAsset,
      txHash: data.fundTxHash,
      privacyMode: data.privacyMode ?? "public",
      status: "confirmed",
    });
  });

  return getBookingById(bookingId, guestId);
}

/** Guest records on-chain settlement — normally unused; pay path settles immediately. */
export async function settleBooking(
  bookingId: string,
  guestId: string,
  data: { settleTxHash: string }
) {
  const booking = await db.query.bookings.findFirst({
    where: eq(schema.bookings.id, bookingId),
  });

  if (!booking || booking.guestId !== guestId) {
    throw new Error("Booking not found");
  }

  if (booking.status !== "funded") {
    throw new Error("Booking cannot be settled in current state");
  }

  await db
    .update(schema.bookings)
    .set({
      status: "completed",
      settleTxHash: data.settleTxHash,
    })
    .where(eq(schema.bookings.id, bookingId));

  return getBookingById(bookingId, guestId);
}

/**
 * Mark a paid booking cancelled by social agreement. Money was already paid to
 * host/connector — any return is voluntary via Messages / peer transfer.
 * Frees the nights for other guests.
 */
export async function socialCancelBooking(
  bookingId: string,
  userId: string
) {
  const booking = await db.query.bookings.findFirst({
    where: eq(schema.bookings.id, bookingId),
    with: { listing: true },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  const isParty =
    booking.guestId === userId || booking.hostId === userId;
  if (!isParty) {
    throw new Error("Booking not found");
  }

  if (!["funded", "confirmed", "completed"].includes(booking.status)) {
    throw new Error("Booking cannot be cancelled in current state");
  }

  await db
    .update(schema.bookings)
    .set({ status: "cancelled" })
    .where(eq(schema.bookings.id, bookingId));

  const otherId =
    userId === booking.guestId ? booking.hostId : booking.guestId;
  const title = booking.listing?.title ?? "listing";
  const body = `Booking for “${title}” marked cancelled. Nights are free again. Any money return is voluntary — use Messages to send DAI/STRK if you agreed.`;

  try {
    const { sendTextMessage } = await import("./chat.js");
    await sendTextMessage(userId, otherId, body);
  } catch {
    // best-effort
  }

  await createNotification({
    userId: otherId,
    type: "booking",
    title: "Booking cancelled",
    body,
    href: `/messages/${userId}`,
  });

  return getBookingById(bookingId, userId);
}

/** @deprecated Escrow refund — prefer social cancel + voluntary peer transfer. */
export async function refundBooking(
  bookingId: string,
  hostId: string,
  data: { refundTxHash: string }
) {
  const booking = await db.query.bookings.findFirst({
    where: eq(schema.bookings.id, bookingId),
  });

  if (!booking || booking.hostId !== hostId) {
    throw new Error("Booking not found");
  }

  if (booking.status !== "funded") {
    throw new Error(
      "On-chain refund only applies if settlement did not complete. Prefer social cancel + Messages."
    );
  }

  await db
    .update(schema.bookings)
    .set({
      status: "refunded",
      refundTxHash: data.refundTxHash,
    })
    .where(eq(schema.bookings.id, bookingId));

  return getBookingById(bookingId, hostId);
}

export async function requestBookingCancel(
  bookingId: string,
  guestId: string
) {
  return socialCancelBooking(bookingId, guestId);
}

export async function getBookingById(bookingId: string, userId: string) {
  const booking = await db.query.bookings.findFirst({
    where: eq(schema.bookings.id, bookingId),
    with: { listing: true, host: true, guest: true, connector: true },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  const involved =
    booking.guestId === userId ||
    booking.hostId === userId ||
    (booking.connectorId !== null && booking.connectorId === userId);

  if (!involved) {
    throw new Error("Booking not found");
  }

  return mapBooking(booking, {
    listing: booking.listing ?? undefined,
    host: booking.host ?? undefined,
    guest: booking.guest ?? undefined,
    connector: booking.connector ?? undefined,
  });
}

export async function getHomeData(userId: string) {
  const [friends, networkListings, sharedListings, myListings, myBookings] =
    await Promise.all([
      getFriendsData(userId),
      getNetworkListings(userId),
      getSharedWithMeListings(userId),
      getMyListings(userId),
      getMyBookings(userId),
    ]);

  return {
    friends: friends.friends,
    networkListings,
    sharedListings,
    myListings,
    myBookings,
    pendingFriendRequests: friends.pendingIncoming.length,
  };
}
