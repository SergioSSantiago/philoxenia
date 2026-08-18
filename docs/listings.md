<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Listings

Hosts create **private places** visible only to themselves and their friends. `/listings/new` states guests **Book & pay STRK or DAI** and that friends can share and earn if a connector % is set. Submit busy: **Publishing this place…** (not a marketplace “Listing…”). Create calendar: DAI list prices, guests **Book & pay** STRK or DAI. Default cancel terms are honest (nights free; no clawback; **Send STRK or DAI** in Messages). Host on place detail: **Book & pay is disabled for the host**. `ListingCard` shows that % next to the DAI nightly price and **Guest Book & pay: STRK or DAI**. Photo uploader alt: **Place photo**; fail: **Could not add this place photo**. Native share sheet: **Book & pay stay at …**.

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

Paid guest nights stay in inventory as **locked** (`booked`). Guest and host calendars label those days **paid**. Host heading **Open nights guests can Book & pay**; **Save open nights** (busy **Saving open nights…**); success **Open nights saved — guests can Book & pay.** Guest calendar footer: tap nights one by one; past nights cannot be added to **Book & pay**; **Book & pay** in STRK or DAI. Host cannot remove locked nights or change their price; social cancel frees them again.

## Delete this place

`DELETE /my-listings/:id` (host only).

Allowed when there are **no active Book & pay stays** (funded / confirmed / completed with a night today or in the future). Past paid stays do not block delete. Confirm: **Delete this place?** API error if still active: **Cannot delete this place while it has active Book & pay stays.**

## Cancellation vs escrow

`cancellationTerms` are **not** encoded in `BookingEscrow`. Current **Book & pay** is fund + settle in one tx, so there is **no clawback**. Honouring written terms is social: cancel frees nights; any money return is **Send STRK or DAI** in Messages.

Legacy on-chain `refund_booking` only applies if a booking never settled (`funded`). The web UI does not offer that after immediate settle.

## Visibility

```
Host ──always──► own places
Friend of host ──► can view + share
Everyone else ──► 404 (place unavailable)
```

`GET /my-listings` powers `/my-listings` and Home **My places**: both subtitles remind hosts of DAI list prices, guests **Book & pay STRK or DAI**, and connector %. Empty states tell hosts to list so guests **Book & pay**. **List your place** goes to `/listings/new` (submit **List this place**; validation: **Open at least one night guests can Book & pay**; default DAI price is used when you open those nights). Home **Places from my friends** empty: no places from friends yet. **Shared with me** empty: **No invite places yet**. Home **My stays**: recent Book & pay stays. Home loaders: **Loading places to Book & pay…**.

## Home globe

`/home` plots accessible places on a cobe globe (`listings-globe.tsx`). Pins need `locationLat` / `locationLng`. Colors: **yours** (orange), **friends** (dark), **invite** (taupe). Pin/legend labels: **Yours** / **Friend** / **Invite**. Cluster counts: **N places here**. Aria: **Interactive globe of places you can Book & pay**. Cluster menu: **Choose a place to Book & pay**. Empty: **places need a map pin** — add friends by **Ready X wallet** or list a place to **Book & pay**. Tap a pin to open the place.

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/my-listings` | Yes | Create place (map pin + photos required) |
| GET | `/my-listings` | Yes | Host's own places |
| DELETE | `/my-listings/:id` | Yes | Host delete when no active Book & pay stays remain |
| GET | `/my-network/listings` | Yes | Friends' places |
| GET | `/friends/:id` | Yes | One friend’s places (must be friends) |
| GET | `/shared-listings` | Yes | Places shared with user via introductions |
| GET | `/listings/:id` | Yes | Detail (if authorized). Guest heading **Open nights to Book & pay**. Guest CTA is **Book & pay**. Unauthorized: **This place isn’t available to Book & pay.** Loading: **Loading place to Book & pay…**. Host/0% share: **Share this place**. Busy **Creating place invite…**; fail **Could not share this place**. Host badge **Your place**. Delete: **Delete this place** (fail **Could not delete this place**). Host nights busy **Saving open nights…** (fail **Could not save open nights**) |
| POST | `/listings/:id/share` | Yes | Generate invite link (friend → connector) |
| GET | `/connector/earnings` | Yes | Your connector reward history |

## Related

- [connectors.md](./connectors.md) — share friends’ places and earn
- [invitations.md](./invitations.md)
- [bookings.md](./bookings.md)
