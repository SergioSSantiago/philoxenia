import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { areFriends } from "../lib/authorization.js";
import { createNotification } from "./notifications.js";
import { toUserResponse } from "./auth.js";

function mapMessage(
  row: typeof schema.directMessages.$inferSelect,
  relations?: {
    sender?: typeof schema.users.$inferSelect;
    recipient?: typeof schema.users.$inferSelect;
  }
) {
  return {
    id: row.id,
    senderId: row.senderId,
    recipientId: row.recipientId,
    kind: row.kind,
    body: row.body,
    asset: row.asset,
    amount: row.amount,
    txHash: row.txHash,
    bookingId: row.bookingId,
    createdAt: row.createdAt.toISOString(),
    sender: relations?.sender ? toUserResponse(relations.sender) : undefined,
    recipient: relations?.recipient
      ? toUserResponse(relations.recipient)
      : undefined,
  };
}

async function requireFriendship(userId: string, friendId: string) {
  if (userId === friendId) {
    throw new Error("Cannot message yourself");
  }
  const friends = await areFriends(userId, friendId);
  if (!friends) {
    throw new Error("You can only message friends");
  }
}

export async function listMessageThreads(userId: string) {
  const friendships = await db.query.friendships.findMany({
    where: or(
      eq(schema.friendships.userAId, userId),
      eq(schema.friendships.userBId, userId)
    ),
  });

  const friendIds = friendships.map((f) =>
    f.userAId === userId ? f.userBId : f.userAId
  );

  if (friendIds.length === 0) return [];

  const friendUsers = await db.query.users.findMany({
    where: inArray(schema.users.id, friendIds),
  });

  const threads = await Promise.all(
    friendUsers.map(async (friend) => {
      const last = await db.query.directMessages.findFirst({
        where: or(
          and(
            eq(schema.directMessages.senderId, userId),
            eq(schema.directMessages.recipientId, friend.id)
          ),
          and(
            eq(schema.directMessages.senderId, friend.id),
            eq(schema.directMessages.recipientId, userId)
          )
        ),
        orderBy: [desc(schema.directMessages.createdAt)],
      });

      return {
        friend: toUserResponse(friend),
        lastMessage: last ? mapMessage(last) : null,
      };
    })
  );

  threads.sort((a, b) => {
    const ta = a.lastMessage?.createdAt ?? "";
    const tb = b.lastMessage?.createdAt ?? "";
    return tb.localeCompare(ta);
  });

  return threads;
}

export async function getConversation(userId: string, friendId: string) {
  await requireFriendship(userId, friendId);

  const friend = await db.query.users.findFirst({
    where: eq(schema.users.id, friendId),
  });
  if (!friend) throw new Error("User not found");

  const rows = await db.query.directMessages.findMany({
    where: or(
      and(
        eq(schema.directMessages.senderId, userId),
        eq(schema.directMessages.recipientId, friendId)
      ),
      and(
        eq(schema.directMessages.senderId, friendId),
        eq(schema.directMessages.recipientId, userId)
      )
    ),
    with: { sender: true, recipient: true },
    orderBy: [asc(schema.directMessages.createdAt)],
    limit: 200,
  });

  return {
    friend: toUserResponse(friend),
    messages: rows.map((m) =>
      mapMessage(m, {
        sender: m.sender ?? undefined,
        recipient: m.recipient ?? undefined,
      })
    ),
  };
}

export async function sendTextMessage(
  senderId: string,
  recipientId: string,
  body: string
) {
  await requireFriendship(senderId, recipientId);
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 2000) {
    throw new Error("Message must be 1–2000 characters");
  }

  const [row] = await db
    .insert(schema.directMessages)
    .values({
      senderId,
      recipientId,
      kind: "text",
      body: trimmed,
    })
    .returning();

  await createNotification({
    userId: recipientId,
    type: "message",
    title: "New message",
    body: trimmed.slice(0, 120),
    href: `/messages/${senderId}`,
  });

  return mapMessage(row);
}

export async function recordTransferMessage(
  senderId: string,
  recipientId: string,
  input: {
    amount: string;
    asset: "STRK" | "DAI";
    txHash: string;
  }
) {
  await requireFriendship(senderId, recipientId);

  const amount = input.amount.trim();
  if (!/^\d+(\.\d+)?$/.test(amount) || Number(amount) <= 0) {
    throw new Error("Invalid amount");
  }
  if (!input.txHash || input.txHash.length < 10) {
    throw new Error("Transaction hash required");
  }

  const body = `Sent ${amount} ${input.asset}`;

  const [row] = await db
    .insert(schema.directMessages)
    .values({
      senderId,
      recipientId,
      kind: "transfer",
      body,
      asset: input.asset,
      amount,
      txHash: input.txHash,
    })
    .returning();

  await createNotification({
    userId: recipientId,
    type: "transfer",
    title: `Received ${amount} ${input.asset}`,
    body: "A friend sent you tokens in chat.",
    href: `/messages/${senderId}`,
  });

  return mapMessage(row);
}

export async function postBookingChatNotice(input: {
  guestId: string;
  hostId: string;
  bookingId: string;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  totalPrice: string;
  paymentAsset: "STRK" | "DAI";
}) {
  const checkInDay = input.checkIn.slice(0, 10);
  const checkOutDay = input.checkOut.slice(0, 10);
  const body = `Booking paid for “${input.listingTitle}”: ${checkInDay} → ${checkOutDay} · ${input.totalPrice} ${input.paymentAsset} (host & connector paid now)`;

  const [row] = await db
    .insert(schema.directMessages)
    .values({
      senderId: input.guestId,
      recipientId: input.hostId,
      kind: "booking",
      body,
      bookingId: input.bookingId,
      asset: input.paymentAsset,
      amount: input.totalPrice,
    })
    .returning();

  await createNotification({
    userId: input.hostId,
    type: "booking",
    title: "New booking",
    body,
    href: `/bookings/${input.bookingId}`,
  });

  await createNotification({
    userId: input.guestId,
    type: "booking",
    title: "Booking created",
    body,
    href: `/bookings/${input.bookingId}`,
  });

  return mapMessage(row);
}
