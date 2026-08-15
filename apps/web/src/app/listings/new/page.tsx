"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell, Button, Card, TextInput } from "@/components/ui";
import { PhotoUploader } from "@/components/photo-uploader";
import {
  LocationMapPicker,
  type MapLocationValue,
} from "@/components/location-map-picker";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import "leaflet/dist/leaflet.css";

function nightsBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const a = new Date(start);
  const b = new Date(end);
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

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
    "Full refund if cancelled at least 7 days before check-in. Within 7 days, refund is at the host’s discretion."
  );
  const [photos, setPhotos] = useState<string[]>([]);
  const [mapLocation, setMapLocation] = useState<MapLocationValue | null>(null);
  const [availabilityStart, setAvailabilityStart] = useState("");
  const [availabilityEnd, setAvailabilityEnd] = useState("");

  const maxStayNights = useMemo(
    () => nightsBetween(availabilityStart, availabilityEnd),
    [availabilityStart, availabilityEnd]
  );

  useEffect(() => {
    if (!token) router.replace("/home");
  }, [token, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (!title.trim()) throw new Error("Title is required");
      if (!description.trim()) throw new Error("Description is required");
      if (!pricePerNight || Number(pricePerNight) <= 0) {
        throw new Error("Enter a valid price per night");
      }
      if (!mapLocation) {
        throw new Error("Pin the exact location on the map");
      }
      if (photos.length === 0) {
        throw new Error("Add at least one photo");
      }
      if (!availabilityStart || !availabilityEnd) {
        throw new Error("Set availability dates");
      }
      if (maxStayNights < 1) {
        throw new Error("Available until must be after available from");
      }
      if (!cancellationTerms.trim()) {
        throw new Error("Cancellation terms are required");
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
        availability: [
          {
            startDate: availabilityStart,
            endDate: availabilityEnd,
          },
        ],
      });
      router.push(`/listings/${listing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Shell>
      <h1 className="mb-2 text-3xl sm:text-4xl">List your place</h1>
      <p className="mb-8 text-sm text-muted sm:text-base">
        Only friends can see this listing. Price is set in DAI; guests may pay
        in DAI or STRK.
      </p>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-lg text-foreground">Basics</h2>
            <label className="block text-sm">
              Title
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
              Description
              <textarea
                className="mt-1 min-h-28 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What makes this place special for a trusted guest?"
                required
              />
            </label>
            <label className="block text-sm">
              Price per night (DAI)
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
                Listed in DAI. At booking, guests can pay that amount in DAI or
                the same amount in STRK.
              </span>
            </label>
            <label className="block text-sm">
              Connector reward (%)
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
                Share for a friend who introduces a guest. Direct bookings: 0%
                protocol fee.
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
            <h2 className="text-lg text-foreground">Availability</h2>
            <p className="text-xs text-muted">
              Stay length is limited by this window (1 night up to the full
              range). No separate min/max fields.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                Available from
                <TextInput
                  className="mt-1"
                  type="date"
                  value={availabilityStart}
                  onChange={(e) => setAvailabilityStart(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm">
                Available until
                <TextInput
                  className="mt-1"
                  type="date"
                  value={availabilityEnd}
                  onChange={(e) => setAvailabilityEnd(e.target.value)}
                  required
                />
              </label>
            </div>
            {maxStayNights > 0 && (
              <p className="text-sm text-muted">
                Guests can book 1–{maxStayNights} night
                {maxStayNights === 1 ? "" : "s"} in this window.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg text-foreground">Cancellation terms</h2>
            <p className="text-xs text-muted leading-relaxed">
              Off-chain policy only. The escrow contract does{" "}
              <span className="font-medium text-foreground">not</span> auto-apply
              these rules — after funding, the host can refund or the guest can
              settle. Write clear terms your network will honour.
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
            {submitting ? "Creating…" : "Create listing"}
          </Button>
        </form>
      </Card>
    </Shell>
  );
}
