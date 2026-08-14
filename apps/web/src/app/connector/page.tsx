"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Booking } from "@philoxenia/shared";
import { Shell, SectionTitle, EmptyState, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface ConnectorEarnings {
  totalEarned: string;
  bookings: Booking[];
}

export default function ConnectorPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [data, setData] = useState<ConnectorEarnings | null>(null);

  useEffect(() => {
    if (!token) {
      router.replace("/auth");
      return;
    }
    api.get<ConnectorEarnings>("/connector/earnings").then(setData);
  }, [token, router]);

  return (
    <Shell>
      <SectionTitle
        title="Connector earnings"
        subtitle="Rewards from successful introductions"
      />

      {data && (
        <Card className="mb-8">
          <p className="text-sm text-muted">Total earned</p>
          <p className="mt-1 text-3xl">{data.totalEarned}</p>
        </Card>
      )}

      {!data ? (
        <p className="text-muted">Loading…</p>
      ) : data.bookings.length === 0 ? (
        <EmptyState message="No connector rewards yet. Share listings with people you trust." />
      ) : (
        <div className="space-y-4">
          {data.bookings.map((b) => (
            <Card key={b.id}>
              <p className="font-medium">{b.listing?.title ?? "Booking"}</p>
              <p className="mt-1 text-sm text-muted">
                Reward: {b.connectorRewardAmount} {b.paymentAsset}
              </p>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}
