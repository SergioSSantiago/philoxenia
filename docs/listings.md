<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Listings

Hosts create **private places** visible only to themselves and their friends. `/listings/new` intro: Price is in DAI; **Book & pay STRK or DAI** (not “guests Book & pay”). Friends can **share a place invite** and earn if a connector % is set. Create headings: **About this place**, **Open nights to Book & pay** (not “Open nights guests can Book & pay” / marketplace “Basics” / “Availability”). Create field **DAI list price / night** (not “Default price per night (DAI)”). Create labels **Title for this place** / **Description for this place** (match required errors). Description placeholder **What makes this place special for a friend who can Book & pay?** (not “trusted guest”). Submit busy: **Publishing this place…**. Submit idle: **Publish this place** (not “List this place”). Fail: **Could not publish this place**; title/description: **Title/Description for this place is required**; photos: **Add at least one place photo** / **Maximum 8 place photos**; missing cancel text: **Write cancellation terms for this place**. Create calendar: DAI list prices, **Book & pay** STRK or DAI (not “guests Book & pay”). Default cancel terms are honest (nights free; no clawback; **Send STRK or DAI** in Messages). Host on place detail: **You published this place — Book & pay is disabled here** (not “disabled for the host”). Place cancel helper: after Book & pay, **who publishes this place and the connector already have the funds**. `ListingCard` shows `{n}% connector reward` next to the DAI nightly price, **Book & pay: STRK or DAI** (not “Guest Book & pay”), badge **Publishes this place** (not “Host”), and **No place photo** when the first image is missing. Photo uploader heading **Place photos**; helper **Upload 1–8 place photos**; **Add place photos** (busy **Adding place photos…**); alt **Place photo**; fail **Could not add this place photo** / **Only place photos…**; too large **compress and add this place photo again** (not “try again”). Host nights discard: **Discard open nights**. Native share sheet: **Book & pay stay at …** — **open this place invite (STRK or DAI)**; button **Share place invite…** (not “Share via…”). Copy button: **Copy place invite**.

## Listing fields

| Field | Description |
|-------|-------------|
| `title`, `description` | About this place. Create labels **Title for this place** / **Description for this place** |
| `location`, `locationLat`, `locationLng` | Human-readable place + required map pin (WGS84). Picker heading **Place on the map**. Create-listing copy: friends see the pin on Home to **Book & pay** — not a public directory. Empty picker: **Pin this place on the map for friends to Book & pay.** (not “for guests to Book & pay”). Missing pin (create + API): **Pin this place on the map**. Map search placeholder **Search this place on the map…**; button **Search this place** (busy **Searching this place…**, not “Search”). Map search fail: **Could not find that place**. Out-of-range pin: **Pin a valid place on the map**. Listing detail **Open this place on OpenStreetMap** (not “Open on OpenStreetMap”) is an external OSM tab |
| `pricePerNight` | DAI list price; nights can override per day on the calendar. Place detail: **DAI list price** (not “Default list price” / “Listed in DAI”). Place helper: **to who publishes this place & connector** (not “to host & connector”). Guests choose **STRK** (live FX) or **DAI** (1:1) at pay time — listing detail copy says both |
| `minStay`, `maxStay` | Derived from open nights (not host-entered). Invalid: **Stay limits must allow at least one night to Book & pay**. Range windows: **Open nights must end after they start** |
| `cancellationTerms` | Off-chain policy text (not enforced by escrow). Create-listing default: **Book & pay already paid who publishes this place (and connector)** (not “paid the host”). Helper: after Book & pay, **who publishes this place and the connector already have the funds** (not “host and connector”). Money return is **Send STRK or DAI** in Messages. Helper **friends to Book & pay will honour** (not “your network will honour”). Place detail heading **Cancellation terms:** (not “Cancellation:”). Native share fallback title **this place** (not “Philoxenia place”) |
| `connectorRewardPercent` | 0–100; **connector’s share** when a friend introduces a guest. Create-listing UI default is **5%** and explains 3–10% typical when they **Book & pay**; Philoxenia takes 10% of that reward only; **Direct Book & pay** stays 0% protocol ([connectors.md](./connectors.md)) |
| `photos` | 1–8 images (JPEG/PNG/WebP/HEIC); browser compresses to JPEG data URLs (~1600px). Uploader copy lists iPhone HEIC |
| `availableDays` | Preferred on create: `{ day, pricePerNight }[]` via host calendar. Host UI: DAI list prices; guests **Book & pay STRK or DAI** |
| `availability` | Legacy contiguous windows (still accepted) |

Paid guest nights stay in inventory as **locked** (`booked`). Guest and host calendars label those days **paid**. Host helper: **Book & pay nights stay locked** (not “Paid nights stay locked”); list heading **Book & pay nights (locked)**. Host heading **Open nights to Book & pay** (not “Open nights guests can Book & pay”); range CTA **Open nights to Book & pay** (not “Add range”); range start **Open from**; range end **Until (morning they leave)** (not “Until (morning guests leave)”); price field **DAI list price / night**; **Save open nights** (busy **Saving open nights…**); success **Open nights saved — friends can Book & pay.** (not “guests can Book & pay”). Empty PATCH: **Open at least one night to Book & pay**. Bad night price: **Enter a valid DAI list price for {day}**. Guest calendar footer: tap nights one by one; past nights cannot be added to **Book & pay**; **Book & pay** in STRK or DAI. Month controls **Previous month of nights** / **Next month of nights** (not “Previous month” / “Next month”). Host cannot remove locked nights or change their price; social cancel frees them again.

