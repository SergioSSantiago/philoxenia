"use client";

import {
  formatAvnuCreditsLabel,
  useAvnuSponsorStatus,
} from "@/lib/avnu/use-avnu-sponsor-status";

type AvnuSponsorNoticeProps = {
  className?: string;
};

/** Shown when AVNU paymaster credits are live on mainnet. */
export function AvnuSponsorNotice({ className = "" }: AvnuSponsorNoticeProps) {
  const { loading, sponsorReady, creditsStrk } = useAvnuSponsorStatus();

  if (loading || !sponsorReady) return null;

  const credits = formatAvnuCreditsLabel(creditsStrk);
  return (
    <p className={className}>
      Gas sponsored by AVNU{credits ? ` (${credits} credits)` : ""}.
    </p>
  );
}
