"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User, FriendRequest } from "@philoxenia/shared";
import {
  Shell,
  SectionTitle,
  Button,
  Card,
  EmptyState,
  TextInput,
} from "@/components/ui";
import { UserRow } from "@/components/cards";
import { WalletAddress } from "@/components/wallet-address";
import { WalletBalances } from "@/components/wallet-balances";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface FriendsData {
  friends: User[];
  pendingIncoming: FriendRequest[];
  pendingOutgoing: FriendRequest[];
}

function normalizeWalletQuery(raw: string): string {
  let q = raw.trim().toLowerCase().replace(/\s/g, "");
  if (q && !q.startsWith("0x")) q = `0x${q}`;
  return q;
}

export default function FriendsPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [data, setData] = useState<FriendsData | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [searchError, setSearchError] = useState("");

  async function load() {
    const friends = await api.get<FriendsData>("/friends");
    setData(friends);
  }

  useEffect(() => {
    if (!token) {
      router.replace("/home");
      return;
    }
    load();
  }, [token, router]);

  async function search() {
    setSearchError("");
    const normalized = normalizeWalletQuery(query);
    if (normalized.length < 6) {
      setSearchError("Enter at least 4 characters of a wallet address (with 0x).");
      setResults([]);
      return;
    }
    const users = await api.get<User[]>(
      `/friends/search?q=${encodeURIComponent(normalized)}`
    );
    setResults(users);
    if (users.length === 0) {
      setSearchError("No user found with that wallet address.");
    }
  }

  async function sendRequest(toUserId: string) {
    await api.post("/friends/request", { toUserId });
    await load();
    setResults([]);
    setQuery("");
    setShowAdd(false);
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
      <SectionTitle
        title="Friends"
        subtitle="Add people by wallet address only — display names are not searchable."
      />

      {user && (
        <Card className="mb-6">
          <p className="text-sm font-medium text-foreground">Your wallet</p>
          <p className="mt-1 text-sm text-muted">
            Share this so friends can add you.
          </p>
          <div className="mt-3 space-y-4">
            <WalletAddress address={user.walletAddress} />
            <WalletBalances compact />
          </div>
        </Card>
      )}

      <Card className="mb-8">
        {!showAdd ? (
          <Button className="w-full sm:w-auto" onClick={() => setShowAdd(true)}>
            Add friend by wallet
          </Button>
        ) : (
          <div>
            <h3 className="text-lg">Add someone you trust</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Paste their Starknet wallet address. Philoxenia uses your network
              as a trust layer — only add people you genuinely know.
            </p>
            <div className="mt-4 space-y-3">
              <TextInput
                className="font-mono text-sm"
                placeholder="0x… wallet address"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                inputMode="text"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="w-full sm:w-auto" onClick={search}>
                  Search
                </Button>
                <Button
                  variant="ghost"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setShowAdd(false);
                    setQuery("");
                    setResults([]);
                    setSearchError("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
            {searchError && (
              <p className="mt-3 text-sm text-muted">{searchError}</p>
            )}
            <div className="mt-4 space-y-2">
              {results.map((found) => (
                <UserRow
                  key={found.id}
                  user={found}
                  action={
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => sendRequest(found.id)}
                    >
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
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Button
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        api.post(`/friends/accept/${r.id}`).then(load)
                      }
                    >
                      Accept
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        api.post(`/friends/reject/${r.id}`).then(load)
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
                    className="w-full sm:w-auto"
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
