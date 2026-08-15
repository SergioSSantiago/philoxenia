"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChatThread } from "@philoxenia/shared";
import { Shell, SectionTitle, EmptyState, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

export default function MessagesPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      router.replace("/home");
      return;
    }
    function load() {
      api
        .get<ChatThread[]>("/messages")
        .then(setThreads)
        .catch(() => setError("Could not load messages."));
    }
    load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 4000);
    return () => window.clearInterval(id);
  }, [token, router]);

  return (
    <Shell>
      <SectionTitle
        title="Messages"
        subtitle="Chat with friends — send notes or DAI / STRK"
      />
      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
      {threads.length === 0 ? (
        <EmptyState message="No friends to message yet. Add friends first." />
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Link key={t.friend.id} href={`/messages/${t.friend.id}`}>
              <Card className="transition hover:bg-accent-soft/30">
                <p className="font-medium text-foreground">
                  {t.friend.displayName}
                </p>
                <p className="mt-1 truncate text-sm text-muted">
                  {t.lastMessage?.body ?? "Start a conversation"}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Shell>
  );
}
