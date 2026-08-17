"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChatThread } from "@philoxenia/shared";
import { Shell, EmptyState } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { isSealedBody, previewBody } from "@/lib/chat-crypto";
import { useSealedMessaging } from "@/lib/use-sealed-messaging";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatThreadTime(iso: string | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return "Yesterday";
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

type ThreadRow = ChatThread & { preview: string };

export default function MessagesPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { ready: sealedReady, error: sealErr } = useSealedMessaging();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.replace("/home");
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const raw = await api.get<ChatThread[]>("/messages");
        const withPreview = await Promise.all(
          raw.map(async (t) => {
            const body = t.lastMessage?.body;
            let preview = "Start a sealed conversation";
            if (t.lastMessage?.kind === "transfer") {
              preview = t.lastMessage.body || "Token transfer";
            } else if (t.lastMessage?.kind === "booking") {
              preview = t.lastMessage.body || "Booking update";
            } else if (body) {
              preview = await previewBody(user?.walletAddress, body);
            }
            return { ...t, preview };
          })
        );
        if (!cancelled) {
          setThreads(withPreview);
          setError("");
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load messages.");
          setLoading(false);
        }
      }
    }

    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [token, router, user?.walletAddress]);

  return (
    <Shell>
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">
          Private inbox
        </p>
        <h1 className="mt-1 text-3xl text-foreground sm:text-4xl">Messages</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
          Sealed notes decrypt only on your device. From a thread you can also
          send STRK or DAI (Public or Private). Tap a name or wallet to see
          their listings and share invites; open the preview or › to chat.
        </p>
      </header>

      <div
        className="mb-5 flex items-start gap-3 rounded-2xl border border-accent/20 bg-gradient-to-br from-accent-soft/80 to-surface px-4 py-3.5"
        role="status"
      >
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent"
          aria-hidden
        >
          <LockIcon />
        </span>
        <div className="min-w-0 text-sm leading-relaxed">
          <p className="font-medium text-foreground">
            {sealedReady
              ? "Sealed messaging is on"
              : "Preparing sealed keys…"}
          </p>
          <p className="mt-0.5 text-muted">
            Messages are sealed on your device. Who you chat with still comes
            from your Philoxenia friends list.
          </p>
          {sealErr && (
            <p className="mt-1 text-red-700">{sealErr}</p>
          )}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <div className="space-y-2" aria-busy>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[4.5rem] animate-pulse rounded-2xl bg-border/40"
            />
          ))}
        </div>
      ) : threads.length === 0 ? (
        <EmptyState message="No friends yet. Add someone by Ready X wallet on Friends — each friend gets a sealed thread here, and you can send STRK or DAI in chat." />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm divide-y divide-border">
          {threads.map((t) => {
            const sealed = t.lastMessage?.body
              ? isSealedBody(t.lastMessage.body)
              : false;
            const profileHref = `/friends/${t.friend.id}`;
            return (
              <li key={t.friend.id} className="flex items-stretch">
                <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5">
                  <Link
                    href={profileHref}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/25 to-accent/5 text-sm font-semibold text-accent transition hover:from-accent/35 hover:to-accent/10 touch-manipulation"
                    aria-label={`View ${t.friend.displayName}'s listings`}
                    title="View listings"
                  >
                    {initials(t.friend.displayName)}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <Link
                        href={profileHref}
                        className="truncate font-medium text-foreground underline-offset-2 hover:underline touch-manipulation"
                      >
                        {t.friend.displayName}
                      </Link>
                      <time
                        className="shrink-0 text-[11px] tabular-nums text-muted"
                        dateTime={t.lastMessage?.createdAt}
                      >
                        {formatThreadTime(t.lastMessage?.createdAt)}
                      </time>
                    </div>
                    <Link
                      href={profileHref}
                      className="mt-0.5 block truncate font-mono text-[10px] text-muted underline-offset-2 hover:underline touch-manipulation sm:text-xs"
                      title={t.friend.walletAddress}
                    >
                      {t.friend.walletAddress.slice(0, 10)}…
                      {t.friend.walletAddress.slice(-6)}
                    </Link>
                    <Link
                      href={`/messages/${t.friend.id}`}
                      className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted touch-manipulation"
                    >
                      {sealed && (
                        <span
                          className="inline-flex shrink-0 text-accent"
                          title="Sealed"
                          aria-label="Sealed"
                        >
                          <LockIcon small />
                        </span>
                      )}
                      <span className="truncate">{t.preview}</span>
                    </Link>
                  </div>
                </div>
                <Link
                  href={`/messages/${t.friend.id}`}
                  className="flex shrink-0 items-center px-3 text-muted transition hover:bg-accent-soft/35 hover:text-foreground touch-manipulation"
                  aria-label={`Open chat with ${t.friend.displayName}`}
                >
                  ›
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}

function LockIcon({ small }: { small?: boolean }) {
  const size = small ? 12 : 16;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
