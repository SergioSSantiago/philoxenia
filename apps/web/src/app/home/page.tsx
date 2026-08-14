"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Listing, Booking, User } from "@philoxenia/shared";
import { Shell, SectionTitle, EmptyState } from "@/components/ui";
import { ListingCard, BookingCard } from "@/components/cards";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface HomeData {
  friends: User[];
  networkListings: Listing[];
  sharedListings: Listing[];
  myListings: Listing[];
  myBookings: Booking[];
  pendingFriendRequests: number;
}

export default function HomePage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    if (!token) {
      router.replace("/auth");
      return;
    }

    api.get<HomeData>("/home").then(setData).catch(() => router.replace("/auth"));
  }, [token, router]);

  if (!user || !data) {
    return (
      <Shell>
        <p className="text-muted">Loading…</p>
      </Shell>
    );
  }

  return (
    <Shell wide>
      <div className="mb-10">
        <h1 className="text-4xl">Hello, {user.displayName}</h1>
        <p className="mt-2 text-muted">
          Your private network of trusted places.
        </p>
      </div>

      <div className="space-y-12">
        <section>
          <SectionTitle
            title="Places from my friends"
            subtitle="Listings visible through your trust network"
          />
          {data.networkListings.length === 0 ? (
            <EmptyState message="No listings from friends yet. Add friends to discover places." />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.networkListings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle title="Shared with me" />
          {data.sharedListings.length === 0 ? (
            <EmptyState message="No shared listings yet." />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.sharedListings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle title="My listings" />
          {data.myListings.length === 0 ? (
            <EmptyState message="You haven't listed a place yet." />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.myListings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle title="My bookings" />
          {data.myBookings.length === 0 ? (
            <EmptyState message="No bookings yet." />
          ) : (
            <div className="space-y-4">
              {data.myBookings.slice(0, 5).map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle
            title="My friends"
            subtitle={
              data.pendingFriendRequests > 0
                ? `${data.pendingFriendRequests} pending request(s)`
                : undefined
            }
          />
          {data.friends.length === 0 ? (
            <EmptyState message="Add people you trust to build your network." />
          ) : (
            <p className="text-muted">{data.friends.length} friends</p>
          )}
        </section>
      </div>
    </Shell>
  );
}
