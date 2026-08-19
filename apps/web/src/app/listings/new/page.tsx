"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ListingAvailableDay } from "@philoxenia/shared";
import { Shell, Button, Card, TextInput } from "@/components/ui";
import { PhotoUploader } from "@/components/photo-uploader";
import {
  LocationMapPicker,
  type MapLocationValue,
} from "@/components/location-map-picker";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import "leaflet/dist/leaflet.css";

export default function CreateListingPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pricePerNight, setPricePerNight] = useState("");
  const [connectorRewardPercent, setConnectorRewardPercent] = useState(5);
  const [cancellationTerms, setCancellationTerms] = useState(
    "Cancel frees the nights only. Book & pay already paid who publishes this place (and connector) on-chain — any money return is agreed in Messages with Send STRK or DAI. No automatic clawback."
  );
  const [photos, setPhotos] = useState<string[]>([]);
  const [mapLocation, setMapLocation] = useState<MapLocationValue | null>(null);
  const [availableDays, setAvailableDays] = useState<
    { day: string; pricePerNight: string }[]
  >([]);

  const calendarDays: ListingAvailableDay[] = useMemo(
    () =>
      availableDays.map((d) => ({
        id: d.day,
        listingId: "",
        day: d.day,
        pricePerNight: d.pricePerNight,
        booked: false,
      })),
    [availableDays]
  );

  useEffect(() => {
    if (!token) router.replace("/home");
  }, [token, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (!title.trim()) throw new Error("Title for this place is required");
      if (!description.trim()) throw new Error("Description for this place is required");
      if (!pricePerNight || Number(pricePerNight) <= 0) {
        throw new Error("Enter a valid DAI list price / night");
      }
      if (!mapLocation) {
        throw new Error("Pin this place on the map");
      }
      if (photos.length === 0) {
        throw new Error("Add at least one place photo");
      }
      if (availableDays.length < 1) {
        throw new Error("Open at least one night to Book & pay");
      }
      if (!cancellationTerms.trim()) {
        throw new Error("Write cancellation terms for this place");
      }

      const listing = await api.post<{ id: string }>("/my-listings", {
        title: title.trim(),
        description: description.trim(),
        location: mapLocation.label,
        locationLat: mapLocation.lat,
        locationLng: mapLocation.lng,
        pricePerNight: String(pricePerNight),
        cancellationTerms: cancellationTerms.trim(),
        connectorRewardPercent,
        photos,
        availableDays,
      });
      router.push(`/listings/${listing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish this place");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Shell>
      <h1 className="mb-2 text-3xl sm:text-4xl">List your place</h1>
      <p className="mb-8 text-sm text-muted sm:text-base">
        Only friends can see this place. Price is in DAI; Book & pay
        STRK or DAI. Set a connector % so friends can share a place invite and earn.
      </p>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-lg text-foreground">About this place</h2>
            <label className="block text-sm">
              Title for this place
              <TextInput
                className="mt-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sunny loft near the river"
                required
                maxLength={200}
              />
            </label>
            <label className="block text-sm">
              Description for this place
              <textarea
                className="mt-1 min-h-28 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What makes this place special for a friend who can Book & pay?"
                required
              />
            </label>
            <label className="block text-sm">
              DAI list price / night
              <TextInput
                className="mt-1"
                type="number"
                step="0.01"
                min="0"
                value={pricePerNight}
                onChange={(e) => setPricePerNight(e.target.value)}
                placeholder="0.00"
                required
              />
              <span className="mt-1 block text-xs text-muted">
            Used when you open nights to Book & pay. You can set a
            different DAI price per night there.
              </span>
            </label>
            <label className="block text-sm">
              Connector % of stay
              <TextInput
                className="mt-1"
                type="number"
                min={0}
                max={100}
                value={connectorRewardPercent}
                onChange={(e) =>
                  setConnectorRewardPercent(Number(e.target.value))
                }
              />
              <span className="mt-1 block text-xs text-muted">
                A friend who shares a place invite earns this % of the stay
                (3–10% is typical) when someone Book & pay through that place
                invite. Philoxenia takes 10% of that connector reward only.
                Direct Book & pay stays 0% protocol.
              </span>
            </label>
          </section>

          <section className="space-y-4">
            <PhotoUploader photos={photos} onChange={setPhotos} />
          </section>

          <section className="space-y-4">
            <LocationMapPicker value={mapLocation} onChange={setMapLocation} />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg text-foreground">Open nights to Book & pay</h2>
            <p className="text-xs text-muted leading-relaxed">
              Same calendar as when you edit a place: tap nights one by one,
              or add a range, and set per-night DAI list prices. Book &amp;
              pay those nights in STRK or DAI.
            </p>
            {!pricePerNight || Number(pricePerNight) <= 0 ? (
              <p className="text-sm text-muted">
                Enter a default DAI price above to open nights to Book
                &amp; pay.
              </p>
            ) : (
              <AvailabilityCalendar
                days={calendarDays}
                mode="host"
                defaultPrice={pricePerNight}
                onChangeDays={setAvailableDays}
              />
            )}
            {availableDays.length > 0 && (
              <p className="text-sm text-muted">
                {availableDays.length} night
                {availableDays.length === 1 ? "" : "s"} open.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg text-foreground">Cancellation terms</h2>
            <p className="text-xs text-muted leading-relaxed">
              Off-chain policy only — escrow does not enforce it. After Book &amp;
              pay, who publishes this place and the connector already have the funds. Cancel frees
              nights; any return is Send STRK or DAI in Messages. Write terms
              friends to Book & pay will honour.
            </p>
            <textarea
              className="min-h-24 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
              value={cancellationTerms}
              onChange={(e) => setCancellationTerms(e.target.value)}
              required
            />
          </section>

          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Publishing this place…" : "Publish this place"}
          </Button>
        </form>
      </Card>
    </Shell>
  );
}
