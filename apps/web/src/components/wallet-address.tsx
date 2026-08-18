"use client";

import { useCallback, useState } from "react";
import Link from "next/link";

function truncateAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 10)}…${address.slice(-6)}`;
}

export function WalletAddress({
  address,
  compact = false,
  label = "Ready X wallet",
  href,
}: {
  address: string;
  compact?: boolean;
  label?: string;
  /** Optional link target for the address text (e.g. friend profile). */
  href?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState("");

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareError("Could not copy this Ready X wallet. Select the address manually.");
    }
  }, [address]);

  const share = useCallback(async () => {
    setShareError("");
    const shareText = `My Philoxenia Ready X wallet:\n${address}`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "My Philoxenia Ready X wallet",
          text: shareText,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    await copy();
  }, [address, copy]);

  const addressClass = `font-mono text-foreground break-all select-all ${
    compact ? "text-xs" : "text-sm leading-relaxed"
  }${href ? " underline-offset-2 hover:underline touch-manipulation" : ""}`;

  return (
    <div className="space-y-2">
      {!compact && (
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
      )}
      {href ? (
        <Link href={href} className={addressClass} title={address}>
          {compact ? truncateAddress(address) : address}
        </Link>
      ) : (
        <p className={addressClass} title={address}>
          {compact ? truncateAddress(address) : address}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-accent-soft/50 active:scale-[0.98]"
        >
          {copied ? "Copied Ready X wallet" : "Copy Ready X wallet"}
        </button>
        <button
          type="button"
          onClick={share}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-accent-soft/50 active:scale-[0.98]"
        >
          Share
        </button>
      </div>
      {shareError && (
        <p className="text-xs text-red-700">{shareError}</p>
      )}
    </div>
  );
}
