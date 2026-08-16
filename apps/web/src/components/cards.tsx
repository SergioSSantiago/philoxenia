import type { Listing, Booking, User } from "@philoxenia/shared";
import { formatDaiPrice, formatTokenAmount } from "@philoxenia/shared";
import Link from "next/link";
import { WalletAddress } from "@/components/wallet-address";

export function ListingCard({ listing }: { listing: Listing }) {
  const photo = listing.photos[0];

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:shadow-md touch-manipulation"
    >
      <div className="aspect-[4/3] bg-accent-soft/40">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={listing.title}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            No photo
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-lg text-foreground">{listing.title}</h3>
        <p className="mt-1 text-sm text-muted">{listing.location}</p>
        <p className="mt-3 text-sm">
          <span className="font-medium text-foreground">
            {formatDaiPrice(listing.pricePerNight)}
          </span>
          <span className="text-muted"> / night</span>
        </p>
        {listing.host && (
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
              Host
            </span>
            <span className="text-sm font-medium text-foreground">
              {listing.host.displayName}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

export function BookingCard({
  booking,
  viewerId,
}: {
  booking: Booking;
  viewerId?: string;
}) {
  const asHost = Boolean(viewerId && viewerId === booking.hostId);
  const asGuest = Boolean(viewerId && viewerId === booking.guestId);
  const roleLabel = asHost ? "You host" : asGuest ? "You stay" : null;
  const other = asHost ? booking.guest : booking.host;
  const otherRole = asHost ? "Guest" : "Host";
  const otherHref = other
    ? `/friends/${other.id}`
    : asHost
      ? `/friends/${booking.guestId}`
      : `/friends/${booking.hostId}`;
  const listingHref = `/listings/${booking.listingId}`;

  return (
    <div className="rounded-xl border border-border bg-surface p-5 transition hover:shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {roleLabel ? (
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                {roleLabel}
              </span>
            ) : null}
            <Link
              href={`/bookings/${booking.id}`}
              className="rounded-full border border-border px-2.5 py-0.5 text-xs capitalize text-muted touch-manipulation"
            >
              {booking.status}
            </Link>
          </div>
          <Link
            href={listingHref}
            className="block text-lg text-foreground underline-offset-2 hover:underline touch-manipulation"
          >
            {booking.listing?.title ?? "Private listing"}
          </Link>
          {other ? (
            <p className="text-sm text-muted">
              {otherRole}:{" "}
              <Link
                href={otherHref}
                className="font-medium text-foreground underline-offset-2 hover:underline touch-manipulation"
              >
                {other.displayName}
              </Link>
            </p>
          ) : (
            <p className="text-sm text-muted">
              {otherRole}:{" "}
              <Link
                href={otherHref}
                className="font-medium text-foreground underline-offset-2 hover:underline touch-manipulation"
              >
                View profile
              </Link>
            </p>
          )}
          <Link
            href={`/bookings/${booking.id}`}
            className="block text-sm text-muted touch-manipulation hover:text-foreground"
          >
            {new Date(booking.checkIn).toLocaleDateString()} –{" "}
            {new Date(booking.checkOut).toLocaleDateString()}
            <span className="mt-1 block">
              {formatTokenAmount(booking.totalPrice)} {booking.paymentAsset} ·{" "}
              {booking.nights} nights
              {booking.privacyMode === "private"
                ? " · Private"
                : booking.privacyMode === "public"
                  ? " · Public"
                  : ""}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function UserRow({
  user,
  action,
  profileHref,
}: {
  user: User;
  action?: React.ReactNode;
  /** When set, name + wallet open this friend’s listings. */
  profileHref?: string;
}) {
  const name = profileHref ? (
    <Link
      href={profileHref}
      className="font-medium text-foreground underline-offset-2 hover:underline touch-manipulation"
    >
      {user.displayName}
    </Link>
  ) : (
    <p className="font-medium text-foreground">{user.displayName}</p>
  );

  return (
    <div className="rounded-xl border border-border px-4 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {name}
          <div className="mt-2">
            <WalletAddress
              address={user.walletAddress}
              compact
              href={profileHref}
            />
          </div>
        </div>
        {action && (
          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
