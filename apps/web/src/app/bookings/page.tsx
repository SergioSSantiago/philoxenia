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
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (!token) {
      router.replace("/home");
      return;
    }
    api.get<Booking[]>("/bookings").then(setBookings);
  }, [token, router]);

  return (
    <Shell>
      <SectionTitle
        title="My bookings"
        subtitle="Stays you book as guest and bookings on your listings as host."
      />
      {bookings.length === 0 ? (
        <EmptyState message="No bookings yet." />
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
