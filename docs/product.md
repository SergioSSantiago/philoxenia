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

**Ideal client: Ready X in-app browser.** Open Philoxenia inside the browser that **Ready X** ships with the wallet app. That is the supported path for connect, SNIP-12 login, and **STRK20 private payments** (wallet API ≥ 0.10).

- Braavos is not offered.
- There is no `/auth` page. Connect is a modal on `/home`.
- Disconnect returns to `/home` and shows the same modal.
- Display name is optional at sign-in and editable later in `/profile`. Friends add you by **wallet address only**.

### Desktop browsers & Firefox — legacy Ready only

On **Firefox** and typical **desktop browser tabs** (Chrome/Brave/Safari outside Ready X), you usually only get the **older Ready Wallet extension** (formerly Argent). That build often **does not expose wallet API ≥ 0.10**, so **Private / shield / unshield are unavailable**. You can still use Philoxenia with **Public ERC-20** pay if the extension connects for signing — but privacy payments require Ready X’s in-app browser (or a Ready build that reports API ≥ 0.10).

### External mobile Safari / Chrome — blocked

Opening Philoxenia in the phone’s system browser and deep-linking out to Ready is **not** reliable: WalletConnect may connect, but the login signature approve sheet often never appears. Prefer the **Ready X in-app browser**, not Safari/Chrome → Ready.

## Roles

| Role | Description |
|------|-------------|
| **Host** | Creates listings; receives accommodation payment on settlement |
| **Guest** | Books and funds stays; must be friends with the host (or become friends after an invite) |
| **Connector** | A friend who shares a listing; earns a configurable % of the booking total |

## Core flow (acceptance scenario)

1. Bob lists an apartment in Florence (**DAI**/night, 5% connector reward) and opens nights on the calendar.
2. Alice (Bob's friend) shares the listing with Carlos via invite link.
3. Carlos creates an account, requests friendship with Bob, Bob accepts.
4. Carlos selects nights (need not be consecutive) and pays in **STRK** (live FX) or **DAI** (1:1).
5. Pay = fund + settle in one tx → host (+ connector) receive immediately; booking is `completed`.
6. Cancel is social (Messages + voluntary peer return); nights are freed when marked cancelled.

## Fee model

| Party | Fee |
|-------|------|
| Direct host↔guest (no connector) | **0%** protocol |
| Connector | Host-configured **% of booking total** (0–100%) |
| Philoxenia | **10% of the connector reward** (not of the booking total) |
| Host | Remainder after connector reward |

Example with connector (750 total, 5% connector reward) — amounts in the asset the guest paid:

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

- Wallet authentication via **Ready X in-app browser** (SNIP-12) — ideal path for privacy pay
- Friend requests and friendships (search by wallet address)
- Profile: display name + STRK/DAI balances
- Private listings (host + friends visibility)
- Share links and invite resolution
- Booking creation with date validation and connector attribution
- Payment initiation: **Private** (STRK20 anonymizer, default when wallet API ≥ 0.10) or **Public** ERC-20
- Settle is atomic with pay (host + connector paid immediately)
- Shield / unshield on Profile (Ready X / wallet API ≥ 0.10 — not legacy Firefox Ready)

**On-chain (mainnet):** `BookingEscrow` + `BookingEscrowAnonymizer` — see [deploy-escrow.md](./deploy-escrow.md) and [booking-escrow-anonymizer.md](./booking-escrow-anonymizer.md).

**Fee model:** optional connector; Philoxenia takes **10% of the connector reward**; direct bookings **0%**.

## Related docs

- [brand.md](./brand.md)
- [social-graph.md](./social-graph.md)
- [listings.md](./listings.md)
- [invitations.md](./invitations.md)
- [bookings.md](./bookings.md)
- [payments.md](./payments.md)
- [privacy.md](./privacy.md)
- [strk20.md](./strk20.md)
