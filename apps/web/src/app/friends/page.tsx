"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User, FriendRequest } from "@philoxenia/shared";
import { Shell, SectionTitle, Button, Card, EmptyState } from "@/components/ui";
import { UserRow } from "@/components/cards";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface FriendsData {
  friends: User[];
  pendingIncoming: FriendRequest[];
  pendingOutgoing: FriendRequest[];
}

export default function FriendsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [data, setData] = useState<FriendsData | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    const friends = await api.get<FriendsData>("/friends");
    setData(friends);
  }

  useEffect(() => {
    if (!token) {
      router.replace("/auth");
      return;
    }
    load();
  }, [token, router]);

  async function search() {
    if (query.length < 2) return;
    const users = await api.get<User[]>(
      `/friends/search?q=${encodeURIComponent(query)}`
    );
    setResults(users);
  }

  async function sendRequest(toUserId: string) {
    await api.post("/friends/request", { toUserId });
    await load();
    setResults([]);
    setQuery("");
  }

  if (!data) {
    return (
      <Shell>
        <p className="text-muted">Loading…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <SectionTitle title="Friends" subtitle="Your trust network" />

      <Card className="mb-8">
        {!showAdd ? (
          <Button onClick={() => setShowAdd(true)}>Add friend</Button>
        ) : (
          <div>
            <h3 className="text-lg">Add someone you trust</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Philoxenia uses your network of friends as a trust layer. Only
              add people you genuinely know and trust. Your network helps
              reduce fraudulent users and listings.
            </p>
            <div className="mt-4 flex gap-2">
              <input
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5"
                placeholder="Search by name or wallet"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
              />
              <Button onClick={search}>Search</Button>
            </div>
            <div className="mt-4 space-y-2">
              {results.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  action={
                    <Button onClick={() => sendRequest(user.id)}>
                      Add friend
                    </Button>
                  }
                />
              ))}
            </div>
          </div>
        )}
      </Card>

      {data.pendingIncoming.length > 0 && (
        <section className="mb-8">
          <SectionTitle title="Pending requests" />
          <div className="space-y-2">
            {data.pendingIncoming.map((r) => (
              <UserRow
                key={r.id}
                user={r.fromUser!}
                action={
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        api
                          .post(`/friends/accept/${r.id}`)
                          .then(load)
                      }
                    >
                      Accept
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        api
                          .post(`/friends/reject/${r.id}`)
                          .then(load)
                      }
                    >
                      Reject
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle title="Your friends" />
        {data.friends.length === 0 ? (
          <EmptyState message="No friends yet." />
        ) : (
          <div className="space-y-2">
            {data.friends.map((friend) => (
              <UserRow
                key={friend.id}
                user={friend}
                action={
                  <Button
                    variant="ghost"
                    onClick={() =>
                      api.delete(`/friends/${friend.id}`).then(load)
                    }
                  >
                    Remove
                  </Button>
                }
              />
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}
