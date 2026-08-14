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
  const { token } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (!token) {
      router.replace("/auth");
      return;
    }
    api.get<Booking[]>("/bookings").then(setBookings);
  }, [token, router]);

  return (
    <Shell>
      <SectionTitle title="My bookings" />
      {bookings.length === 0 ? (
        <EmptyState message="No bookings yet." />
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>
      )}
    </Shell>
  );
}
