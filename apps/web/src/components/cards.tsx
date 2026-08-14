import type { Listing, Booking, User } from "@philoxenia/shared";
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
            {listing.pricePerNight} {listing.paymentAsset}
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

export function BookingCard({ booking }: { booking: Booking }) {
  return (
    <Link
      href={`/bookings/${booking.id}`}
      className="block rounded-xl border border-border bg-surface p-5 transition hover:shadow-sm touch-manipulation"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg">
            {booking.listing?.title ?? "Booking"}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {new Date(booking.checkIn).toLocaleDateString()} –{" "}
            {new Date(booking.checkOut).toLocaleDateString()}
          </p>
          <p className="mt-2 text-sm">
            {booking.totalPrice} {booking.paymentAsset} · {booking.nights}{" "}
            nights
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-xs capitalize text-accent">
          {booking.status}
        </span>
      </div>
    </Link>
  );
}

export function UserRow({
  user,
  action,
}: {
  user: User;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border px-4 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{user.displayName}</p>
          <div className="mt-2">
            <WalletAddress address={user.walletAddress} compact />
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
