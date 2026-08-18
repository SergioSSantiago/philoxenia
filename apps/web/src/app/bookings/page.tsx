"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Booking } from "@philoxenia/shared";
import { Shell, SectionTitle, EmptyState } from "@/components/ui";
import { BookingCard } from "@/components/cards";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

export default function BookingsPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    if (!token) {
      router.replace("/home");
      return;
    }
    api
      .get<Booking[]>("/bookings")
      .then(setBookings)
      .catch(() => setBookings([]));
  }, [token, router]);

  return (
    <Shell>
      <SectionTitle
        title="My bookings"
        subtitle="Cards show You host or You stay. Book & pay is STRK or DAI; cancel only frees nights."
      />
      {bookings == null ? (
        <p className="text-sm text-muted">Loading stays…</p>
      ) : bookings.length === 0 ? (
        <EmptyState message="No Book & pay stays yet. Book & pay a friend’s place, or wait for a guest after a connector invite." />
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} viewerId={user?.id} />
          ))}
        </div>
      )}
    </Shell>
  );
}
