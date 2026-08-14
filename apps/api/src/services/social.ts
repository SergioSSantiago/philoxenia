import { eq, and, or, ilike, desc, inArray, ne, gt, lt } from "drizzle-orm";
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
  calculateBookingAmounts,
  daysBetween,
} from "../lib/utils.js";
import { toUserResponse } from "./auth.js";

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

  const [request] = await db
    .insert(schema.friendRequests)
    .values({ fromUserId, toUserId })
    .returning();

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

    await tx.insert(schema.friendships).values({ userAId, userBId });
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

  await db
    .update(schema.friendRequests)
    .set({ status: "rejected" })
    .where(eq(schema.friendRequests.id, requestId));

  return { success: true };
}

export async function removeFriend(currentUserId: string, friendId: string) {
  const [userAId, userBId] = orderedPair(currentUserId, friendId);

  await db
    .delete(schema.friendships)
    .where(
      and(
        eq(schema.friendships.userAId, userAId),
        eq(schema.friendships.userBId, userBId)
      )
    );

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
    pricePerNight: string;
    paymentAsset: "STRK" | "DAI";
    minStay: number;
    maxStay: number;
    cancellationTerms: string;
    connectorRewardPercent: number;
    photos: string[];
    availability: { startDate: string; endDate: string }[];
  }
) {
  const [listing] = await db
    .insert(schema.listings)
    .values({
      hostId,
      title: input.title,
      description: input.description,
      location: input.location,
      pricePerNight: input.pricePerNight,
      paymentAsset: input.paymentAsset,
      minStay: input.minStay,
      maxStay: input.maxStay,
      cancellationTerms: input.cancellationTerms,
      connectorRewardPercent: input.connectorRewardPercent,
      photos: input.photos,
    })
    .returning();

  if (input.availability.length > 0) {
    await db.insert(schema.listingAvailability).values(
      input.availability.map((a) => ({
        listingId: listing.id,
        startDate: new Date(a.startDate),
        endDate: new Date(a.endDate),
      }))
    );
  }

  return getListingForViewer(listing.id, hostId);
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

  return {
    ...mapListing(listing, listing.host ?? undefined),
    availability: availability.map((a) => ({
      id: a.id,
      listingId: a.listingId,
      startDate: a.startDate.toISOString(),
      endDate: a.endDate.toISOString(),
    })),
  };
}

export async function getMyListings(hostId: string) {
  const rows = await db.query.listings.findMany({
    where: eq(schema.listings.hostId, hostId),
    orderBy: [desc(schema.listings.createdAt)],
  });

  return rows.map((l) => mapListing(l));
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
  connectorId: string
) {
  const listing = await db.query.listings.findFirst({
    where: eq(schema.listings.id, listingId),
  });

  if (!listing) {
    throw new Error(LISTING_UNAVAILABLE);
  }

  const canShare = await canShareListing(
    connectorId,
    listingId,
    listing.hostId
  );

  if (!canShare) {
    throw new Error("Not authorized to share this listing");
  }

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

    if (!isFriend) {
      await db
        .insert(schema.shareIntroductions)
        .values({
          shareId: share.id,
          guestId,
          connectorId: share.connectorId,
          hostId: share.hostId,
          listingId: share.listingId,
        })
        .onConflictDoNothing();
    }
  }

  return {
    shareId: share.id,
    listingId: share.listingId,
    hostId: share.hostId,
    connectorId: share.connectorId,
    host: toUserResponse(share.host!),
    connector: toUserResponse(share.connector!),
    canViewListing,
    friendshipRequired,
    friendshipPending,
  };
}

export async function createBooking(
  guestId: string,
  input: { listingId: string; checkIn: string; checkOut: string }
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

  const checkIn = new Date(input.checkIn);
  const checkOut = new Date(input.checkOut);
  const nights = daysBetween(checkIn, checkOut);

  if (nights < listing.minStay || nights > listing.maxStay) {
    throw new Error("Stay length is outside listing limits");
  }

  const connectorId = await resolveConnectorForBooking(
    guestId,
    listing.id,
    listing.hostId
  );

  if (!connectorId) {
    throw new Error("No valid connector found for this booking");
  }

  const overlapping = await db.query.bookings.findFirst({
    where: and(
      eq(schema.bookings.listingId, listing.id),
      inArray(schema.bookings.status, ["pending", "funded", "confirmed"]),
      lt(schema.bookings.checkIn, checkOut),
      gt(schema.bookings.checkOut, checkIn)
    ),
  });

  if (overlapping) {
    throw new Error("Dates are not available");
  }

  const amounts = calculateBookingAmounts(
    listing.pricePerNight,
    nights,
    listing.connectorRewardPercent
  );

  const [booking] = await db
    .insert(schema.bookings)
    .values({
      listingId: listing.id,
      hostId: listing.hostId,
      guestId,
      connectorId,
      checkIn,
      checkOut,
      nights,
      totalPrice: amounts.totalPrice,
      connectorRewardPercent: listing.connectorRewardPercent,
      connectorRewardAmount: amounts.connectorRewardAmount,
      hostAmount: amounts.hostAmount,
      paymentAsset: listing.paymentAsset,
      status: "pending",
    })
    .returning();

  return mapBooking(booking);
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
    totalPrice: booking.totalPrice,
    connectorRewardPercent: booking.connectorRewardPercent,
    connectorRewardAmount: booking.connectorRewardAmount,
    hostAmount: booking.hostAmount,
    paymentAsset: booking.paymentAsset,
    status: booking.status,
    escrowBookingId: booking.escrowBookingId,
    fundTxHash: booking.fundTxHash,
    settleTxHash: booking.settleTxHash,
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
    booking.connectorId === userId;

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
