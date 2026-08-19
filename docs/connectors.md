<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Connectors

**Connectors are how Philoxenia grows — and the best way to start using the app.** Hosts publish places privately; friends Book & pay privately; connectors bridge the gap — **sharing a place invite** and **earning when a stay settles**.

You do not need to host a place to participate. Open **Earnings**, share a friend’s place, get paid on settle.

Without connectors, the network stays closed among existing friends. With connectors, hospitality spreads one introduction at a time, and the introducer is paid on-chain.

Roles overview (Host · Guest · Connector): **[roles.md](./roles.md)**

## Why be a connector

| You | Get |
|-----|-----|
| Share a friend’s place with someone you trust | A **host-set % of the booking total** when they Book & pay through your **place invite** |
| Paid on settle | Funds go **straight to your Ready X wallet** (same asset the guest paid: STRK or DAI) |
| No inventory, no hosting | You don’t publish a place — you introduce guests |
| Aligned with the protocol | Philoxenia only earns **10% of your connector reward** (not of the whole stay). Direct **Book & pay** stays **0%** protocol |

**Example:** guest pays **1,000 DAI**, host set **5%** connector → you receive **45 DAI**, protocol **5 DAI**, host **950 DAI**.

Hosts who set a healthy connector % make their friends want to share. Connectors who share make hosts get filled nights. Guests get a warm introduction instead of a cold marketplace.

## How it works (user path)

1. **Be friends** with a host who listed a place (and set `connectorRewardPercent` > 0).
2. Open **Earnings** (`/connector`), that friend’s profile (`/friends/[id]`), or the place itself.
3. Tap **Share place invite & earn** — creates an opaque `/invite/{token}` link with **you** as connector. The button shows **Place invite copied** when the clipboard succeeds (**Copy place invite**).
4. Send the link (WhatsApp, Messages, etc.). Do **not** send your wallet as the invite.
5. Guest opens the link → attribution is saved (last link wins). They become friends with the host if needed, then **Book & pay**. Earnings (`/connector`) step 3 is **They Book & pay**.
6. On settle, your reward hits your Ready X wallet **in the same asset the guest paid** (STRK or DAI). Track totals on `/connector`.

```
Friend of host ──share──► place invite (connector = you)
                              │
Guest opens link ──► share_introduction (last-touch)
                              │
Book & pay ──► escrow settles ──► you + host + (10% of your reward → protocol)
```

## Where to share in the app

| Surface | What you do |
|---------|-------------|
| **`/connector` (Earnings)** | Explains the model, lists **friends’ places** with your earn %, one-tap share, reward history. Native share text: **Book & pay stay at … — open this place invite (STRK or DAI)**. Reward rows open `/bookings/:id` (**open stay**; missing title **Book & pay stay**). Totals: asset shown **per stay**. Section **Share place invite & earn** (not “Share & earn”). Step 1: **Pick a friend’s place** — **Friends to Book & pay** (not “people you already trust”). Step 2: **Share your place invite** (not the Ready X wallet; **Opening the place invite** attributes you). How-to heading **How you earn when they Book & pay** (not “How you make money”). Intro **When you share a place invite** (not “introduce a guest”). Host line **Publishes this place: {name}** (not “Host {name}”). Earn line **You earn {n}% connector reward** if they Book & pay. Native share button **Share place invite…** (not “Share via…”). 0% list: **Also among friends to Book & pay (0% connector reward — a place invite won’t earn)** (not “Also in your network”). 0% empty: **Friends to Book & pay have places** (not “Your friends have places”). Empty places: add friends by **Ready X wallet** who **publish a place** (not “who host”) — **share a place invite and earn**. Empty CTA **Friends to Book & pay** (not “Add friends”). Empty rewards: share a friend’s **place** — they **Book & pay through your place invite**. 0% empty: set a % when they **publish a place** — you earn when they **Book & pay through your place invite**. Rewards heading: **Rewards from Book & pay** (not “Your rewards”). Rewards subtitle: paid to your **Ready X wallet** when they **Book & pay through your place invite**. Share place invite & earn subtitle: **Share your place invite** so they **Book & pay**. Loading: **Loading places to Book & pay…**. Rewards loading: **Loading rewards from Book & pay…** |
| **`/friends/[id]`** | Friend’s places + share; heading **Places to Book & pay**; intro **Places to Book & pay** (not “Places they host in your trust network”); **share a place invite** (not “share an invite”); CTA **Messages** (not Message) + **Earn as a connector** → `/connector`; empty: **open Messages**; **Share place invite & earn** (else **Share this place**); **View place**. Back **Back to Friends to Book & pay** (not “Back to friends”). `/friends` list CTA is also **Messages** (not Message). Loading: **Loading places to Book & pay…**. Not friends: **you must be friends to Book & pay their places**. Missing user: **they must Connect Ready X once**. Open from name or **Ready X wallet** on Friends / Messages. Opening your own profile errors: **Open your own places from Home or My places.** |
| **`/friends`** | Tap friend’s **name** or **wallet** → their places |
| **`/messages`**, **`/messages/[friendId]`** | Same: name / wallet → **places**; preview / › → chat |
| **`/listings/[id]`** | Friend + % > 0 → **Share place invite & earn**; host or 0% → **Share this place**. Busy: **Creating place invite…**. Native share: **Book & pay stay at … — open this place invite (STRK or DAI)**; button **Share place invite…**. Fail: **Could not share this place**. Copy status **Place invite copied** / **Place invite shared**. Cards elsewhere show the % next to DAI price. Loading: **Loading place to Book & pay…**. Host nights busy: **Saving open nights…** |

Header nav width stays consistent across pages (`max-w-6xl`); only page content uses the narrow/wide shell.

## Host tip — set a reward people will share

When listing a place, pick a connector % that makes introductions worthwhile (often **3–10%**). At **0%**, friends can still share for discovery, but they earn nothing — `/connector` says you earn when they **Book & pay** through your **place invite** once a % is set.

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/connector/earnings` | Yes | Total earned + bookings where you were connector |
| GET | `/my-network/listings` | Yes | All friends’ places (share candidates) |
| GET | `/friends/:id` | Yes | Friend profile + that friend’s places (must be friends) |
| POST | `/listings/:id/share` | Yes | Create invite; `hasConnector: true` when sharer ≠ host |

## Rules (unchanged)

- Host share → `connectorId = null` (no connector fee path).
- Friend share → sharer is connector; reward % from listing.
- Last invite the guest opened for that listing wins attribution.
- If the connector is no longer friends with the host at booking time → treated as no connector.
- Display names are cosmetic; **wallet** receives the payout.

## Related

- [product.md](./product.md) — fee model
- [invitations.md](./invitations.md) — invite mechanics
- [social-graph.md](./social-graph.md) — friendship gates
- [bookings.md](./bookings.md) — settle / pay
- [payments.md](./payments.md) — STRK / DAI / STRK20
