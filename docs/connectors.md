<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Connectors

**Connectors are how Philoxenia grows — and the best way to start using the app.** Hosts list privately; guests book privately; connectors bridge the gap — introducing trusted people to trusted places and **earning when a stay settles**.

You do not need to host a place to participate. Open **Earnings**, share a friend’s listing, get paid on settle.

Without connectors, the network stays closed among existing friends. With connectors, hospitality spreads one introduction at a time, and the introducer is paid on-chain.

Roles overview (Host · Guest · Connector): **[roles.md](./roles.md)**

## Why be a connector

| You | Get |
|-----|-----|
| Share a friend’s listing with someone you trust | A **host-set % of the booking total** when they Book & pay through your invite |
| Paid on settle | Funds go **straight to your Ready X wallet** (same asset the guest paid: STRK or DAI) |
| No inventory, no hosting | You don’t list a place — you introduce guests |
| Aligned with the protocol | Philoxenia only earns **10% of your connector reward** (not of the whole stay). Direct bookings stay **0%** protocol |

**Example:** guest pays **1,000 DAI**, host set **5%** connector → you receive **45 DAI**, protocol **5 DAI**, host **950 DAI**.

Hosts who set a healthy connector % make their friends want to share. Connectors who share make hosts get filled nights. Guests get a warm introduction instead of a cold marketplace.

## How it works (user path)

1. **Be friends** with a host who listed a place (and set `connectorRewardPercent` > 0).
2. Open **Earnings** (`/connector`), that friend’s profile (`/friends/[id]`), or the listing itself.
3. Tap **Share invite & earn** — creates an opaque `/invite/{token}` link with **you** as connector. The button shows **Copied!** when the clipboard succeeds.
4. Send the link (WhatsApp, Messages, etc.). Do **not** send your wallet as the invite.
5. Guest opens the link → attribution is saved (last link wins). They become friends with the host if needed, then Book & pay.
6. On settle, your reward hits your Ready X wallet **in the same asset the guest paid** (STRK or DAI). Track totals on `/connector`.

```
Friend of host ──share──► invite link (connector = you)
                              │
Guest opens link ──► share_introduction (last-touch)
                              │
Guest books + pays ──► escrow settles ──► you + host + (10% of your reward → protocol)
```

## Where to share in the app

| Surface | What you do |
|---------|-------------|
| **`/connector` (Earnings)** | Explains the model, lists **friends’ listings** with your earn %, one-tap share, reward history. Native share text: Book & pay STRK or DAI. Reward rows open `/bookings/:id` |
| **`/friends/[id]`** | Friend’s listings + share; open from name or wallet on Friends / Messages |
| **`/friends`** | Tap friend’s **name** or **wallet** → their listings |
| **`/messages`**, **`/messages/[friendId]`** | Same: name / wallet → listings; preview / › → chat |
| **`/listings/[id]`** | Friend + % > 0 → **Share invite & earn**; host → Share listing (no connector). Cards elsewhere show the % next to DAI price |

Header nav width stays consistent across pages (`max-w-6xl`); only page content uses the narrow/wide shell.

## Host tip — set a reward people will share

When creating a listing, pick a connector % that makes introductions worthwhile (often **3–10%**). At **0%**, friends can still share for discovery, but they earn nothing — `/connector` calls that out.

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/connector/earnings` | Yes | Total earned + bookings where you were connector |
| GET | `/my-network/listings` | Yes | All friends’ listings (share candidates) |
| GET | `/friends/:id` | Yes | Friend profile + that friend’s listings (must be friends) |
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
