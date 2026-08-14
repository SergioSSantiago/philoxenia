"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Listing } from "@philoxenia/shared";
import { Shell, SectionTitle, EmptyState } from "@/components/ui";
import { ListingCard } from "@/components/cards";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

export default function MyListingsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    if (!token) {
      router.replace("/auth");
      return;
    }
    api.get<Listing[]>("/my-listings").then(setListings);
  }, [token, router]);

  return (
    <Shell wide>
      <SectionTitle title="My listings" />
      {listings.length === 0 ? (
        <EmptyState message="You haven't listed a place yet." />
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
