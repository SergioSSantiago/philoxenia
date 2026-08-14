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

const ESCROW =
  process.env.NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS ?? "";
const STRK_TOKEN =
  process.env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS ??
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d1ab4b5195650d67ce8d3";
const DAI_TOKEN = process.env.NEXT_PUBLIC_DAI_TOKEN_ADDRESS ?? "";
const PRIVACY_ENABLED = process.env.NEXT_PUBLIC_STRK20_PRIVACY !== "false";

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const { account, address } = useAccount();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [privacyMode, setPrivacyMode] = useState<"private" | "public">(
    "public"
  );

  useEffect(() => {
    if (!token) {
      router.replace("/auth");
      return;
    }
    api
      .get<Booking>(`/bookings/${params.id}`)
      .then(setBooking)
      .catch(() => setError("Booking not found"));
  }, [token, params.id, router]);

  async function payBooking() {
    if (!booking || !account || !address) return;

    if (!ESCROW) {
      setError(
        "Escrow contract not configured. Deploy contracts locally and set NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS."
      );
      return;
    }

    setPaying(true);
    setError("");

    try {
      const tokenAddress =
        booking.paymentAsset === "DAI" ? DAI_TOKEN : STRK_TOKEN;

      if (!tokenAddress) {
        throw new Error(`${booking.paymentAsset} token address not configured`);
      }

      const provider = createPaymentProvider(
        booking.paymentAsset,
        account,
        tokenAddress,
        PRIVACY_ENABLED
      );

      const onChainBookingId = BigInt(
        `0x${booking.id.replace(/-/g, "").slice(0, 16)}`
      ).toString();

      const result = await provider.fundBooking({
        bookingId: booking.id,
        escrowAddress: ESCROW,
        tokenAddress,
        amount: booking.totalPrice,
        asset: booking.paymentAsset,
        guestAddress: address,
        onChainBookingId,
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
      setPaying(false);
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
            <span className="text-muted">Accommodation</span>
            <span>
              {booking.hostAmount} {booking.paymentAsset}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">
              Connector reward ({booking.connectorRewardPercent}%)
            </span>
            <span>
              {booking.connectorRewardAmount} {booking.paymentAsset}
            </span>
          </div>
          <div className="flex justify-between font-medium text-base pt-2">
            <span>Total</span>
            <span>
              {booking.totalPrice} {booking.paymentAsset}
            </span>
          </div>
          <p className="text-xs text-muted pt-1">
            Philoxenia protocol fee: 0%
          </p>
        </div>

        {booking.fundTxHash && (
          <p className="text-sm">
            {privacyLabel(
              booking.status === "pending" ? privacyMode : "public"
            )}
            {booking.fundTxHash && (
              <span className="block mt-1 font-mono text-xs text-muted break-all">
                Tx: {booking.fundTxHash}
              </span>
            )}
          </p>
        )}

        {isGuest && booking.status === "pending" && (
          <Button onClick={payBooking} disabled={paying || !account}>
            {paying ? "Processing…" : "Pay privately"}
          </Button>
        )}

        {error && <p className="text-sm text-red-700">{error}</p>}
      </Card>
    </Shell>
  );
}
