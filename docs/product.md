<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Product

Philoxenia is private peer-to-peer hospitality on Starknet.

**Tagline:** Trust who you trust. Pay trustless.

The header lockup (name + sleeping-head cameo) always opens `/`. See [brand.md](./brand.md).

## Problem

Traditional home-sharing platforms are public marketplaces with platform fees and broad data exposure. Philoxenia targets hosts and guests who already trust each other — or are one introduction away — and want trustless settlement without a public listing directory.

## What Philoxenia is

- A **social trust network** for private stays
- **Friend-based discovery** — see listings from friends, not strangers
- **Connector introductions** — friends share listings with people outside the network
- **Trustless settlement** — escrow on Starknet, 0% protocol fee
- **Optional payment privacy** — STRK20 where the guest wallet supports it

## What Philoxenia is not

- Not Airbnb on blockchain
- No public marketplace, followers, or open search
- No protocol token or NFTs
- No custodial wallets or internal balances

## How you sign in

- Wallet: **Ready X** browser extension on **desktop**. Braavos is not offered.
- There is no `/auth` page. Connect is a modal on `/home`.
- Disconnect returns to `/home` and shows the same modal.
- Display name is optional at sign-in and editable later in `/profile`. Friends add you by **wallet address only**.

### Smartphone — blocked

**Mobile is not a supported client right now.** Login with Ready on a phone is blocked: WalletConnect may open the app for “connect”, but the follow-up **login signature** (`signMessage` / SNIP-12) often never surfaces an approve UI in Ready (deep-link / Ready X vs Ready Mobile mismatch; Safari often cannot re-open the wallet for the second request). Product work continues on **desktop web** until Ready provides a reliable mobile approve path for dapp sign-in.

## Roles

| Role | Description |
|------|-------------|
| **Host** | Creates listings; receives accommodation payment on settlement |
| **Guest** | Books and funds stays; must be friends with the host (or become friends after an invite) |
| **Connector** | A friend who shares a listing; earns a configurable % of the booking total |

## Core flow (acceptance scenario)

1. Bob lists an apartment in Florence (150 STRK/night, 5% connector reward).
2. Alice (Bob's friend) shares the listing with Carlos via invite link.
3. Carlos creates an account, requests friendship with Bob, Bob accepts.
4. Carlos books 5 nights (750 STRK total).
5. Carlos funds the booking via wallet.
6. On settlement: Host 712.5 STRK, Connector 37.5 STRK, Philoxenia 0 STRK.

## Fee model

| Party | Fee |
|-------|-----|
| Philoxenia protocol | **0%** |
| Connector | Host-configured (0–100% of booking total) |
| Host | Remainder after connector reward |

Example: 750 STRK total, 5% connector → 712.5 host + 37.5 connector.

## MVP scope

**Implemented (off-chain + UI):**

- Wallet authentication (Ready X extension on desktop, SNIP-12) — **not smartphone**
- Friend requests and friendships (search by wallet address)
- Profile: display name + STRK/DAI balances
- Private listings (host + friends visibility)
- Share links and invite resolution
- Booking creation with date validation and connector attribution
- Payment initiation (public ERC20 or STRK20 when wallet supports it)

**Requires deployment / further integration:**

- Deploy `BookingEscrow` and set `NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS`
- On-chain `create_booking` before funding
- Settle and refund flows
- Full STRK20 escrow path

## Related docs

- [brand.md](./brand.md)
- [social-graph.md](./social-graph.md)
- [listings.md](./listings.md)
- [invitations.md](./invitations.md)
- [bookings.md](./bookings.md)
- [payments.md](./payments.md)
