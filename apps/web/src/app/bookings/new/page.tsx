"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Booking, Listing } from "@philoxenia/shared";
import { Shell, Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

function NewBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingId = searchParams.get("listing") ?? "";
  const { token } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace("/auth");
      return;
    }
    if (!listingId) {
      setError("Listing unavailable.");
      return;
    }
    api
      .get<Listing>(`/listings/${listingId}`)
      .then(setListing)
      .catch(() => setError("Listing unavailable."));
  }, [token, listingId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const booking = await api.post<Booking>("/bookings", {
        listingId,
        checkIn,
        checkOut,
      });
      router.push(`/bookings/${booking.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !listing) {
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

  return (
    <Shell>
      <h1 className="text-4xl mb-2">Book</h1>
      <p className="text-muted mb-8">{listing.title}</p>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              Check-in
              <input
                type="date"
                required
                className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Check-out
              <input
                type="date"
                required
                className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
              />
            </label>
          </div>

          <p className="text-sm text-muted">
            {listing.pricePerNight} {listing.paymentAsset} / night · Connector
            reward: {listing.connectorRewardPercent}%
          </p>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating booking…" : "Continue to payment"}
          </Button>
        </form>
      </Card>
    </Shell>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense>
      <NewBookingForm />
    </Suspense>
  );
}
