import type { Listing, Booking, User } from "@philoxenia/shared";
import Link from "next/link";

export function ListingCard({ listing }: { listing: Listing }) {
  const photo = listing.photos[0];

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:shadow-md"
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
          <p className="mt-2 text-xs text-muted">Host: {listing.host.displayName}</p>
        )}
      </div>
    </Link>
  );
}

export function BookingCard({ booking }: { booking: Booking }) {
  return (
    <Link
      href={`/bookings/${booking.id}`}
      className="block rounded-xl border border-border bg-surface p-5 transition hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
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
        <span className="rounded-full bg-accent-soft px-3 py-1 text-xs capitalize text-accent">
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
    <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
      <div>
        <p className="font-medium">{user.displayName}</p>
        <p className="text-xs text-muted font-mono">
          {user.walletAddress.slice(0, 10)}…{user.walletAddress.slice(-6)}
        </p>
      </div>
      {action}
    </div>
  );
}
