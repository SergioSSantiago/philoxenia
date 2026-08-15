import type {
  PaymentAsset,
  PaymentCapability,
  PaymentProviderCapabilities,
} from "@philoxenia/shared";

export type { PaymentCapability, PaymentProviderCapabilities };

export interface PaymentStatus {
  status: "pending" | "confirmed" | "failed";
  txHash?: string;
  privacyMode: "private" | "public";
}

export interface FundBookingParams {
  bookingId: string;
  escrowAddress: string;
  tokenAddress: string;
  amount: string;
  asset: PaymentAsset;
  guestAddress: string;
  hostAddress: string;
  /** Zero / omitted when there is no intermediary connector. */
  connectorAddress?: string | null;
  connectorRewardPercent: number;
  onChainBookingId: string;
  onChainListingId: string;
}

export interface PaymentProvider {
  readonly asset: PaymentAsset;
  getCapabilities(): PaymentProviderCapabilities;
  fundBooking(params: FundBookingParams): Promise<PaymentStatus>;
  getPublicBalance(address: string): Promise<string>;
  getPrivateBalance?(): Promise<string | null>;
}

export function hasCapability(
  provider: PaymentProvider,
  capability: PaymentCapability
): boolean {
  return provider.getCapabilities().capabilities.includes(capability);
}

export function privacyLabel(mode: "private" | "public"): string {
  return mode === "private" ? "Private payment" : "Standard payment";
}
