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
import { useNotifications } from "@/lib/notifications-context";
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
  const { refresh: refreshNotifications } = useNotifications();
  const [data, setData] = useState<FriendsData | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionOk, setActionOk] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const friends = await api.get<FriendsData>("/friends");
    setData(friends);
    void refreshNotifications();
  }

  useEffect(() => {
    if (!token) {
      router.replace("/home");
      return;
    }
    load().catch(() => setActionError("Could not load friends to Book & pay."));
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        load().catch(() => undefined);
      }
    }, 4000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, router]);

  async function search() {
    setSearchError("");
    setActionError("");
    setActionOk("");
    const normalized = normalizeWalletQuery(query);
    if (normalized.length < 6) {
      setSearchError(
        "Enter at least 4 hex characters of a Ready X wallet (0x is added if missing)."
      );
      setResults([]);
      return;
    }
    try {
      const users = await api.get<User[]>(
        `/friends/search?q=${encodeURIComponent(normalized)}`
      );
      setResults(users);
      if (users.length === 0) {
        setSearchError(
          "No Philoxenia user with that Ready X wallet. They must Connect Ready X once before you can add them."
        );
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Could not find that Ready X wallet");
      setResults([]);
    }
  }

  async function sendRequest(toUserId: string) {
    setActionError("");
    setActionOk("");
    setBusyId(toUserId);
    try {
      await api.post("/friends/request", { toUserId });
      await load();
      setResults([]);
      setQuery("");
      setShowAdd(false);
      setActionOk("Friend request sent — Book & pay after they accept.");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not send friend request to Book & pay"
      );
    } finally {
      setBusyId(null);
    }
  }

  async function runAction(
    id: string,
    action: () => Promise<unknown>,
    okMessage: string
  ) {
    setActionError("");
    setActionOk("");
    setBusyId(id);
    try {
      await action();
      await load();
      setActionOk(okMessage);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update Friends to Book & pay");
    } finally {
      setBusyId(null);
    }
  }

  if (!data) {
    return (
      <Shell>
        <p className="text-muted">Loading friends to Book & pay…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <SectionTitle
        title="Friends to Book & pay"
        subtitle="Add people by Ready X wallet address only — display names are not searchable."
      />

      {user && (
        <Card className="mb-6">
          <p className="text-sm font-medium text-foreground">Your Ready X wallet</p>
          <p className="mt-1 text-sm text-muted">
            Share this so friends can add you. They Book & pay in STRK or DAI.
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
            Add by Ready X wallet
          </Button>
        ) : (
          <div>
            <h3 className="text-lg">Add by Ready X wallet</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Paste a Ready X wallet address (0x optional). They must already have
              connected Ready X once. Only add people you genuinely know. Search needs
              at least 4 hex characters.
            </p>
            <div className="mt-4 space-y-3">
              <TextInput
                className="font-mono text-sm"
                placeholder="0x… Ready X wallet"
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
                  Search Ready X wallet
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
                  Close add by Ready X wallet
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
                      disabled={busyId === found.id}
                      onClick={() => sendRequest(found.id)}
                    >
                      {busyId === found.id ? "Sending friend request…" : "Add by Ready X wallet"}
                    </Button>
                  }
                />
              ))}
            </div>
          </div>
        )}
      </Card>

      {actionError && (
        <p className="mb-6 text-sm text-red-700" role="alert">
          {actionError}
        </p>
      )}
      {actionOk && !actionError && (
        <p className="mb-6 text-sm text-accent" role="status">
          {actionOk}
        </p>
      )}

      <section className="mb-8">
        <SectionTitle
          title="Friend requests to Book & pay"
          subtitle="Accept so you can Book & pay"
        />
        {data.pendingIncoming.length === 0 ? (
          <EmptyState message="No friend requests to Book & pay yet. They appear when someone adds your Ready X wallet." />
        ) : (
          <div className="space-y-2">
            {data.pendingIncoming.map((r) => {
              const person = r.fromUser;
              if (!person) return null;
              return (
                <UserRow
                  key={r.id}
                  user={person}
                  action={
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                      <Button
                        variant="secondary"
                        className="w-full sm:w-auto"
                        disabled={busyId === r.id}
                        onClick={() =>
                          runAction(
                            r.id,
                            () => api.post(`/friends/accept/${r.id}`),
                            "Friend request accepted — Book & pay their places."
                          )
                        }
                      >
                        {busyId === r.id ? "Accepting…" : "Accept to Book & pay"}
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full sm:w-auto"
                        disabled={busyId === r.id}
                        onClick={() =>
                          runAction(
                            r.id,
                            () => api.post(`/friends/reject/${r.id}`),
                            "Friend request rejected — they cannot Book & pay your places."
                          )
                        }
                      >
                        Reject to Book & pay
                      </Button>
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-8">
        <SectionTitle
          title="Sent requests to Book & pay"
          subtitle="Cancel before they can Book & pay"
        />
        {data.pendingOutgoing.length === 0 ? (
          <EmptyState message="No sent requests to Book & pay yet. Cancel appears here after you send one." />
        ) : (
          <div className="space-y-2">
            {data.pendingOutgoing.map((r) => {
              const person = r.toUser;
              if (!person) return null;
              return (
                <UserRow
                  key={r.id}
                  user={person}
                  action={
                    <Button
                      variant="secondary"
                      className="w-full sm:w-auto"
                      disabled={busyId === r.id}
                      onClick={() =>
                        runAction(
                          r.id,
                          () => api.post(`/friends/cancel/${r.id}`),
                          "Friend request cancelled — they cannot Book & pay yet."
                        )
                      }
                    >
                      {busyId === r.id ? "Cancelling…" : "Cancel friend request to Book & pay"}
                    </Button>
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Friends to Book & pay"
          subtitle="Tap a name or Ready X wallet to see places you can Book & pay. End friendship ends it for both of you."
        />
        {data.friends.length === 0 ? (
          <EmptyState message="No friends yet. Add someone by Ready X wallet address (0x optional) — they must Connect Ready X once, then you can Book & pay their places." />
        ) : (
          <div className="space-y-2">
            {data.friends.map((friend) => (
              <UserRow
                key={friend.id}
                user={friend}
                profileHref={`/friends/${friend.id}`}
                action={
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => router.push(`/messages/${friend.id}`)}
                    >
                      Messages
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full sm:w-auto"
                      disabled={busyId === friend.id}
                      onClick={() =>
                        runAction(
                          friend.id,
                          () => api.post(`/friends/remove/${friend.id}`),
                          "Friend removed — you can no longer Book & pay their places."
                        )
                      }
                    >
                      {busyId === friend.id ? "Ending friendship…" : "End friendship"}
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}
