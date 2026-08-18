"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/lib/notifications-context";

export function NotificationBell() {
  const { items, unreadCount, markRead, markAllRead, refresh } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    void refresh();
    function onDoc(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, refresh]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread friends, notes & stays`
            : "Friends, notes & stays"
        }
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border bg-background text-foreground touch-manipulation"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[60] mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-foreground">Friends, notes & stays</p>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs text-muted underline-offset-2 hover:text-foreground hover:underline"
                onClick={() => void markAllRead()}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">
                No friends, notes or Book & pay yet. Friend requests, sealed
                notes, and Book & pay stays appear here.
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`block w-full border-b border-border px-4 py-3 text-left transition hover:bg-background ${
                    n.readAt ? "opacity-70" : "bg-accent-soft/30"
                  }`}
                  onClick={async () => {
                    if (!n.readAt) await markRead(n.id);
                    setOpen(false);
                    if (n.href) router.push(n.href);
                  }}
                >
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted leading-relaxed">
                    {n.body}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border px-4 py-2">
            <Link
              href="/friends"
              className="text-xs text-muted hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Friends
            </Link>
            <Link
              href="/messages"
              className="text-xs text-muted hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Messages
            </Link>
            <Link
              href="/bookings"
              className="text-xs text-muted hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Bookings
            </Link>
            <Link
              href="/connector"
              className="text-xs text-muted hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Earnings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
