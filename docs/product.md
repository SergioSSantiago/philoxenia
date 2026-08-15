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
- **Trustless settlement** — escrow on Starknet; protocol earns **only** 10% of connector rewards (0% on direct bookings)
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
6. On settlement: Host 712.5 STRK, Connector 33.75 STRK, Philoxenia 3.75 STRK.

## Fee model

| Party | Fee |
|-------|-----|
| Direct host↔guest (no connector) | **0%** protocol |
| Connector | Host-configured **% of booking total** (0–100%) |
| Philoxenia | **10% of the connector reward** (not of the booking total) |
| Host | Remainder after connector reward |

Example with connector (750 STRK total, 5% connector reward):

| Party | Amount |
|-------|--------|
| Guest pays | 750 |
| Host | 712.5 |
| Connector (net) | 33.75 |
| Philoxenia | 3.75 |

Example without connector: host receives 750; Philoxenia 0.

UI always shows **percentages**. On-chain storage uses basis points internally (100 bps = 1%).

## MVP scope

**Implemented (off-chain + UI):**

- Wallet authentication (Ready X extension on desktop, SNIP-12) — **not smartphone**
- Friend requests and friendships (search by wallet address)
- Profile: display name + STRK/DAI balances
- Private listings (host + friends visibility)
- Share links and invite resolution
- Booking creation with date validation and connector attribution
- Payment initiation (public ERC20 or STRK20 when wallet supports it)
- Settle (guest) and refund (host) via Ready X + API confirmation

**Requires further integration:**

- Full STRK20 escrow path

**On-chain (mainnet):** `BookingEscrow` at `0x071472045bd45e232bb0542f8f6f9a9af42947e15e57575cd7b55650ac9001bd` — see [deploy-escrow.md](./deploy-escrow.md).

**Fee model:** optional connector; Philoxenia takes **10% of the connector reward**; direct bookings **0%**.

## Related docs

- [brand.md](./brand.md)
- [social-graph.md](./social-graph.md)
- [listings.md](./listings.md)
- [invitations.md](./invitations.md)
- [bookings.md](./bookings.md)
- [payments.md](./payments.md)
