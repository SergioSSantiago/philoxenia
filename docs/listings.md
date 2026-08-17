<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Listings

Hosts create **private listings** visible only to themselves and their friends. `/listings/new` states that friends can share and earn if a connector % is set. `ListingCard` shows that % next to the DAI nightly price and that **guests pay STRK or DAI**.

## Listing fields

| Field | Description |
|-------|-------------|
| `title`, `description` | Basic listing info |
| `location`, `locationLat`, `locationLng` | Human-readable place + required map pin (WGS84). Create-listing copy: friends see the pin on Home — not a public directory |
| `pricePerNight` | Default DAI price; nights can override per day on the calendar. Guests choose **STRK** (live FX) or **DAI** (1:1) at pay time — listing detail copy says both |
| `minStay`, `maxStay` | Derived from open nights (not host-entered) |
| `cancellationTerms` | Off-chain policy text (not enforced by escrow). Listing detail: cancel frees nights, no clawback; money return in Messages |
| `connectorRewardPercent` | 0–100; **connector’s share** when a friend introduces a guest. Create-listing UI default is **5%** and explains 3–10% typical; Philoxenia takes 10% of that reward only ([connectors.md](./connectors.md)) |
| `photos` | 1–8 images (JPEG/PNG/WebP/HEIC); browser compresses to JPEG data URLs (~1600px). Uploader copy lists iPhone HEIC |
| `availableDays` | Preferred on create: `{ day, pricePerNight }[]` via host calendar. Host UI: DAI list prices; guests may pay STRK or DAI |
| `availability` | Legacy contiguous windows (still accepted) |

Paid guest nights stay in inventory as **locked** (`booked`): host cannot remove them or change their price; social cancel frees them again.

## Delete listing

`DELETE /my-listings/:id` (host only).

Allowed when there are **no active paid bookings** (funded / confirmed / completed with a night today or in the future). Past paid stays do not block delete.

## Cancellation vs escrow

`cancellationTerms` are **not** encoded in `BookingEscrow`. On-chain, after funding:

- Guest (or owner) calls `settle_booking`
- Host (or owner) calls `refund_booking`

Honouring the written policy is social/off-chain until automated rules are added.

## Visibility

```
Host ──always──► own listings
Friend of host ──► can view + share
Everyone else ──► 404 (listing unavailable)
```

`GET /my-listings` powers `/my-listings`: subtitle reminds hosts of DAI pricing + connector %; **List your place** goes to `/listings/new`.

## Home globe

`/home` plots accessible listings on a cobe globe (`listings-globe.tsx`). Pins need `locationLat` / `locationLng`. Colors: **yours** (orange), **friends** (dark), **shared via invite** (taupe). Empty: “listings need a map pin.” Tap a pin to open the listing.

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/my-listings` | Yes | Create listing (map pin + photos required) |
| GET | `/my-listings` | Yes | Host's own listings |
| DELETE | `/my-listings/:id` | Yes | Host delete when no active paid bookings remain |
| GET | `/my-network/listings` | Yes | Friends' listings |
| GET | `/friends/:id` | Yes | One friend’s listings (must be friends) |
| GET | `/shared-listings` | Yes | Listings shared with user via introductions |
| GET | `/listings/:id` | Yes | Detail (if authorized) |
| POST | `/listings/:id/share` | Yes | Generate invite link (friend → connector) |
| GET | `/connector/earnings` | Yes | Your connector reward history |

## Related

- [connectors.md](./connectors.md) — share friends’ places and earn
- [invitations.md](./invitations.md)
- [bookings.md](./bookings.md)
