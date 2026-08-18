<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Roles

Landing role cards (`/`): Host (connector % + 0% direct), Connector (STRK/DAI when they Book & pay, 10% of that reward), Guest (**Book & pay** STRK or DAI, Public or Private). **Start here** connector banner: when they **Book & pay**, you receive the host’s %.

| Role | What you do | How you get paid |
|------|-------------|------------------|
| **Host** | List a private place, open nights, set a connector % | Stay payment on settle (minus connector share) |
| **Guest** | Book & pay through friendship or an invite (STRK or DAI) | You pay for the stay; **Private Book & pay** when Ready X supports it |
| **Connector** | Share a friend’s place invite with someone you trust | **Host-set % of the booking** → your Ready X wallet on settle |

---

## Connector — start here (key growth loop)

Philoxenia has **no public marketplace**. The network grows only when someone introduces a guest to a host. That someone is the **connector** — and they get paid for it.

### Why you should be a connector

- **Earn without hosting** — no photos, no calendar, no guests in your home
- **Paid on-chain** — when the guest settles, your cut hits your Ready X wallet (STRK or DAI)
- **Aligned incentives** — hosts who set 3–10% give friends a reason to share; you fill their nights
- **Trust-native** — you only introduce people you actually know; guests arrive with a vouch, not a cold public listing
- **Protocol takes a thin cut of *your* reward only** — 10% of the connector share (never of direct host↔guest stays)

**Example:** guest pays **1,000 DAI**, host set **5%** connector → **you 45 DAI**, protocol 5 DAI, host 950 DAI.

### How to start earning (2 minutes)

1. Add friends who host (**Ready X wallet**).
2. Open **Earnings** in the nav (`/connector`) — see their places and your earn %.
3. Tap **Share place invite & earn** → the place invite is copied. Send it in chat / WhatsApp.
4. When they **Book & pay** through your place invite, track rewards on Earnings.

Or open a friend from **Friends** / **Messages** (tap name or **Ready X wallet**) → their places → share.

Full guide: **[connectors.md](./connectors.md)**

Hosts: set a connector % people will actually share. At **0%**, friends can still pass the place along, but they earn nothing.

---

## Host

- List a place (`/listings/new`): map pin, photos, open nights, DAI prices. Intro copy reminds hosts to set a connector % so friends can **share a place invite** and earn.
- Choose **`connectorRewardPercent`** (0–100%). Use **> 0** if you want friends motivated to bring guests.
- Friends see your place on Home / network; they can share a **place invite** (and become connectors).
- You receive the host amount on settle. Direct **Book & pay** (no connector) → you get **100%**, Philoxenia **0%**.

## Guest

- Must be friends with the host (or become friends after opening an invite).
- Select nights, pay **Public** ERC-20 or **Private** STRK20 (Ready X + Smart Wallet + Private).
- **Book & pay** = fund + settle; booking completes when the chain confirms.
- Cancel is social (Messages + voluntary peer return); nights free when marked cancelled — no automatic clawback.

## Role combinations (normal)

| Situation | Roles |
|-----------|--------|
| You list a flat | Host |
| You stay at a friend’s place | Guest |
| You send a friend’s place to a colleague | **Connector** |
| Your friend uses Book & pay on your place with no invite from a third party | Host + Guest only (0% protocol) |

---

## Related

- [connectors.md](./connectors.md) — earn as a connector
- [product.md](./product.md) — fee model & product overview
- [invitations.md](./invitations.md) — invite attribution
- [listings.md](./listings.md) — host places
- [bookings.md](./bookings.md) — guest pay flow
