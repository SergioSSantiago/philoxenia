import { relations } from "drizzle-orm";
import * as schema from "./schema.js";

export const usersRelations = relations(schema.users, ({ many }) => ({
  hostedListings: many(schema.listings),
  friendRequestsSent: many(schema.friendRequests, { relationName: "fromUser" }),
  friendRequestsReceived: many(schema.friendRequests, {
    relationName: "toUser",
  }),
}));

export const friendRequestsRelations = relations(
  schema.friendRequests,
  ({ one }) => ({
    fromUser: one(schema.users, {
      fields: [schema.friendRequests.fromUserId],
      references: [schema.users.id],
      relationName: "fromUser",
    }),
    toUser: one(schema.users, {
      fields: [schema.friendRequests.toUserId],
      references: [schema.users.id],
      relationName: "toUser",
    }),
  })
);

export const listingsRelations = relations(schema.listings, ({ one, many }) => ({
  host: one(schema.users, {
    fields: [schema.listings.hostId],
    references: [schema.users.id],
  }),
  availability: many(schema.listingAvailability),
  shares: many(schema.listingShares),
  bookings: many(schema.bookings),
}));

export const listingSharesRelations = relations(
  schema.listingShares,
  ({ one }) => ({
    listing: one(schema.listings, {
      fields: [schema.listingShares.listingId],
      references: [schema.listings.id],
    }),
    host: one(schema.users, {
      fields: [schema.listingShares.hostId],
      references: [schema.users.id],
    }),
    connector: one(schema.users, {
      fields: [schema.listingShares.connectorId],
      references: [schema.users.id],
    }),
  })
);

export const bookingsRelations = relations(schema.bookings, ({ one }) => ({
  listing: one(schema.listings, {
    fields: [schema.bookings.listingId],
    references: [schema.listings.id],
  }),
  host: one(schema.users, {
    fields: [schema.bookings.hostId],
    references: [schema.users.id],
  }),
  guest: one(schema.users, {
    fields: [schema.bookings.guestId],
    references: [schema.users.id],
  }),
  connector: one(schema.users, {
    fields: [schema.bookings.connectorId],
    references: [schema.users.id],
  }),
}));
