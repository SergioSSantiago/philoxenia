"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { Booking } from "@philoxenia/shared";
import { formatTokenAmount } from "@philoxenia/shared";
import { Shell, Button, Card } from "@/components/ui";
import { UserBadge } from "@/components/user-badge";
import { stayStatusLabel } from "@/components/cards";
import { useAuth } from "@/lib/auth-context";
import { api, API_GENERIC_ERROR } from "@/lib/api";

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
      .catch((err) =>
        setError(
          err instanceof Error &&
            err.message &&
            err.message !== API_GENERIC_ERROR
            ? err.message
            : "This stay isn’t available to Book & pay."
        )
      );
  }, [token, params.id, router]);

  async function socialCancel() {
    if (!booking) return;
    const agreed = window.confirm(
      "This only frees the nights in Philoxenia.\n\n" +
        "Host/connector were already paid on-chain at Book & pay. " +
        "Any money return must be agreed in Messages and sent with Send STRK or DAI.\n\n" +
        "Continue?"
    );
    if (!agreed) return;

    setBusy(true);
    setError("");
    setOk("");
    try {
      const updated = await api.post<Booking>(
        `/bookings/${booking.id}/social-cancel`
      );
      setBooking(updated);
      setOk(
        "Nights freed. Money was already settled on-chain — arrange any return in Messages."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not free nights");
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
        <p className="text-muted">Loading stay…</p>
      </Shell>
    );
  }

  const isGuest = user?.id === booking.guestId;
  const isHost = user?.id === booking.hostId;
  const otherId = isGuest ? booking.hostId : booking.guestId;
  const counterparty = isGuest ? booking.host : booking.guest;
  const counterpartyRole = isGuest ? "Host" : "Guest";
  const canCancel = ["funded", "confirmed", "completed"].includes(
    booking.status
  );
  const alreadySettled = ["completed", "cancelled"].includes(booking.status);
  const selectedNightKeys = (booking.selectedNights ?? [])
    .map((d) => d.slice(0, 10))
    .sort();
  const nightsHaveGaps = (() => {
    if (selectedNightKeys.length < 2) return false;
    const first = new Date(`${selectedNightKeys[0]}T12:00:00.000Z`).getTime();
    const last = new Date(
      `${selectedNightKeys[selectedNightKeys.length - 1]}T12:00:00.000Z`
    ).getTime();
    const span = Math.round((last - first) / 86_400_000) + 1;
    return span > selectedNightKeys.length;
  })();

  return (
    <Shell>
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
          Book & pay
        </p>
        <h1 className="mt-1 text-3xl text-foreground sm:text-4xl">
          <Link
            href={`/listings/${booking.listingId}`}
            className="underline-offset-2 hover:underline"
          >
            {booking.listing?.title ?? "Private place"}
          </Link>
        </h1>
        <p className="mt-2 text-sm text-muted">
          Tap the title for the place. Open the {counterpartyRole.toLowerCase()}{" "}
          to see their profile and places you can Book & pay.
        </p>
      </div>

      {counterparty && (
        <Card className="mb-6 space-y-3">
          <UserBadge user={counterparty} role={counterpartyRole} />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link href={`/listings/${booking.listingId}`} className="block">
              <Button className="w-full sm:w-auto">View place</Button>
            </Link>
            <Link href={`/friends/${counterparty.id}`} className="block">
              <Button variant="secondary" className="w-full sm:w-auto">
                View {counterpartyRole.toLowerCase()} &amp; places to Book &amp;
                pay
              </Button>
            </Link>
            <Link href={`/messages/${counterparty.id}`} className="block">
              <Button variant="ghost" className="w-full sm:w-auto">
                Message {counterpartyRole.toLowerCase()}
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {!counterparty && (
        <div className="mb-6 flex flex-col gap-2 sm:flex-row">
          <Link href={`/listings/${booking.listingId}`}>
            <Button>View place</Button>
          </Link>
          <Link href={`/friends/${otherId}`}>
            <Button variant="secondary">
              View {counterpartyRole.toLowerCase()}
            </Button>
          </Link>
        </div>
      )}

      <Card className="space-y-4">
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted">First night</p>
            <p>{new Date(booking.checkIn).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-muted">Morning you leave</p>
            <p>{new Date(booking.checkOut).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-muted">Nights</p>
            <p>{booking.nights}</p>
            {selectedNightKeys.length > 0 && (
              <p className="mt-1 text-xs text-muted leading-relaxed">
                {selectedNightKeys
                  .map((d) =>
                    new Date(`${d}T12:00:00.000Z`).toLocaleDateString(
                      undefined,
                      {
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      }
                    )
                  )
                  .join(" · ")}
                {nightsHaveGaps
                  ? " — nights not consecutive (first night / morning you leave is the bounding window)."
                  : ""}
              </p>
            )}
          </div>
          <div>
            <p className="text-muted">Stay</p>
            <p>{stayStatusLabel(booking.status)}</p>
          </div>
          <div>
            <p className="text-muted">Book & pay privacy</p>
            <p>
              {booking.privacyMode === "private"
                ? "Private (STRK20 · STRK or DAI)"
                : booking.privacyMode === "public"
                  ? "Public Book & pay"
                  : "—"}
            </p>
          </div>
        </div>

        <hr className="border-border" />

        <div className="space-y-2 text-sm">
          {booking.totalPriceDai && (
            <div className="flex justify-between">
              <span className="text-muted">Place list total (DAI)</span>
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
            <p className="text-xs text-muted">Direct Book & pay — no connector.</p>
          )}
          <div className="flex justify-between pt-2 text-base font-medium">
            <span>Paid at Book & pay</span>
            <span>
              {formatTokenAmount(booking.totalPrice)} {booking.paymentAsset}
            </span>
          </div>
        </div>

        {booking.fundTxHash && (
          <p className="break-all font-mono text-xs text-muted">
            Verified Book & pay tx:{" "}
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
            Paid from shielded STRK or DAI via the privacy pool → Philoxenia
            anonymizer. Escrow still stores guest, host, and amounts on-chain.
          </p>
        )}

        <div className="rounded-xl border border-border bg-background/80 px-4 py-3 text-xs leading-relaxed text-muted">
          <p className="font-medium text-foreground">Cancel policy</p>
          <p className="mt-1">
            Book & pay settles immediately (host + connector paid in the same tx). There
            is <span className="text-foreground">no escrow clawback</span> after
            settlement. Cancelling only frees nights. Refunds are social: agree
            in Messages, then Send STRK or DAI.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {(isGuest || isHost) && canCancel && booking.status !== "cancelled" && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={socialCancel}
            >
              {busy
                ? "Freeing nights…"
                : alreadySettled
                  ? "Free nights (no on-chain refund)"
                  : "Free nights (stay not settled yet)"}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => router.push(`/messages/${otherId}`)}
          >
            Open Messages to Send STRK or DAI
          </Button>
        </div>

        {ok && <p className="text-sm text-accent">{ok}</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}
      </Card>
    </Shell>
  );
}
