"use client";

import { useCallback, useState } from "react";

function truncateAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 10)}…${address.slice(-6)}`;
}

export function WalletAddress({
  address,
  compact = false,
  label = "Wallet address",
}: {
  address: string;
  compact?: boolean;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState("");

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareError("Could not copy. Select the address manually.");
    }
  }, [address]);

  const share = useCallback(async () => {
    setShareError("");
    const shareText = `My Philoxenia wallet address:\n${address}`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Philoxenia wallet",
          text: shareText,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    await copy();
  }, [address, copy]);

  return (
    <div className="space-y-2">
      {!compact && (
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
      )}
      <p
        className={`font-mono text-foreground break-all select-all ${
          compact ? "text-xs" : "text-sm leading-relaxed"
        }`}
        title={address}
      >
        {compact ? truncateAddress(address) : address}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-accent-soft/50 active:scale-[0.98]"
        >
          {copied ? "Copied!" : "Copy"}
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
