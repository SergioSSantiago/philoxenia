import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const paymentAssetEnum = pgEnum("payment_asset", ["STRK", "DAI"]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "funded",
  "confirmed",
  "completed",
  "cancelled",
  "refunded",
]);
export const friendRequestStatusEnum = pgEnum("friend_request_status", [
  "pending",
  "accepted",
  "rejected",
]);
export const shareStatusEnum = pgEnum("share_status", [
  "active",
  "expired",
  "revoked",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "confirmed",
  "failed",
]);
export const privacyModeEnum = pgEnum("privacy_mode", ["private", "public"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    walletAddress: text("wallet_address").notNull(),
    displayName: text("display_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("users_wallet_address_idx").on(table.walletAddress)]
);

export const friendRequests = pgTable("friend_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  fromUserId: uuid("from_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  toUserId: uuid("to_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: friendRequestStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userAId: uuid("user_a_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userBId: uuid("user_b_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("friendships_pair_idx").on(table.userAId, table.userBId),
  ]
);

export const listings = pgTable("listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  hostId: uuid("host_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  pricePerNight: numeric("price_per_night", { precision: 78, scale: 18 }).notNull(),
  paymentAsset: paymentAssetEnum("payment_asset").notNull(),
  minStay: integer("min_stay").notNull(),
  maxStay: integer("max_stay").notNull(),
  cancellationTerms: text("cancellation_terms").notNull(),
  connectorRewardPercent: integer("connector_reward_percent").notNull(),
  photos: text("photos").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const listingAvailability = pgTable("listing_availability", {
  id: uuid("id").defaultRandom().primaryKey(),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
});

export const listingShares = pgTable(
  "listing_shares",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    hostId: uuid("host_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    connectorId: uuid("connector_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    status: shareStatusEnum("status").notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("listing_shares_token_idx").on(table.token)]
);

export const shareIntroductions = pgTable(
  "share_introductions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shareId: uuid("share_id")
      .notNull()
      .references(() => listingShares.id, { onDelete: "cascade" }),
    guestId: uuid("guest_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    connectorId: uuid("connector_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    hostId: uuid("host_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("share_introductions_guest_listing_idx").on(
      table.guestId,
      table.listingId
    ),
  ]
);

export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  hostId: uuid("host_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  guestId: uuid("guest_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Null when booking is direct (no intermediary connector). */
  connectorId: uuid("connector_id").references(() => users.id, {
    onDelete: "set null",
  }),
  checkIn: timestamp("check_in", { withTimezone: true }).notNull(),
  checkOut: timestamp("check_out", { withTimezone: true }).notNull(),
  nights: integer("nights").notNull(),
  totalPrice: numeric("total_price", { precision: 78, scale: 18 }).notNull(),
  connectorRewardPercent: integer("connector_reward_percent").notNull(),
  connectorRewardAmount: numeric("connector_reward_amount", {
    precision: 78,
    scale: 18,
  }).notNull(),
  protocolFeeAmount: numeric("protocol_fee_amount", {
    precision: 78,
    scale: 18,
  })
    .notNull()
    .default("0"),
  protocolFeePercent: integer("protocol_fee_percent").notNull().default(0),
  hostAmount: numeric("host_amount", { precision: 78, scale: 18 }).notNull(),
  paymentAsset: paymentAssetEnum("payment_asset").notNull(),
  status: bookingStatusEnum("status").notNull().default("pending"),
  escrowBookingId: text("escrow_booking_id"),
  fundTxHash: text("fund_tx_hash"),
  settleTxHash: text("settle_tx_hash"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 78, scale: 18 }).notNull(),
  asset: paymentAssetEnum("asset").notNull(),
  txHash: text("tx_hash"),
  privacyMode: privacyModeEnum("privacy_mode").notNull().default("public"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const authNonces = pgTable(
  "auth_nonces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    walletAddress: text("wallet_address").notNull(),
    nonce: text("nonce").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("auth_nonces_wallet_idx").on(table.walletAddress)]
);
