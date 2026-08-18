"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

/**
 * High-visibility modal for wallet / action prompts (not a tiny inline error).
 */
export function ActionNotice({
  open,
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel = "Got it",
  onSecondary,
  busy = false,
  tone = "warn",
}: {
  open: boolean;
  title: string;
  body: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary: () => void;
  busy?: boolean;
  tone?: "warn" | "error" | "info";
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onSecondary();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onSecondary, busy]);

  if (!open) return null;

  const toneBox =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-900"
      : tone === "info"
        ? "border-accent/25 bg-accent-soft/60 text-foreground"
        : "border-amber-200 bg-amber-50 text-amber-950";

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-foreground/40 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={() => {
        if (!busy) onSecondary();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="action-notice-title"
        className="w-full max-w-md animate-[fadeUp_0.28s_ease-out] rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="action-notice-title"
          className="font-sans text-2xl text-foreground"
        >
          {title}
        </h2>
        <div className={`mt-4 rounded-xl border px-4 py-3 text-sm leading-relaxed ${toneBox}`}>
          {body}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={onSecondary}
            className="w-full sm:w-auto"
          >
            {secondaryLabel}
          </Button>
          {primaryLabel && onPrimary ? (
            <Button
              type="button"
              disabled={busy}
              onClick={onPrimary}
              className="w-full sm:w-auto"
            >
              {busy ? `${primaryLabel.replace(/\?$/, "")}…` : primaryLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
