"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Listing, ListingAvailableDay } from "@philoxenia/shared";
import { formatDaiPrice } from "@philoxenia/shared";
import { Shell, Button, Card } from "@/components/ui";
import { UserBadge } from "@/components/user-badge";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { GuestNightCalendar } from "@/components/guest-night-calendar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CopyInviteButton } from "@/components/copy-invite-button";
import { useAuth } from "@/lib/auth-context";
import { api, API_GENERIC_ERROR } from "@/lib/api";
import {
  copyText,
  inviteReadyStatus,
  shareInviteNative,
} from "@/lib/share-invite";

export default function ListingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [shareHasConnector, setShareHasConnector] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const [error, setError] = useState("");
  const [photoIndex, setPhotoIndex] = useState(0);
  const [availBusy, setAvailBusy] = useState(false);
  const [availMsg, setAvailMsg] = useState("");
  const [draftDays, setDraftDays] = useState<
    { day: string; pricePerNight: string }[] | null
  >(null);
  const [guestSelected, setGuestSelected] = useState<string[]>([]);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!token) {
      router.replace("/home");
      return;
    }

    api
      .get<Listing>(`/listings/${params.id}`)
      .then(setListing)
      .catch((err) =>
        setError(
          err instanceof Error &&
            err.message &&
            err.message !== API_GENERIC_ERROR
            ? err.message
            : "This place isn’t available to Book & pay."
        )
      );
  }, [token, params.id, router]);

  const hostCalendarDays: ListingAvailableDay[] = useMemo(() => {
    if (!listing) return [];
    const byDay = new Map<string, ListingAvailableDay>();

    // Always show paid nights as locked
    for (const d of listing.availableDays ?? []) {
      const day = d.day.slice(0, 10);
      if (!d.booked) continue;
      byDay.set(day, { ...d, day, booked: true });
    }
    for (const range of listing.bookedRanges ?? []) {
      for (const n of range.nights ?? []) {
        const day = n.slice(0, 10);
        if (byDay.has(day)) continue;
        byDay.set(day, {
          id: day,
          listingId: listing.id,
          day,
          pricePerNight: listing.pricePerNight,
          booked: true,
        });
      }
    }

    const openSource =
      draftDays ??
      (listing.availableDays ?? [])
        .filter((d) => !d.booked)
        .map((d) => ({
          day: d.day.slice(0, 10),
          pricePerNight: d.pricePerNight,
        }));

    for (const d of openSource) {
      const day = d.day.slice(0, 10);
      if (byDay.get(day)?.booked) continue;
      byDay.set(day, {
        id: day,
        listingId: listing.id,
        day,
        pricePerNight: d.pricePerNight,
        booked: false,
      });
    }

    return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  }, [listing, draftDays]);

  async function confirmDeleteListing() {
    if (!listing) return;
    setDeleteBusy(true);
    setDeleteError("");
    setError("");
    try {
      await api.delete(`/my-listings/${listing.id}`);
      setDeleteOpen(false);
      router.push("/my-listings");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete this place");
    } finally {
      setDeleteBusy(false);
    }
  }

  async function saveAvailability() {
    if (!draftDays) return;
    setAvailBusy(true);
    setAvailMsg("");
    setError("");
    try {
      const updated = await api.patch<Listing>(
        `/my-listings/${params.id}/availability`,
        { days: draftDays }
      );
      setListing(updated);
      setDraftDays(null);
      setAvailMsg("Open nights saved — friends can Book & pay.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save open nights");
    } finally {
      setAvailBusy(false);
    }
  }

  async function shareListing() {
    setShareBusy(true);
    setShareStatus("");
    setError("");
    try {
      const result = await api.post<{
        inviteUrl: string;
        token: string;
        hasConnector: boolean;
      }>(`/listings/${params.id}/share`);
      const url = `${window.location.origin}${result.inviteUrl}`;
      setShareUrl(url);
      setShareHasConnector(result.hasConnector);
      const copied = await copyText(url);
      setShareStatus(inviteReadyStatus(copied, result.hasConnector));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not share this place");
    } finally {
      setShareBusy(false);
    }
  }

  async function shareViaSystem() {
    if (!shareUrl) return;
    const result = await shareInviteNative({
      title: listing?.title ?? "this place",
      text: `Book & pay stay at ${listing?.title ?? "this place"} via Philoxenia — open this place invite (STRK or DAI).`,
      url: shareUrl,
    });
    if (result === "shared") {
      setShareStatus(
        shareHasConnector
          ? "Place invite shared — you are the connector"
          : "Place invite shared"
      );
    }
  }

  if (error) {
    return (
      <Shell>
        <p className="text-muted">{error}</p>
      </Shell>
    );
  }

  if (!listing) {
    return (
      <Shell>
        <p className="text-muted">Loading place to Book & pay…</p>
      </Shell>
    );
  }

  const photos = listing.photos.length > 0 ? listing.photos : [];
  const photo = photos[photoIndex] ?? null;
  const isHost = user?.id === listing.hostId;
  const mapUrl =
    listing.locationLat && listing.locationLng
      ? `https://www.openstreetmap.org/?mlat=${listing.locationLat}&mlon=${listing.locationLng}#map=15/${listing.locationLat}/${listing.locationLng}`
      : null;

  return (
    <Shell wide>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <div>
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-accent-soft/40">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt={listing.title}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          {photos.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {photos.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPhotoIndex(i)}
                  className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border ${
                    i === photoIndex ? "border-accent" : "border-border"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {listing.host && (
            <UserBadge
              user={listing.host}
              role={isHost ? "Your place" : "Publishes this place"}
              showWallet={!isHost}
            />
          )}

          <h1 className="mt-6 text-3xl sm:text-4xl">{listing.title}</h1>
          <p className="mt-2 text-muted">{listing.location}</p>
          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
              title="Opens OpenStreetMap in a new tab (external; not a public Philoxenia directory)"
              className="mt-2 inline-block text-sm text-accent underline-offset-2 hover:underline"
            >
              Open this place on OpenStreetMap
            </a>
          )}

          <p className="mt-6 text-2xl">
            {formatDaiPrice(listing.pricePerNight)}
            <span className="text-base text-muted"> / night</span>
          </p>

          <p className="mt-4 rounded-xl bg-accent-soft/60 px-4 py-3 text-sm">
            DAI list price (can vary by night) · Book & pay STRK or DAI
            to who publishes this place & connector · cancel frees nights (no clawback) — money
            return is Send STRK or DAI in Messages
          </p>

          <p className="mt-8 text-muted leading-relaxed">{listing.description}</p>

          <p className="mt-6 text-sm text-muted leading-relaxed">
            DAI list price: {formatDaiPrice(listing.pricePerNight)} / night
            (nights can differ)
          </p>

          <div className="mt-4">
            <p className="mb-3 text-sm font-medium text-foreground">
              {isHost
                ? "Open nights to Book & pay"
                : "Open nights to Book & pay"}
            </p>
            {isHost ? (
              <>
                <AvailabilityCalendar
                  days={hostCalendarDays}
                  mode="host"
                  defaultPrice={listing.pricePerNight}
                  onChangeDays={(days) => {
                    setDraftDays(days);
                    setAvailMsg("");
                  }}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={availBusy || !draftDays}
                    onClick={saveAvailability}
                  >
                    {availBusy ? "Saving open nights…" : "Save open nights"}
                  </Button>
                  {draftDays && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setDraftDays(null)}
                    >
                      Discard open nights
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <GuestNightCalendar
                  days={(listing.availableDays ?? []).map((d) => ({
                    ...d,
                    day: d.day.slice(0, 10),
                  }))}
                  selected={guestSelected}
                  onChangeSelected={setGuestSelected}
                />
                {guestSelected.length > 0 && (
                  <p className="text-sm text-muted">
                    {guestSelected.length} night
                    {guestSelected.length === 1 ? "" : "s"} selected — Book & pay.
                  </p>
                )}
              </div>
            )}
            {availMsg && (
              <p className="mt-2 text-sm text-accent">{availMsg}</p>
            )}
          </div>

          <p className="mt-4 text-sm text-muted leading-relaxed">
            Cancellation terms: {listing.cancellationTerms}. After Book & pay, who
            publishes this place and the connector already have the funds — cancel frees nights; any
            return is Send STRK or DAI in Messages.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {!isHost && (
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  const q = new URLSearchParams({ listing: listing.id });
                  if (guestSelected.length > 0) {
                    q.set("nights", guestSelected.join(","));
                  }
                  router.push(`/bookings/new?${q.toString()}`);
                }}
              >
                {guestSelected.length > 0
                  ? `Book & pay ${guestSelected.length} night${guestSelected.length === 1 ? "" : "s"}`
                  : "Book & pay"}
              </Button>
            )}
            <Button
              variant={isHost ? "primary" : "secondary"}
              className="w-full sm:w-auto"
              disabled={shareBusy}
              onClick={shareListing}
            >
              {shareBusy
                ? "Creating place invite…"
                : isHost
                  ? "Share this place"
                  : listing.connectorRewardPercent > 0
                    ? "Share place invite & earn"
                    : "Share this place"}
            </Button>
            {isHost && (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-red-700 sm:w-auto"
                disabled={deleteBusy}
                onClick={() => {
                  setDeleteError("");
                  setDeleteOpen(true);
                }}
              >
                Delete this place
              </Button>
            )}
          </div>

          <ConfirmDialog
            open={deleteOpen}
            title="Delete this place?"
            body="This permanently deletes this place, its photos, and calendar. You can only delete if there are no active Book & pay stays — past stays are fine."
            confirmLabel="Delete this place"
            busyLabel="Deleting this place…"
            cancelLabel="Keep this place"
            danger
            busy={deleteBusy}
            error={deleteError}
            onConfirm={() => void confirmDeleteListing()}
            onCancel={() => {
              if (!deleteBusy) {
                setDeleteOpen(false);
                setDeleteError("");
              }
            }}
          />

          {isHost && (
            <p className="mt-3 text-sm text-muted">
              You published this place — Book & pay is disabled here.
            </p>
          )}

          {shareStatus && (
            <p className="mt-3 text-sm text-foreground">{shareStatus}</p>
          )}

          {shareUrl && (
            <Card className="mt-4 space-y-3 text-sm">
              <p className="font-medium text-foreground">Place invite</p>
              <p className="break-all font-mono text-xs text-foreground select-all">
                {shareUrl}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <CopyInviteButton
                  url={shareUrl}
                  label="Copy place invite"
                  onCopied={(ok) =>
                    setShareStatus(inviteReadyStatus(ok, shareHasConnector))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full sm:w-auto"
                  onClick={() => void shareViaSystem()}
                >
                  Share place invite…
                </Button>
              </div>
              {shareHasConnector ? (
                <p className="text-muted leading-relaxed">
                  You are the connector for this place invite. When someone opens it,
                  Philoxenia saves that attribution. If they become friends with
                  who publishes this place and Book & pay, your reward is paid in STRK or DAI (same
                  asset they paid) to your Ready X wallet on settle — not by
                  sharing the Ready X wallet.
                </p>
              ) : (
                <p className="text-muted leading-relaxed">
                  You published this place — this place invite has{" "}
                  <span className="font-medium text-foreground">
                    no connector
                  </span>
                  . People who Book & pay through it do not create a connector reward.
                  Friends who share your place become connectors on their own
                  place invites.
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </Shell>
  );
}
