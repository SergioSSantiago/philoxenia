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
    /** SPKI public key (base64url) for sealed E2E chat — private key stays on device. */
    messagePublicKey: text("message_public_key"),
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
  locationLat: numeric("location_lat", { precision: 10, scale: 7 }),
  locationLng: numeric("location_lng", { precision: 10, scale: 7 }),
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

/** Bookable nights with optional per-night DAI price (defaults to listing price). */
export const listingAvailableDays = pgTable(
  "listing_available_days",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    /** Calendar night (UTC date YYYY-MM-DD stored as timestamptz noon). */
    day: timestamp("day", { withTimezone: true }).notNull(),
    pricePerNight: numeric("price_per_night", {
      precision: 78,
      scale: 18,
    }).notNull(),
  },
  (table) => [
    uniqueIndex("listing_available_days_listing_day_idx").on(
      table.listingId,
      table.day
    ),
  ]
);

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
    connectorId: uuid("connector_id").references(() => users.id, {
      onDelete: "cascade",
    }),
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
    /** Null when the host shared (no connector reward). */
    connectorId: uuid("connector_id").references(() => users.id, {
      onDelete: "cascade",
    }),
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
  /** Explicit stay nights (YYYY-MM-DD); may be non-contiguous. */
  selectedNights: text("selected_nights").array().notNull().default([]),
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
  /** Listing-currency total (DAI) before FX. */
  totalPriceDai: numeric("total_price_dai", { precision: 78, scale: 18 }),
  /** STRK per 1 DAI at fund time (null when paid in DAI 1:1). */
  fxRate: numeric("fx_rate", { precision: 78, scale: 18 }),
  status: bookingStatusEnum("status").notNull().default("pending"),
  escrowBookingId: text("escrow_booking_id"),
  fundTxHash: text("fund_tx_hash"),
  settleTxHash: text("settle_tx_hash"),
  refundTxHash: text("refund_tx_hash"),
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

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
    index("notifications_user_unread_idx").on(table.userId, table.readAt),
  ]
);

export const messageKindEnum = pgEnum("message_kind", [
  "text",
  "transfer",
  "booking",
]);

/** Direct messages between friends (text, peer transfers, booking notices). */
export const directMessages = pgTable(
  "direct_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: messageKindEnum("kind").notNull().default("text"),
    body: text("body").notNull(),
    asset: paymentAssetEnum("asset"),
    amount: numeric("amount", { precision: 78, scale: 18 }),
    txHash: text("tx_hash"),
    bookingId: uuid("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("direct_messages_pair_idx").on(table.senderId, table.recipientId),
    index("direct_messages_recipient_idx").on(table.recipientId),
  ]
);

/** Structured security / ops audit trail (payment verify, cancel, auth spikes). */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    meta: text("meta"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_created_idx").on(table.createdAt),
  ]
);
