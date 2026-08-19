"use client";

import { useEffect, useState } from "react";
import type { NetworkStats } from "@philoxenia/shared";
import { formatTokenAmount } from "@philoxenia/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const POLL_MS = 20_000;

function formatCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    n
  );
}

/**
 * Quiet live network totals under the landing brand.
 * Kept typographic — not a dashboard strip.
 */
export function LandingNetworkStats({
  opacity = 1,
  className = "",
}: {
  opacity?: number;
  className?: string;
}) {
  const [stats, setStats] = useState<NetworkStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${API_URL}/stats/network`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as NetworkStats;
        if (!cancelled) setStats(data);
      } catch {
        // keep last known
      }
    }

    load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (opacity <= 0.05) return null;

  const items = [
    {
      label: "Ready X wallets",
      value: stats ? formatCount(stats.users) : "—",
    },
    {
      label: "countries with places",
      value: stats ? formatCount(stats.countries) : "—",
    },
    {
      label: "places to Book & pay",
      value: stats ? formatCount(stats.listingsOpen) : "—",
    },
    {
      label: "Book & pay nights",
      value: stats ? formatCount(stats.nightsBooked) : "—",
    },
    {
      label: "DAI Book & pay",
      value: stats ? formatTokenAmount(stats.transferredDai, 2) : "—",
    },
    {
      label: "STRK Book & pay",
      value: stats ? formatTokenAmount(stats.transferredStrk, 2) : "—",
    },
  ];

  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      style={{ opacity }}
      aria-live="polite"
    >
      <dl className="mx-auto grid max-w-lg grid-cols-2 gap-x-8 gap-y-4 text-center sm:max-w-2xl sm:grid-cols-3 sm:gap-x-6">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-[10px] uppercase tracking-[0.14em] text-muted/80">
              {item.label}
            </dt>
            <dd className="mt-1 truncate font-sans text-xl text-foreground sm:text-2xl">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
