export type PaymentAsset = "STRK" | "DAI";

export {
  buildPhiloxeniaAuthTypedData,
  resolveSnip12ChainId,
  type Snip12ChainId,
} from "./auth-typed-data.js";
export {
  getStarknetMainnetRpcUrl,
  getStarknetSepoliaRpcUrl,
  publicMainnetRpcFallback,
} from "./starknet-rpc.js";
export {
  PROTOCOL_FEE_PERCENT_OF_CONNECTOR,
  percentToBps,
} from "./fees.js";
export { formatTokenAmount, formatDaiPrice } from "./format.js";

export type BookingStatus =
  | "pending"
  | "funded"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "refunded";

export type FriendRequestStatus = "pending" | "accepted" | "rejected";

export type ShareStatus = "active" | "expired" | "revoked";

export interface User {
  id: string;
  walletAddress: string;
  displayName: string;
  /** Base64url SPKI — for sealed E2E chat. Null until published from the device. */
  messagePublicKey?: string | null;
  createdAt: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: FriendRequestStatus;
  createdAt: string;
  fromUser?: User;
  toUser?: User;
}

export type NotificationType =
  | "friend_request"
  | "friend_accepted"
  | "friend_rejected"
  | "friend_cancelled"
  | "message"
  | "transfer"
  | "booking";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType | string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export type MessageKind = "text" | "transfer" | "booking";

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  kind: MessageKind;
  body: string;
  asset: PaymentAsset | null;
  amount: string | null;
  txHash: string | null;
  bookingId: string | null;
  createdAt: string;
  sender?: User;
  recipient?: User;
}

export interface ChatThread {
  friend: User;
  lastMessage: ChatMessage | null;
}

export interface ChatConversation {
  friend: User;
  messages: ChatMessage[];
}

export interface Friendship {
  id: string;
  userAId: string;
  userBId: string;
  createdAt: string;
  friend?: User;
}

export interface ListingAvailability {
  id: string;
  listingId: string;
  startDate: string;
  endDate: string;
}

export interface ListingAvailableDay {
  id: string;
  listingId: string;
  /** YYYY-MM-DD night */
  day: string;
  pricePerNight: string;
  /** True when a paid booking already occupies this night */
  booked?: boolean;
}

export interface Listing {
  id: string;
  hostId: string;
  title: string;
  description: string;
  location: string;
  /** WGS84 latitude when set via map picker. */
  locationLat: string | null;
  /** WGS84 longitude when set via map picker. */
  locationLng: string | null;
  pricePerNight: string;
  /** Unit of account for pricing is DAI; guests may pay in DAI or STRK. */
  paymentAsset: PaymentAsset;
  minStay: number;
  maxStay: number;
  cancellationTerms: string;
  connectorRewardPercent: number;
  photos: string[];
  createdAt: string;
  updatedAt: string;
  host?: User;
  availability?: ListingAvailability[];
  /** Per-night inventory with prices (preferred). */
  availableDays?: ListingAvailableDay[];
  /** Paid bookings that occupy dates (funded / confirmed / completed). */
  bookedRanges?: {
    bookingId: string;
    checkIn: string;
    checkOut: string;
    nights: string[];
    status: BookingStatus;
  }[];
}

export interface ListingShare {
  id: string;
  listingId: string;
  hostId: string;
  /** Null when the host shared (shareable link, no connector reward). */
  connectorId: string | null;
  token: string;
  status: ShareStatus;
  expiresAt: string | null;
  createdAt: string;
  listing?: Listing;
  connector?: User;
  host?: User;
}

