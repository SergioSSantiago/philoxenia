"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Listing, Booking, User } from "@philoxenia/shared";
import { AuthModal } from "@/components/auth-modal";
import { Shell, SectionTitle, EmptyState, Button, Card } from "@/components/ui";
import { ListingCard, BookingCard } from "@/components/cards";
import { WalletAddress } from "@/components/wallet-address";
import { WalletBalances } from "@/components/wallet-balances";
import { ListingsGlobe } from "@/components/listings-globe";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface HomeData {
  friends: User[];
  networkListings: Listing[];
  sharedListings: Listing[];
  myListings: Listing[];
  myBookings: Booking[];
  pendingFriendRequests: number;
}

export default function HomePage() {
  const { user, token, isLoading, openSignIn } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      openSignIn();
      setData(null);
      return;
    }

    api.get<HomeData>("/home").then(setData).catch(() => {
      openSignIn();
    });
  }, [token, isLoading, openSignIn]);

  if (isLoading) {
    return (
      <Shell>
        <p className="text-muted">Loading…</p>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell wide>
        <div className="mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl">Your private network</h1>
          <p className="mt-2 text-sm text-muted sm:text-base">
            Connect your wallet to see places from people you trust.
          </p>
        </div>
        <Button onClick={openSignIn}>Connect wallet</Button>
        <AuthModal />
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell>
        <p className="text-muted">Loading…</p>
      </Shell>
    );
  }

  return (
    <Shell wide>
      <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(200px,260px)_minmax(0,1fr)] lg:items-start">
        <aside className="min-w-0 space-y-3">
          <div>
            <h1 className="text-2xl leading-tight sm:text-3xl">
              Hello, {user.displayName}
            </h1>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Your network of trusted places.
            </p>
          </div>
          <Card className="min-w-0 space-y-3 overflow-hidden p-4 sm:p-4">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted">
                Wallet
              </p>
              <div className="mt-1.5 min-w-0 origin-left scale-95">
                <WalletAddress address={user.walletAddress} />
              </div>
            </div>
            <hr className="border-border" />
            <WalletBalances compact />
            <Link href="/profile" className="block">
              <Button variant="secondary" className="w-full text-xs">
                Swap STRK ↔ DAI
              </Button>
            </Link>
            <Link href="/profile" className="block">
              <Button variant="ghost" className="w-full text-xs">
                Edit profile
              </Button>
            </Link>
          </Card>
        </aside>

        <ListingsGlobe
          myListings={data.myListings}
          networkListings={data.networkListings}
          sharedListings={data.sharedListings}
        />
      </div>

      <div className="space-y-12">
        <section>
          <SectionTitle
            title="Places from my friends"
            subtitle="Listings visible through your trust network"
          />
          {data.networkListings.length === 0 ? (
            <EmptyState message="No listings from friends yet. Add friends to discover places." />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.networkListings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle title="Shared with me" />
          {data.sharedListings.length === 0 ? (
            <EmptyState message="No shared listings yet." />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.sharedListings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle title="My listings" />
          {data.myListings.length === 0 ? (
            <EmptyState message="You haven't listed a place yet." />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.myListings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle title="My bookings" />
          {data.myBookings.length === 0 ? (
            <EmptyState message="No bookings yet." />
          ) : (
            <div className="space-y-4">
              {data.myBookings.slice(0, 5).map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle
            title="My friends"
            subtitle={
              data.pendingFriendRequests > 0
                ? `${data.pendingFriendRequests} pending request(s)`
                : undefined
            }
          />
          {data.friends.length === 0 ? (
            <EmptyState message="Add people you trust to build your network." />
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted">{data.friends.length} friends</p>
              <Link href="/friends">
                <Button variant="secondary" className="w-full sm:w-auto">
                  Manage friends
                </Button>
              </Link>
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}
