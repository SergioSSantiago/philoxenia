"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Booking, Listing } from "@philoxenia/shared";
import { formatDaiPrice, formatTokenAmount } from "@philoxenia/shared";
import { Shell, SectionTitle, EmptyState, Card, Button } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface ConnectorEarnings {
  totalEarned: string;
  bookings: Booking[];
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function ConnectorPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [data, setData] = useState<ConnectorEarnings | null>(null);
  const [networkListings, setNetworkListings] = useState<Listing[] | null>(
    null
  );
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareByListing, setShareByListing] = useState<
    Record<string, { url: string; status: string }>
  >({});
  const [shareError, setShareError] = useState("");

  useEffect(() => {
    if (!token) {
      router.replace("/home");
      return;
    }
    void Promise.all([
      api.get<ConnectorEarnings>("/connector/earnings"),
      api.get<Listing[]>("/my-network/listings"),
    ]).then(([earnings, listings]) => {
      setData(earnings);
      setNetworkListings(listings);
    });
  }, [token, router]);

  async function shareAsConnector(listing: Listing) {
    setSharingId(listing.id);
    setShareError("");
    try {
      const result = await api.post<{
        inviteUrl: string;
        hasConnector: boolean;
      }>(`/listings/${listing.id}/share`);
      const url = `${window.location.origin}${result.inviteUrl}`;

      if (typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: listing.title,
            text: `Stay at ${listing.title} via Philoxenia — open this invite to book.`,
            url,
          });
          setShareByListing((prev) => ({
            ...prev,
            [listing.id]: { url, status: "Invite shared — you are the connector" },
          }));
          return;
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") {
            setShareByListing((prev) => ({
              ...prev,
              [listing.id]: { url, status: "Share cancelled — link ready below" },
            }));
            return;
          }
        }
      }

      const copied = await copyText(url);
      setShareByListing((prev) => ({
        ...prev,
        [listing.id]: {
          url,
          status: copied
            ? "Invite copied — paste it to someone you trust. You earn if they book."
            : "Select the link below and copy it manually.",
        },
      }));
    } catch (err) {
      setShareError(err instanceof Error ? err.message : "Share failed");
    } finally {
      setSharingId(null);
    }
  }

  const earnable =
    networkListings?.filter((l) => l.connectorRewardPercent > 0) ?? [];
  const noReward =
    networkListings?.filter((l) => l.connectorRewardPercent <= 0) ?? [];

  return (
    <Shell>
      <div className="mb-8 space-y-3">
        <h1 className="text-2xl text-foreground sm:text-3xl">
          Earn as a connector
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          Friends list places privately. When you introduce a guest with your
          invite link and they book, you get a cut of the stay — paid straight
          to your wallet when the booking settles.
        </p>
      </div>

      <Card className="mb-10 space-y-4 border-accent/20 bg-accent-soft/30">
        <p className="text-sm font-medium text-accent">How you make money</p>
        <ol className="space-y-3 text-sm leading-relaxed text-foreground">
          <li>
            <span className="font-medium">1. Pick a friend&apos;s listing</span>
            {" — "}
            only places from people you already trust appear here.
          </li>
          <li>
            <span className="font-medium">2. Share your invite link</span>
            {" — "}
            not the wallet address. Opening the link attributes you as
            connector.
          </li>
          <li>
            <span className="font-medium">3. They book &amp; pay</span>
            {" — "}
            you receive the host&apos;s connector % on settle (Philoxenia takes
            10% of that reward only).
          </li>
        </ol>
        <p className="text-xs leading-relaxed text-muted">
          Example: a 1,000 DAI stay with 5% connector → you get 45 DAI, protocol
          5 DAI, host 950 DAI.
        </p>
      </Card>

      <section className="mb-12">
        <SectionTitle
          title="Share & earn"
          subtitle="Listings from your friends. Share your link to earn the connector reward."
        />

        {networkListings === null ? (
          <p className="text-muted">Loading listings…</p>
        ) : networkListings.length === 0 ? (
          <EmptyState message="No friend listings yet. Add friends who host — their places will show up here so you can share and earn." />
        ) : (
          <div className="space-y-4">
            {shareError && (
              <p className="text-sm text-red-700">{shareError}</p>
            )}
            {earnable.map((listing) => {
              const share = shareByListing[listing.id];
              const photo = listing.photos[0];
              return (
                <Card key={listing.id} className="!p-4 sm:!p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
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
                          {listing.host
                            ? ` · Hosted by ${listing.host.displayName}`
                            : ""}
                        </p>
                        <p className="mt-2 text-sm">
                          <span className="font-medium text-foreground">
                            {formatDaiPrice(listing.pricePerNight)}
                          </span>
                          <span className="text-muted"> / night</span>
                          <span className="mx-2 text-border">·</span>
                          <span className="font-medium text-accent">
                            You earn {listing.connectorRewardPercent}%
                          </span>
                          <span className="text-muted"> if they book</span>
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <Button
                          className="w-full sm:w-auto"
                          disabled={sharingId === listing.id}
                          onClick={() => void shareAsConnector(listing)}
                        >
                          {sharingId === listing.id
                            ? "Creating invite…"
                            : "Share invite & earn"}
                        </Button>
                        <Link href={`/listings/${listing.id}`}>
                          <Button
                            variant="secondary"
                            className="w-full sm:w-auto"
                          >
                            View listing
                          </Button>
                        </Link>
                      </div>
                      {share && (
                        <div className="space-y-2 rounded-xl border border-border bg-background px-3 py-3 text-sm">
                          <p className="text-foreground">{share.status}</p>
                          <p className="break-all font-mono text-xs text-muted select-all">
                            {share.url}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}

            {earnable.length === 0 && noReward.length > 0 && (
              <EmptyState message="Your friends have listings, but none offer a connector reward yet (0%). Ask them to set a % when they list — then sharing here pays you." />
            )}

            {noReward.length > 0 && earnable.length > 0 && (
              <div className="pt-2">
                <p className="mb-3 text-sm text-muted">
                  Also in your network (0% connector — sharing won&apos;t earn):
                </p>
                <ul className="space-y-2 text-sm">
                  {noReward.map((l) => (
                    <li key={l.id}>
                      <Link
                        href={`/listings/${l.id}`}
                        className="text-foreground underline-offset-2 hover:underline"
                      >
                        {l.title}
                      </Link>
                      {l.host ? (
                        <span className="text-muted">
                          {" "}
                          · {l.host.displayName}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {networkListings !== null && networkListings.length === 0 && (
          <div className="mt-4">
            <Link href="/friends">
              <Button variant="secondary">Add friends</Button>
            </Link>
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Your rewards"
          subtitle="Paid to your wallet when a guest you introduced completes payment."
        />

        {data && (
          <Card className="mb-6">
            <p className="text-sm text-muted">Total earned</p>
            <p className="mt-1 text-3xl text-foreground">
              {formatTokenAmount(data.totalEarned)}
            </p>
            <p className="mt-1 text-xs text-muted">
              Across settled introductions (asset shown per booking below)
            </p>
          </Card>
        )}

        {!data ? (
          <p className="text-muted">Loading rewards…</p>
        ) : data.bookings.length === 0 ? (
          <EmptyState message="No rewards yet. Share a friend listing above — when someone books through your invite, it shows up here." />
        ) : (
          <div className="space-y-4">
            {data.bookings.map((b) => (
              <Card key={b.id}>
                <p className="font-medium text-foreground">
                  {b.listing?.title ?? "Booking"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  Reward: {formatTokenAmount(b.connectorRewardAmount)}{" "}
                  {b.paymentAsset}
                  {b.connectorRewardPercent
                    ? ` (${b.connectorRewardPercent}%)`
                    : ""}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}