export interface Booking {
  id: string;
  listingId: string;
  hostId: string;
  guestId: string;
  /** Null when host and guest book directly (no intermediary). */
  connectorId: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  /** Explicit nights paid for (YYYY-MM-DD); may be non-contiguous. */
  selectedNights?: string[];
  /** Amount funded on-chain in `paymentAsset` (STRK after FX). */
  totalPrice: string;
  /** Listing total in DAI before FX. */
  totalPriceDai: string | null;
  /** STRK per 1 DAI at fund time. */
  fxRate: string | null;
  /** Listing connector reward %, applied only when a connector is present. */
  connectorRewardPercent: number;
  /** Net amount paid to the connector after protocol take. */
  connectorRewardAmount: string;
  /** Philoxenia take: 10% of the connector reward (0 if no connector). */
  protocolFeeAmount: string;
  /** Protocol take as % of connector reward (always 10 when connector present). */
  protocolFeePercent: number;
  hostAmount: string;
  paymentAsset: PaymentAsset;
  status: BookingStatus;
  /** From the confirmed payment row; null if no payment recorded. */
  privacyMode: "private" | "public" | null;
  escrowBookingId: string | null;
  fundTxHash: string | null;
  settleTxHash: string | null;
  refundTxHash: string | null;
  createdAt: string;
  listing?: Listing;
  host?: User;
  guest?: User;
  connector?: User;
}

export interface BookingQuote {
  listingId: string;
  hostId: string;
  checkIn: string;
  checkOut: string;
  selectedNights: string[];
  nights: number;
  pricePerNightDai: string;
  totalPriceDai: string;
  totalPriceStrk: string;
  /** On-chain escrow asset the guest pays with (STRK or DAI). */
  paymentAsset: PaymentAsset;
  displayAsset: PaymentAsset;
  fxRate: string;
  fxUsdPerStrk: number | null;
  fxUsdPerDai: number | null;
  fxSource: string;
  fxFetchedAt: string;
  connectorId: string | null;
  connectorWallet: string | null;
  hasConnector: boolean;
  connectorRewardPercent: number;
  connectorRewardAmount: string;
  protocolFeeAmount: string;
  protocolFeePercent: number;
  hostAmount: string;
  totalPrice: string;
  nightBreakdown: { day: string; pricePerNight: string }[];
  note: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: string;
  asset: PaymentAsset;
  txHash: string | null;
  privacyMode: "private" | "public";
  status: "pending" | "confirmed" | "failed";
  createdAt: string;
}

export interface AuthChallenge {
  message: string;
  nonce: string;
  expiresAt: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface CreateListingInput {
  title: string;
  description: string;
  location: string;
  locationLat?: number | null;
  locationLng?: number | null;
  pricePerNight: string;
  /** Optional listing default; pricing is DAI-denominated. Guests choose STRK or DAI when booking. */
  paymentAsset?: PaymentAsset;
  /** Optional; derived from availability when omitted. */
  minStay?: number;
  maxStay?: number;
  cancellationTerms: string;
  connectorRewardPercent: number;
  photos: string[];
  availability: { startDate: string; endDate: string }[];
}

export interface CreateBookingInput {
  listingId: string;
  checkIn: string;
  checkOut: string;
  /** Guest-chosen settlement asset. */
  paymentAsset?: PaymentAsset;
}

export interface InviteResolution {
  shareId: string;
  listingId: string;
  hostId: string;
  /** Null when the host shared the link (no connector reward). */
  connectorId: string | null;
  hasConnector: boolean;
  host: User;
  connector: User | null;
  canViewListing: boolean;
  friendshipRequired: boolean;
  friendshipPending: boolean;
}

export interface NetworkStats {
  users: number;
  countries: number;
  /** Listings with ≥1 inventory night today or later. */
  listingsOpen: number;
  /** Sum of nights on paid bookings (funded / confirmed / completed). */
  nightsBooked: number;
  transferredDai: string;
  transferredStrk: string;
  updatedAt: string;
}

export type PaymentCapability =
  | "shield"
  | "unshield"
  | "privateTransfer"
  | "publicTransfer"
  | "getPrivateBalance"
  | "getPublicBalance"
  | "viewingKey"
  | "disclosure"
  | "paymentStatus";

export interface PaymentProviderCapabilities {
  asset: PaymentAsset;
  privacySupported: boolean;
  capabilities: PaymentCapability[];
}

export interface ApiError {
  error: string;
  code?: string;
}
