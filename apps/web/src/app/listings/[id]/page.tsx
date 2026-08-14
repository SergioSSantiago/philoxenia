"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Listing } from "@philoxenia/shared";
import { Shell, Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

export default function ListingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      router.replace("/auth");
      return;
    }

    api
      .get<Listing>(`/listings/${params.id}`)
      .then(setListing)
      .catch(() => setError("Listing unavailable."));
  }, [token, params.id, router]);

  async function shareListing() {
    const result = await api.post<{ inviteUrl: string; token: string }>(
      `/listings/${params.id}/share`
    );
    const url = `${window.location.origin}${result.inviteUrl}`;
    setShareUrl(url);
    await navigator.clipboard.writeText(url);
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

  const photo = listing.photos[0];

  return (
    <Shell wide>
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-accent-soft/40">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={listing.title} className="h-full w-full object-cover" />
          ) : null}
        </div>

        <div>
          <h1 className="text-4xl">{listing.title}</h1>
          <p className="mt-2 text-muted">{listing.location}</p>

          {listing.host && (
            <p className="mt-4 text-sm">
              Host: <span className="font-medium">{listing.host.displayName}</span>
            </p>
          )}

          <p className="mt-6 text-2xl">
            {listing.pricePerNight} {listing.paymentAsset}
            <span className="text-base text-muted"> / night</span>
          </p>

          <p className="mt-4 rounded-xl bg-accent-soft/60 px-4 py-3 text-sm">
            Connector reward: {listing.connectorRewardPercent}%
          </p>

          <p className="mt-8 text-muted leading-relaxed">{listing.description}</p>

          <p className="mt-6 text-sm text-muted">
            {listing.minStay}–{listing.maxStay} nights · {listing.cancellationTerms}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={() => router.push(`/bookings/new?listing=${listing.id}`)}>
              Book
            </Button>
            <Button variant="secondary" onClick={shareListing}>
              Share listing
            </Button>
          </div>

          {shareUrl && (
            <Card className="mt-4 text-sm">
              <p className="text-muted">Invitation link copied:</p>
              <p className="mt-1 break-all font-mono text-xs">{shareUrl}</p>
            </Card>
          )}
        </div>
      </div>
    </Shell>
  );
}
