"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "@starknet-react/core";
import type { Booking } from "@philoxenia/shared";
import { Shell, Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { createPaymentProvider } from "@/lib/payments/strk20-payment-provider";
import { privacyLabel } from "@/lib/payments/payment-provider";
import {
  onChainIdFromUuid,
  refundEscrowBooking,
  settleEscrowBooking,
} from "@/lib/payments/escrow-actions";
import {
  STRK20_PRIVACY_ENABLED,
  tokenAddressForAsset,
} from "@/lib/tokens";

const ESCROW = process.env.NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS ?? "";

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const { account, address } = useAccount();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [privacyMode, setPrivacyMode] = useState<"private" | "public">(
    "public"
  );

  useEffect(() => {
    if (!token) {
      router.replace("/home");
      return;
    }
    api
      .get<Booking>(`/bookings/${params.id}`)
      .then(setBooking)
      .catch(() => setError("Booking not found"));
  }, [token, params.id, router]);

  function requireEscrow() {
    if (!ESCROW) {
      throw new Error(
        "Escrow contract not configured. Deploy contracts locally and set NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS."
      );
    }
  }

  function resolveOnChainBookingId(b: Booking): string {
    return b.escrowBookingId ?? onChainIdFromUuid(b.id);
  }

  async function payBooking() {
    if (!booking || !account || !address) return;

    setBusy(true);
    setError("");

    try {
      requireEscrow();
      const tokenAddress = tokenAddressForAsset(booking.paymentAsset);

      if (!tokenAddress) {
        throw new Error(`${booking.paymentAsset} token address not configured`);
      }

      const provider = createPaymentProvider(
        booking.paymentAsset,
        account,
        tokenAddress,
        STRK20_PRIVACY_ENABLED
      );

      const onChainBookingId = onChainIdFromUuid(booking.id);
      const onChainListingId = onChainIdFromUuid(booking.listingId);

      if (!booking.host?.walletAddress) {
        throw new Error("Host wallet address missing on booking");
      }

      const result = await provider.fundBooking({
        bookingId: booking.id,
        escrowAddress: ESCROW,
        tokenAddress,
        amount: booking.totalPrice,
        asset: booking.paymentAsset,
        guestAddress: address,
        hostAddress: booking.host.walletAddress,
        connectorAddress: booking.connector?.walletAddress ?? null,
        connectorRewardPercent: booking.connectorRewardPercent,
        onChainBookingId,
        onChainListingId,
      });

      setPrivacyMode(result.privacyMode);

      if (result.txHash) {
        const updated = await api.post<Booking>(
          `/bookings/${booking.id}/fund`,
          {
            fundTxHash: result.txHash,
            escrowBookingId: onChainBookingId,
            privacyMode: result.privacyMode,
          }
        );
        setBooking(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  async function settleBooking() {
    if (!booking || !account) return;

    setBusy(true);
    setError("");

    try {
      requireEscrow();
      const onChainBookingId = resolveOnChainBookingId(booking);
      const settleTxHash = await settleEscrowBooking(
        account,
        ESCROW,
        onChainBookingId
      );
      const updated = await api.post<Booking>(
        `/bookings/${booking.id}/settle`,
        { settleTxHash }
      );
      setBooking(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Settle failed");
    } finally {
      setBusy(false);
    }
  }

  async function refundBooking() {
    if (!booking || !account) return;

    setBusy(true);
    setError("");

    try {
      requireEscrow();
      const onChainBookingId = resolveOnChainBookingId(booking);
      const refundTxHash = await refundEscrowBooking(
        account,
        ESCROW,
        onChainBookingId
      );
      const updated = await api.post<Booking>(
        `/bookings/${booking.id}/refund`,
        { refundTxHash }
      );
      setBooking(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refund failed");
    } finally {
      setBusy(false);
    }
  }

  if (error && !booking) {
    return (
      <Shell>
        <p className="text-muted">{error}</p>
      </Shell>
    );
  }

  if (!booking) {
    return (
      <Shell>
        <p className="text-muted">Loading…</p>
      </Shell>
    );
  }

  const isGuest = user?.id === booking.guestId;
  const isHost = user?.id === booking.hostId;

  return (
    <Shell>
      <h1 className="text-4xl mb-2">Booking</h1>
      <p className="text-muted mb-8">
        {booking.listing?.title ?? "Private listing"}
      </p>

      <Card className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-muted">Check-in</p>
            <p>{new Date(booking.checkIn).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-muted">Check-out</p>
            <p>{new Date(booking.checkOut).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-muted">Nights</p>
            <p>{booking.nights}</p>
          </div>
          <div>
            <p className="text-muted">Status</p>
            <p className="capitalize">{booking.status}</p>
          </div>
        </div>

        <hr className="border-border" />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Host receives</span>
            <span>
              {booking.hostAmount} {booking.paymentAsset}
            </span>
          </div>
          {booking.connectorId ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted">
                  Connector ({booking.connectorRewardPercent}% − protocol take)
                </span>
                <span>
                  {booking.connectorRewardAmount} {booking.paymentAsset}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">
                  Philoxenia ({booking.protocolFeePercent}% of connector reward)
                </span>
                <span>
                  {booking.protocolFeeAmount} {booking.paymentAsset}
                </span>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted">
              Direct booking — no connector. Protocol fee: 0%.
            </p>
          )}
          <div className="flex justify-between font-medium text-base pt-2">
            <span>Total</span>
            <span>
              {booking.totalPrice} {booking.paymentAsset}
            </span>
          </div>
        </div>

        {booking.fundTxHash && (
          <p className="text-sm">
            {privacyLabel(
              booking.status === "pending" ? privacyMode : "public"
            )}
            <span className="block mt-1 font-mono text-xs text-muted break-all">
              Fund tx: {booking.fundTxHash}
            </span>
          </p>
        )}

        {booking.settleTxHash && (
          <p className="text-sm font-mono text-xs text-muted break-all">
            Settle tx: {booking.settleTxHash}
          </p>
        )}

        {booking.refundTxHash && (
          <p className="text-sm font-mono text-xs text-muted break-all">
            Refund tx: {booking.refundTxHash}
          </p>
        )}

        {isGuest && booking.status === "pending" && (
          <Button onClick={payBooking} disabled={busy || !account}>
            {busy
              ? "Processing…"
              : booking.paymentAsset === "STRK" && STRK20_PRIVACY_ENABLED
                ? "Pay with STRK (privacy)"
                : `Pay with ${booking.paymentAsset}`}
          </Button>
        )}

        {isGuest && booking.status === "funded" && (
          <Button onClick={settleBooking} disabled={busy || !account}>
            {busy ? "Settling…" : "Settle booking"}
          </Button>
        )}

        {isHost && booking.status === "funded" && (
          <Button onClick={refundBooking} disabled={busy || !account}>
            {busy ? "Refunding…" : "Refund guest"}
          </Button>
        )}

        {error && <p className="text-sm text-red-700">{error}</p>}
      </Card>
    </Shell>
  );
}
