<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Listings

Hosts create **private listings** visible only to themselves and their friends. `/listings/new` states guests **Book & pay STRK or DAI** and that friends can share and earn if a connector % is set. Create calendar: DAI list prices, guests **Book & pay** STRK or DAI. Default cancel terms are honest (nights free; no clawback; **Send STRK or DAI** in Messages). Host on listing detail: **Book & pay is disabled for the host**. `ListingCard` shows that % next to the DAI nightly price and **Guest Book & pay: STRK or DAI**.

## Listing fields

| Field | Description |
|-------|-------------|
| `title`, `description` | Basic listing info |
| `location`, `locationLat`, `locationLng` | Human-readable place + required map pin (WGS84). Create-listing copy: friends see the pin on Home to **Book & pay** — not a public directory. Listing detail **Open on OpenStreetMap** is an external OSM tab |
| `pricePerNight` | Default DAI price; nights can override per day on the calendar. Guests choose **STRK** (live FX) or **DAI** (1:1) at pay time — listing detail copy says both |
| `minStay`, `maxStay` | Derived from open nights (not host-entered) |
| `cancellationTerms` | Off-chain policy text (not enforced by escrow). Create-listing default: cancel frees nights; **Book & pay** already paid host/connector; money return is **Send STRK or DAI** in Messages. Listing detail matches |
| `connectorRewardPercent` | 0–100; **connector’s share** when a friend introduces a guest. Create-listing UI default is **5%** and explains 3–10% typical when they **Book & pay**; Philoxenia takes 10% of that reward only; **Direct Book & pay** stays 0% protocol ([connectors.md](./connectors.md)) |
| `photos` | 1–8 images (JPEG/PNG/WebP/HEIC); browser compresses to JPEG data URLs (~1600px). Uploader copy lists iPhone HEIC |
| `availableDays` | Preferred on create: `{ day, pricePerNight }[]` via host calendar. Host UI: DAI list prices; guests **Book & pay STRK or DAI** |
| `availability` | Legacy contiguous windows (still accepted) |

Paid guest nights stay in inventory as **locked** (`booked`): host cannot remove them or change their price; social cancel frees them again.

## Delete listing

`DELETE /my-listings/:id` (host only).

Allowed when there are **no active Book & pay stays** (funded / confirmed / completed with a night today or in the future). Past paid stays do not block delete. Confirm dialog copy matches.

## Cancellation vs escrow

`cancellationTerms` are **not** encoded in `BookingEscrow`. Current **Book & pay** is fund + settle in one tx, so there is **no clawback**. Honouring written terms is social: cancel frees nights; any money return is **Send STRK or DAI** in Messages.

Legacy on-chain `refund_booking` only applies if a booking never settled (`funded`). The web UI does not offer that after immediate settle.

## Visibility

```
Host ──always──► own listings
Friend of host ──► can view + share
Everyone else ──► 404 (listing unavailable)
```

`GET /my-listings` powers `/my-listings` and Home **My listings**: both subtitles remind hosts of DAI list prices, guests **Book & pay STRK or DAI**, and connector %. Empty states tell hosts to list so guests **Book & pay**. **List your place** goes to `/listings/new`. Home **Places from my friends** empty state points to Friends, then Book & pay. **Shared with me** empty: open a friend’s invite to **Book & pay**.

## Home globe

`/home` plots accessible listings on a cobe globe (`listings-globe.tsx`). Pins need `locationLat` / `locationLng`. Colors: **yours** (orange), **friends** (dark), **shared via invite** (taupe). Aria: **Interactive globe of places you can Book & pay**. Empty: listings need a map pin — add friends by **Ready X wallet** or list a place to **Book & pay**. Tap a pin to open the listing.

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/my-listings` | Yes | Create listing (map pin + photos required) |
| GET | `/my-listings` | Yes | Host's own listings |
| DELETE | `/my-listings/:id` | Yes | Host delete when no active Book & pay stays remain |
| GET | `/my-network/listings` | Yes | Friends' listings |
| GET | `/friends/:id` | Yes | One friend’s listings (must be friends) |
| GET | `/shared-listings` | Yes | Listings shared with user via introductions |
| GET | `/listings/:id` | Yes | Detail (if authorized). Guest CTA is **Book & pay** |
| POST | `/listings/:id/share` | Yes | Generate invite link (friend → connector) |
| GET | `/connector/earnings` | Yes | Your connector reward history |

## Related

- [connectors.md](./connectors.md) — share friends’ places and earn
- [invitations.md](./invitations.md)
- [bookings.md](./bookings.md)
