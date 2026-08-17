"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Booking } from "@philoxenia/shared";
import {
  Shell,
  SectionTitle,
  EmptyState,
  Button,
  Card,
  TextInput,
} from "@/components/ui";
import { BookingCard } from "@/components/cards";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

export default function BookingsPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [recoverHash, setRecoverHash] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [recoverError, setRecoverError] = useState("");

  useEffect(() => {
    if (!token) {
      router.replace("/home");
      return;
    }
    api.get<Booking[]>("/bookings").then(setBookings);
  }, [token, router]);

  async function inspectRecover() {
    const hash = recoverHash.trim();
    if (!hash) return;
    setRecovering(true);
    setRecoverError("");
    try {
      const info = await api.post<{
        listingId: string;
        alreadyRecorded: boolean;
        existingBookingId: string | null;
      }>("/bookings/inspect-payment", { fundTxHash: hash });
      if (info.alreadyRecorded && info.existingBookingId) {
        router.push(`/bookings/${info.existingBookingId}`);
        return;
      }
      router.push(
        `/bookings/new?listing=${info.listingId}&recover=${encodeURIComponent(hash)}`
      );
    } catch (err) {
      setRecoverError(
        err instanceof Error
          ? err.message
          : "Could not read that payment on Starknet"
      );
    } finally {
      setRecovering(false);
    }
  }

  return (
    <Shell>
      <SectionTitle
        title="My bookings"
        subtitle="Cards show You host or You stay. Pay is STRK or DAI; cancel only frees nights."
      />
      {bookings.length === 0 ? (
        <EmptyState message="No bookings yet. Book a friend’s place, or wait for a guest after a connector invite." />
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} viewerId={user?.id} />
          ))}
        </div>
      )}

      <Card className="mt-6 space-y-3">
        <p className="text-sm font-medium">Paid on-chain, missing booking?</p>
        <p className="text-xs text-muted leading-relaxed">
          If Ready charged you but Philoxenia did not create the stay, paste the
          transaction hash (Voyager / Ready activity). You will pick the same
          nights and record it — no second charge.
        </p>
        <TextInput
          value={recoverHash}
          onChange={(e) => setRecoverHash(e.target.value)}
          placeholder="0x…"
          autoComplete="off"
          spellCheck={false}
        />
        {recoverError && (
          <p className="text-sm text-red-700">{recoverError}</p>
        )}
        <Button
          type="button"
          variant="secondary"
          disabled={recovering || recoverHash.trim().length < 10}
          onClick={() => void inspectRecover()}
        >
          {recovering ? "Looking up payment…" : "Record existing payment"}
        </Button>
      </Card>
    </Shell>
  );
}
