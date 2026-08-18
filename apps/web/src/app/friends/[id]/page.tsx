"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { Listing, User } from "@philoxenia/shared";
import { formatDaiPrice } from "@philoxenia/shared";
import {
  Shell,
  SectionTitle,
  EmptyState,
  Card,
  Button,
} from "@/components/ui";
import { CopyInviteButton } from "@/components/copy-invite-button";
import { WalletAddress } from "@/components/wallet-address";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  copyText,
  inviteReadyStatus,
  shareInviteNative,
} from "@/lib/share-invite";

interface FriendProfile {
  friend: User;
  listings: Listing[];
}

export default function FriendProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [error, setError] = useState("");
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareByListing, setShareByListing] = useState<
    Record<string, { url: string; status: string }>
  >({});

  useEffect(() => {
    if (!token) {
      router.replace("/home");
      return;
    }
    if (!params.id) return;

    api
      .get<FriendProfile>(`/friends/${params.id}`)
      .then(setProfile)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load friend");
      });
  }, [token, router, params.id]);

  async function shareAsConnector(listing: Listing) {
    setSharingId(listing.id);
    setError("");
    try {
      const result = await api.post<{
        inviteUrl: string;
        hasConnector: boolean;
      }>(`/listings/${listing.id}/share`);
      const url = `${window.location.origin}${result.inviteUrl}`;
      const copied = await copyText(url);
      setShareByListing((prev) => ({
        ...prev,
        [listing.id]: {
          url,
          status: inviteReadyStatus(copied, result.hasConnector),
        },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Share failed");
    } finally {
      setSharingId(null);
    }
  }

  async function shareInviteViaSystem(
    listingId: string,
    title: string,
    asConnector: boolean
  ) {
    const share = shareByListing[listingId];
    if (!share) return;
    const result = await shareInviteNative({
      title,
      text: `Stay at ${title} via Philoxenia — open this invite to Book & pay (STRK or DAI).`,
      url: share.url,
    });
    if (result === "shared") {
      setShareByListing((prev) => ({
        ...prev,
        [listingId]: {
          ...share,
          status: asConnector
            ? "Invite shared — you are the connector"
            : "Invite shared",
        },
      }));
    }
  }

  if (error && !profile) {
    return (
      <Shell>
        <p className="text-muted">{error}</p>
        <div className="mt-4">
          <Link href="/friends">
            <Button variant="secondary">Back to friends</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  if (!profile) {
    return (
      <Shell>
        <p className="text-muted">Loading places to Book & pay…</p>
      </Shell>
    );
  }

  const { friend, listings } = profile;

  return (
    <Shell>
      <div className="mb-6">
        <Link
          href="/friends"
          className="text-sm text-muted transition hover:text-foreground"
        >
          ← Friends
        </Link>
      </div>

      <Card className="mb-8 space-y-4">
        <div>
          <h1 className="text-2xl text-foreground sm:text-3xl">
            {friend.displayName}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Places they host in your trust network — open one to Book &amp; pay,
            or share an invite to earn as connector (STRK or DAI, same asset
            they Book &amp; pay).
          </p>
        </div>
        <WalletAddress address={friend.walletAddress} compact />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href={`/messages/${friend.id}`}>
            <Button className="w-full sm:w-auto">Message</Button>
          </Link>
          <Link href="/connector">
            <Button variant="secondary" className="w-full sm:w-auto">
              Earn as a connector
            </Button>
          </Link>
        </div>
      </Card>

      {error && (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <SectionTitle
        title="Their listings"
        subtitle={
          listings.length > 0
            ? `${listings.length} place${listings.length === 1 ? "" : "s"} you can Book & pay or share`
            : undefined
        }
      />

      {listings.length === 0 ? (
        <EmptyState message="This friend hasn’t listed a place yet. You can still message them; Book & pay when they list." />
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => {
            const share = shareByListing[listing.id];
            const photo = listing.photos[0];
            const canEarn = listing.connectorRewardPercent > 0;
            return (
              <Card key={listing.id} className="!p-4 sm:!p-5">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Link
                    href={`/listings/${listing.id}`}
                    className="block h-28 w-full shrink-0 overflow-hidden rounded-xl bg-accent-soft/40 sm:h-auto sm:w-32"
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted">
                        No photo
                      </div>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <Link
                        href={`/listings/${listing.id}`}
                        className="text-lg font-medium text-foreground hover:underline"
                      >
                        {listing.title}
                      </Link>
                      <p className="mt-0.5 text-sm text-muted">
                        {listing.location}
                      </p>
                      <p className="mt-2 text-sm">
                        <span className="font-medium text-foreground">
                          {formatDaiPrice(listing.pricePerNight)}
                        </span>
                        <span className="text-muted"> / night</span>
                        {canEarn ? (
                          <>
                            <span className="mx-2 text-border">·</span>
                            <span className="font-medium text-accent">
                              You earn {listing.connectorRewardPercent}%
                            </span>
                            <span className="text-muted"> if they Book & pay</span>
                          </>
                        ) : (
                          <>
                            <span className="mx-2 text-border">·</span>
                            <span className="text-muted">
                              No connector reward
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Link href={`/listings/${listing.id}`}>
                        <Button
                          variant="secondary"
                          className="w-full sm:w-auto"
                        >
                          View place
                        </Button>
                      </Link>
                      <Button
                        className="w-full sm:w-auto"
                        disabled={sharingId === listing.id}
                        onClick={() => void shareAsConnector(listing)}
                      >
                        {sharingId === listing.id
                          ? "Creating invite…"
                          : canEarn
                            ? "Share invite & earn"
                            : "Share invite"}
                      </Button>
                    </div>
                    {share && (
                      <div className="space-y-2 rounded-xl border border-border bg-background px-3 py-3 text-sm">
                        <p className="text-foreground">{share.status}</p>
                        <p className="break-all font-mono text-xs text-muted select-all">
                          {share.url}
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <CopyInviteButton
                            url={share.url}
                            onCopied={(ok) =>
                              setShareByListing((prev) => ({
                                ...prev,
                                [listing.id]: {
                                  ...share,
                                  status: inviteReadyStatus(ok, canEarn),
                                },
                              }))
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            className="w-full sm:w-auto"
                            onClick={() =>
                              void shareInviteViaSystem(
                                listing.id,
                                listing.title,
                                canEarn
                              )
                            }
                          >
                            Share via…
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
