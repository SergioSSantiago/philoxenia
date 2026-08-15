"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Listing } from "@philoxenia/shared";
import { formatDaiPrice } from "@philoxenia/shared";
import { Shell, Button, Card } from "@/components/ui";
import { UserBadge } from "@/components/user-badge";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { GuestNightCalendar } from "@/components/guest-night-calendar";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

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

  useEffect(() => {
    if (!token) {
      router.replace("/home");
      return;
    }

    api
      .get<Listing>(`/listings/${params.id}`)
      .then(setListing)
      .catch(() => setError("Listing unavailable."));
  }, [token, params.id, router]);

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
      setAvailMsg("Availability saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
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
      // Absolute invite link — never the wallet. Opening it records connector attribution.
      const url = `${window.location.origin}${result.inviteUrl}`;
      setShareUrl(url);
      setShareHasConnector(result.hasConnector);

      if (typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: listing?.title ?? "Philoxenia listing",
            text: "Open this Philoxenia invite to view the listing.",
            url,
          });
          setShareStatus("Invite link shared");
          return;
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") {
            setShareStatus("Share cancelled");
            return;
          }
        }
      }

      const copied = await copyText(url);
      setShareStatus(
        copied
          ? "Invite link copied — paste it in WhatsApp or anywhere"
          : "Could not copy automatically — select the link below"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Share failed");
    } finally {
      setShareBusy(false);
    }
  }

  async function copyShareLink() {
    if (!shareUrl) return;
    const copied = await copyText(shareUrl);
    setShareStatus(
      copied
        ? "Invite link copied — paste it in WhatsApp or anywhere"
        : "Could not copy automatically — select the link below"
    );
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
        <p className="text-muted">Loading…</p>
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
              role={isHost ? "Your listing" : "Host"}
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
              className="mt-2 inline-block text-sm text-accent underline-offset-2 hover:underline"
            >
              Open on map
            </a>
          )}

          <p className="mt-6 text-2xl">
            {formatDaiPrice(listing.pricePerNight)}
            <span className="text-base text-muted"> / night</span>
          </p>

          <p className="mt-4 rounded-xl bg-accent-soft/60 px-4 py-3 text-sm">
            Listed in DAI (price can vary by night) · guest pays STRK now to host
            & connector · cancel = talk in Messages
          </p>

          <p className="mt-8 text-muted leading-relaxed">{listing.description}</p>

          <p className="mt-6 text-sm text-muted leading-relaxed">
            Default list price: {formatDaiPrice(listing.pricePerNight)} / night
            (nights can differ)
          </p>

          <div className="mt-4">
            <p className="mb-3 text-sm font-medium text-foreground">
              {isHost
                ? "Manage availability & nightly prices"
                : "Open nights & prices"}
            </p>
            {isHost ? (
              <>
                <AvailabilityCalendar
                  days={
                    draftDays
                      ? draftDays.map((d) => ({
                          id: d.day,
                          listingId: listing.id,
                          day: d.day,
                          pricePerNight: d.pricePerNight,
                          booked: listing.availableDays?.find(
                            (x) => x.day === d.day
                          )?.booked,
                        }))
                      : (listing.availableDays ?? [])
                  }
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
                    {availBusy ? "Saving…" : "Save availability"}
                  </Button>
                  {draftDays && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setDraftDays(null)}
                    >
                      Discard
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
                    {guestSelected.length === 1 ? "" : "s"} selected — continue
                    to Book & pay.
                  </p>
                )}
              </div>
            )}
            {availMsg && (
              <p className="mt-2 text-sm text-accent">{availMsg}</p>
            )}
          </div>

          <p className="mt-4 text-sm text-muted leading-relaxed">
            Cancellation: {listing.cancellationTerms}. After payment, host and
            connector already have the funds — resolve changes in Messages and
            return money voluntarily if you agree.
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
                  ? `Book ${guestSelected.length} night${guestSelected.length === 1 ? "" : "s"}`
                  : "Book"}
              </Button>
            )}
            <Button
              variant={isHost ? "primary" : "secondary"}
              className="w-full sm:w-auto"
              disabled={shareBusy}
              onClick={shareListing}
            >
              {shareBusy ? "Creating link…" : "Share listing"}
            </Button>
          </div>

          {isHost && (
            <p className="mt-3 text-sm text-muted">
              You own this listing — booking is disabled for the host.
            </p>
          )}

          {shareStatus && (
            <p className="mt-3 text-sm text-foreground">{shareStatus}</p>
          )}

          {shareUrl && (
            <Card className="mt-4 space-y-3 text-sm">
              <p className="font-medium text-foreground">Invite link</p>
              <p className="break-all font-mono text-xs text-foreground select-all">
                {shareUrl}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={copyShareLink}
              >
                Copy invite link
              </Button>
              {shareHasConnector ? (
                <p className="text-muted leading-relaxed">
                  You are the connector for this link. When someone opens it,
                  Philoxenia saves that attribution. If they become friends with
                  the host and book, your reward is paid to your connected wallet
                  on settle — not by sharing the wallet address.
                </p>
              ) : (
                <p className="text-muted leading-relaxed">
                  You shared as the host — this link has{" "}
                  <span className="font-medium text-foreground">
                    no connector
                  </span>
                  . Guests who book through it do not create a connector reward.
                  Friends who share your listing become connectors on their own
                  links.
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </Shell>
  );
}
