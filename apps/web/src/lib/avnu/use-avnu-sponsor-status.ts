"use client";

import { useEffect, useState } from "react";

export type AvnuSponsorStatus = {
  loading: boolean;
  sponsorReady: boolean;
  hasUsage: boolean;
  creditsStrk: string | null;
  hint: string | null;
};

export function useAvnuSponsorStatus(): AvnuSponsorStatus {
  const [status, setStatus] = useState<AvnuSponsorStatus>({
    loading: true,
    sponsorReady: false,
    hasUsage: false,
    creditsStrk: null,
    hint: null,
  });

  useEffect(() => {
    fetch("/api/avnu/status")
      .then((response) => response.json())
      .then(
        (data: {
          sponsorReady?: boolean;
          hasUsage?: boolean;
          hint?: string | null;
          sponsorActivity?: { remainingStrkCreditsFormatted?: string };
        }) => {
          setStatus({
            loading: false,
            sponsorReady: Boolean(data.sponsorReady),
            hasUsage: Boolean(data.hasUsage),
            creditsStrk:
              data.sponsorActivity?.remainingStrkCreditsFormatted ?? null,
            hint: data.hint ?? null,
          });
        }
      )
      .catch(() => {
        setStatus((current) => ({ ...current, loading: false }));
      });
  }, []);

  return status;
}

export function formatAvnuCreditsLabel(creditsStrk: string | null): string {
  if (!creditsStrk) return "";
  const value = Number.parseFloat(creditsStrk);
  if (!Number.isFinite(value)) return "";
  return `${Math.round(value)} STRK`;
}
