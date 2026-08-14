export type PaymentAsset = "STRK" | "DAI";

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

export interface Listing {
  id: string;
  hostId: string;
  title: string;
  description: string;
  location: string;
  pricePerNight: string;
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
}

export interface ListingShare {
  id: string;
  listingId: string;
  hostId: string;
  connectorId: string;
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
  connectorId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: string;
  connectorRewardPercent: number;
  connectorRewardAmount: string;
  hostAmount: string;
  paymentAsset: PaymentAsset;
  status: BookingStatus;
  escrowBookingId: string | null;
  fundTxHash: string | null;
  settleTxHash: string | null;
  createdAt: string;
  listing?: Listing;
  host?: User;
  guest?: User;
  connector?: User;
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
  pricePerNight: string;
  paymentAsset: PaymentAsset;
  minStay: number;
  maxStay: number;
  cancellationTerms: string;
  connectorRewardPercent: number;
  photos: string[];
  availability: { startDate: string; endDate: string }[];
}

export interface CreateBookingInput {
  listingId: string;
  checkIn: string;
  checkOut: string;
}

export interface InviteResolution {
  shareId: string;
  listingId: string;
  hostId: string;
  connectorId: string;
  host: User;
  connector: User;
  canViewListing: boolean;
  friendshipRequired: boolean;
  friendshipPending: boolean;
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
