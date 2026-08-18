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
    throw new Error("You can’t message yourself.");
  }
  const friends = await areFriends(userId, friendId);
  if (!friends) {
    throw new Error(
      "You can only message friends — add them by Ready X wallet first."
    );
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
  if (!friend) throw new Error("This chat isn’t available.");

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
  const sealed = trimmed.startsWith("phx1.");
  const maxLen = sealed ? 8000 : 2000;
  if (!trimmed || trimmed.length > maxLen) {
    throw new Error(
      sealed
        ? "Sealed message payload too large"
        : "Message must be 1–2000 characters"
    );
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
    title: sealed ? "New sealed message" : "New message",
    body: sealed ? "Encrypted on your device — open chat to read" : trimmed.slice(0, 120),
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
    privacyMode?: "private" | "public";
  }
) {
  await requireFriendship(senderId, recipientId);

  const amount = input.amount.trim();
  if (!/^\d+(\.\d+)?$/.test(amount) || Number(amount) <= 0) {
    throw new Error("Enter a valid STRK or DAI amount");
  }
  if (!input.txHash || input.txHash.length < 10) {
    throw new Error("Send STRK or DAI needs a transaction hash.");
  }

  const mode = input.privacyMode === "private" ? "private" : "public";
  const body =
    mode === "private"
      ? `Sent ${amount} ${input.asset} (private)`
      : `Sent ${amount} ${input.asset}`;

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
    body:
      mode === "private"
        ? "A friend sent you a private STRK20 transfer."
        : "A friend sent you tokens in chat.",
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
  const body = `Book & pay for “${input.listingTitle}”: ${checkInDay} → ${checkOutDay} · ${input.totalPrice} ${input.paymentAsset} (host & connector paid now)`;

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
    title: "New Book & pay",
    body,
    href: `/bookings/${input.bookingId}`,
  });

  await createNotification({
    userId: input.guestId,
    type: "booking",
    title: "Book & pay complete",
    body,
    href: `/bookings/${input.bookingId}`,
  });

  return mapMessage(row);
}
