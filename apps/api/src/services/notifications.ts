import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  href?: string | null;
}) {
  const [row] = await db
    .insert(schema.notifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
    })
    .returning();

  return mapNotification(row);
}

export async function listNotifications(userId: string, limit = 30) {
  const rows = await db.query.notifications.findMany({
    where: eq(schema.notifications.userId, userId),
    orderBy: [desc(schema.notifications.createdAt)],
    limit,
  });
  return rows.map(mapNotification);
}

export async function unreadNotificationCount(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.userId, userId),
        isNull(schema.notifications.readAt)
      )
    );
  return row?.count ?? 0;
}

export async function markNotificationRead(
  notificationId: string,
  userId: string
) {
  const [row] = await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.notifications.id, notificationId),
        eq(schema.notifications.userId, userId)
      )
    )
    .returning();
  return row ? mapNotification(row) : null;
}

export async function markAllNotificationsRead(userId: string) {
  await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.notifications.userId, userId),
        isNull(schema.notifications.readAt)
      )
    );
  return { success: true };
}

function mapNotification(row: typeof schema.notifications.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
