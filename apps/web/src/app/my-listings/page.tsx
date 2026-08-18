"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Listing } from "@philoxenia/shared";
import { Shell, SectionTitle, EmptyState, Button } from "@/components/ui";
import { ListingCard } from "@/components/cards";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

export default function MyListingsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    if (!token) {
      router.replace("/home");
      return;
    }
    api.get<Listing[]>("/my-listings").then(setListings);
  }, [token, router]);

  return (
    <Shell wide>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionTitle
          title="My places"
          subtitle="Private places priced in DAI. Guests Book & pay STRK or DAI. Set a connector % so friends can share a place invite and earn."
        />
        <Link href="/listings/new">
          <Button className="w-full sm:w-auto">List your place</Button>
        </Link>
      </div>
      {listings.length === 0 ? (
        <EmptyState message="You haven't listed a place yet. Friends only see what you publish — add nights and a connector % so they can introduce guests who Book & pay." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </Shell>
  );
}
