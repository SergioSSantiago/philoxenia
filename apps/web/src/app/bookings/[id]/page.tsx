"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { Booking } from "@philoxenia/shared";
import { formatTokenAmount } from "@philoxenia/shared";
import { Shell, Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

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

  async function socialCancel() {
    if (!booking) return;
    setBusy(true);
    setError("");
    setOk("");
    try {
      const updated = await api.post<Booking>(
        `/bookings/${booking.id}/social-cancel`
      );
      setBooking(updated);
      setOk(
        "Marked cancelled — nights are free again. Agree any money return in Messages and send DAI/STRK there."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
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
  const otherId = isGuest ? booking.hostId : booking.guestId;
  const canCancel = ["funded", "confirmed", "completed"].includes(
    booking.status
  );

  return (
    <Shell>
      <h1 className="mb-2 text-4xl">Booking</h1>
      <p className="mb-8 text-muted">
        {booking.listing?.title ?? "Private listing"}
      </p>

      <Card className="space-y-4">
        <div className="grid gap-4 text-sm sm:grid-cols-2">
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
            {booking.selectedNights && booking.selectedNights.length > 0 && (
              <p className="mt-1 text-xs text-muted leading-relaxed">
                {booking.selectedNights
                  .map((d) =>
                    new Date(`${d.slice(0, 10)}T12:00:00.000Z`).toLocaleDateString(
                      undefined,
                      {
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      }
                    )
                  )
                  .join(" · ")}
              </p>
            )}
          </div>
          <div>
            <p className="text-muted">Status</p>
            <p className="capitalize">{booking.status}</p>
          </div>
          <div>
            <p className="text-muted">Payment privacy</p>
            <p>
              {booking.privacyMode === "private"
                ? "Private (STRK20)"
                : booking.privacyMode === "public"
                  ? "Public ERC-20"
                  : "—"}
            </p>
          </div>
        </div>

        <hr className="border-border" />

        <div className="space-y-2 text-sm">
          {booking.totalPriceDai && (
            <div className="flex justify-between">
              <span className="text-muted">List total (DAI)</span>
              <span>{formatTokenAmount(booking.totalPriceDai)} DAI</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted">Host received</span>
            <span>
              {formatTokenAmount(booking.hostAmount)} {booking.paymentAsset}
            </span>
          </div>
          {booking.connectorId ? (
            <div className="flex justify-between">
              <span className="text-muted">
                Connector received ({booking.connectorRewardPercent}%)
              </span>
              <span>
                {formatTokenAmount(booking.connectorRewardAmount)}{" "}
                {booking.paymentAsset}
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted">Direct booking — no connector.</p>
          )}
          <div className="flex justify-between pt-2 text-base font-medium">
            <span>Paid at booking</span>
            <span>
              {formatTokenAmount(booking.totalPrice)} {booking.paymentAsset}
            </span>
          </div>
        </div>

        {booking.fundTxHash && (
          <p className="break-all font-mono text-xs text-muted">
            Tx:{" "}
            <a
              href={`https://voyager.online/tx/${booking.fundTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline-offset-2 hover:underline"
            >
              {booking.fundTxHash}
            </a>
          </p>
        )}

        {booking.privacyMode === "private" && (
          <p className="text-xs text-muted leading-relaxed">
            Paid from shielded balance via the privacy pool → Philoxenia
            anonymizer. Escrow still stores guest, host, and amounts on-chain.
          </p>
        )}
        <p className="text-xs text-muted leading-relaxed">
          Host and connector were paid when the guest paid. If plans change,
          talk in{" "}
          <Link
            href={`/messages/${otherId}`}
            className="text-accent underline-offset-2 hover:underline"
          >
            Messages
          </Link>{" "}
          and return funds voluntarily with Send DAI/STRK. Marking cancel only
          frees the nights.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          {(isGuest || isHost) && canCancel && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={socialCancel}
            >
              {busy ? "Updating…" : "Mark cancelled (free nights)"}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => router.push(`/messages/${otherId}`)}
          >
            Open Messages
          </Button>
        </div>

        {ok && <p className="text-sm text-accent">{ok}</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}
      </Card>
    </Shell>
  );
}
