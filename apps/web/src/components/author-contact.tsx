"use client";

import { useEffect, useId, useState } from "react";

const CHANNELS = [
  {
    label: "GitHub",
    href: "https://github.com/SergioSSantiago",
    hint: "@SergioSSantiago",
  },
  {
    label: "Telegram",
    href: "https://t.me/sergiossantiago",
    hint: "@sergiossantiago",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/sergio-sapi%C3%B1a-santiago-dlt",
    hint: "Sergio Sapiña Santiago",
  },
  {
    label: "Email",
    href: "mailto:sergissantiago@gmail.com",
    hint: "sergissantiago@gmail.com",
  },
] as const;

/**
 * Footer name → contact chooser. The only public contact for bugs and everything else.
 */
export function AuthorContact() {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="text-foreground underline-offset-2 hover:underline"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        Sergio SSantiago
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-foreground/25 p-4 backdrop-blur-[2px] sm:items-center"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={titleId} className="font-sans text-2xl text-foreground">
              Contact Sergio
            </h2>
            <p id={descId} className="mt-3 text-sm leading-relaxed text-muted">
              This is the only place to reach me — bugs, feedback, or anything
              else about Philoxenia.
            </p>
            <ul className="mt-5 space-y-2">
              {CHANNELS.map((ch) => (
                <li key={ch.label}>
                  <a
                    href={ch.href}
                    target={ch.href.startsWith("mailto:") ? undefined : "_blank"}
                    rel={
                      ch.href.startsWith("mailto:")
                        ? undefined
                        : "noopener noreferrer"
                    }
                    className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-2.5 text-left touch-manipulation hover:border-accent/40 hover:bg-accent-soft/40"
                    onClick={() => setOpen(false)}
                  >
                    <span className="text-sm font-medium text-foreground">
                      {ch.label}
                    </span>
                    <span className="truncate text-xs text-muted">{ch.hint}</span>
                  </a>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-4 w-full min-h-[44px] rounded-full px-5 py-2.5 text-sm font-medium text-muted hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