## Delete this place

`DELETE /my-listings/:id` (host only).

Allowed when there are **no active Book & pay stays** (funded / confirmed / completed with a night today or in the future). Past paid stays do not block delete. Confirm: **Delete this place?** Body: **This permanently deletes this place** (not “removes the place”). Busy: **Deleting this place…** (not “Working…”). Defaults if a dialog omits labels: **Confirm this place** / **Working on this place…** (not “Confirm” / “Working…”). Keep: **Keep this place**. API error if still active: **Cannot delete this place while it has active Book & pay stays.** Wait until those stays are past, or **Free nights** on those stays (not “mark them cancelled with the guest”).

## Cancellation vs escrow

`cancellationTerms` are **not** encoded in `BookingEscrow`. Current **Book & pay** is fund + settle in one tx, so there is **no clawback**. Honouring written terms is social: cancel frees nights; any money return is **Send STRK or DAI** in Messages.

Legacy on-chain `refund_booking` only applies if a booking never settled (`funded`). The web UI does not offer that after immediate settle.

## Visibility

```
Host ──always──► own places
Friend of host ──► can view + share
Everyone else ──► 404 (place unavailable)
```

`GET /my-listings` powers `/my-listings` and Home **My places**: both subtitles **Priced in DAI. Book & pay STRK or DAI** (not “Guests Book & pay”), and connector %. Empty states tell hosts they **haven’t published a place yet** — **share a place invite and earn** (not “introduce guests”). **List your place** goes to `/listings/new` (submit **Publish this place**; validation: **Open at least one night to Book & pay**; default DAI: **Enter a valid DAI list price / night**; default DAI price is used when you open those nights). Home **Places from friends to Book & pay** (not “Places from my friends”) empty: no places from friends yet. **Place invites to Book & pay** (not “Shared with me”) subtitle: **Last place invite wins connector attribution**; empty: **No place invites yet**. Home **My places** / `/my-listings` subtitle: **share a place invite and earn**. Home **My stays**: recent Book & pay stays; empty **wait after a place invite** (not “wait for a guest”). Home **Friends to Book & pay** (not “My friends”). Home loaders: **Loading places to Book & pay…**.

## Home globe

`/home` plots accessible places on a cobe globe (`listings-globe.tsx`). Pins need `locationLat` / `locationLng`. Colors: **yours** (orange), **friends** (dark), **invite** (taupe). Pin/legend labels: **Yours** / **Friend** / **Place invite** (not “Invite”); legend row **Friend places** (not “Friends”). Controls: **Zoom places in** / **Zoom places out** / **Reset globe of places** (not “Zoom in” / “Reset view”). Cluster counts: **N places here**. Pin aria: **View place: {title}** (not “Open {title}”); cluster aria: **N places to Book & pay**. Aria: **Interactive globe of places you can Book & pay**. Cluster hover: **Tap to choose a place to Book & pay**. Cluster menu: **Choose a place to Book & pay**. Empty: **places need a map pin** — add friends by **Ready X wallet** or **publish a place** to **Book & pay**. Tap a pin to **View place**.

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/my-listings` | Yes | Create place (map pin + photos required). Fail: **Could not publish this place** |
| GET | `/my-listings` | Yes | Host's own places |
| DELETE | `/my-listings/:id` | Yes | Host delete when no active Book & pay stays remain |
| GET | `/my-network/listings` | Yes | Friends' places |
| GET | `/friends/:id` | Yes | One friend’s places (must be friends) |
| GET | `/shared-listings` | Yes | Places shared with user via introductions |
| GET | `/listings/:id` | Yes | Detail (if authorized). Guest heading **Open nights to Book & pay** (host matches; not “Open nights guests can Book & pay”). Guest CTA is **Book & pay**. Unauthorized / API 404: **This place isn’t available to Book & pay.** (not “Listing unavailable.”). The page surfaces that API error. Loading: **Loading place to Book & pay…**. Detail **DAI list price** (not “Default list price”). Friend + % > 0: **Share place invite & earn**. Host/0% share: **Share this place**. Busy **Creating place invite…**; fail **Could not share this place**. Host badge **Your place** / **Publishes this place** (not “Host”). Delete: **Delete this place** (busy **Deleting this place…**; fail **Could not delete this place**). Host nights busy **Saving open nights…** (fail **Could not save open nights**; success **Open nights saved — friends can Book & pay.**). Copy: **Copy place invite** (busy success **Place invite copied**, not “Copied!”); status **Place invite copied** / **Place invite shared**. Host share helper: **You published this place** — **this place invite has no connector** (not “You shared as the host” / “this link”); connector helper: friends with **who publishes this place** and Book & pay (not “the host”); friends become connectors on their own **place invites** |
| POST | `/listings/:id/share` | Yes | Generate place invite (friend → connector). Unauthorized: **You can’t share this place** |
| GET | `/connector/earnings` | Yes | Your connector reward history |

## Related

- [connectors.md](./connectors.md) — share friends’ places and earn
- [invitations.md](./invitations.md)
- [bookings.md](./bookings.md)
