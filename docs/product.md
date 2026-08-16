<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Product

Philoxenia is private peer-to-peer hospitality on Starknet.

**Tagline:** Trust who you trust. Pay trustless.

The header lockup (name + sleeping-head cameo) always opens `/`. See [brand.md](./brand.md).

<p style="border:2px solid #b91c1c; background:#fef2f2; color:#991b1b; padding:14px 16px; border-radius:10px; line-height:1.55;">
<strong style="color:#7f1d1d;">⚠ Required: Ready X setup (read this first)</strong><br/><br/>
<strong>Desktop:</strong> <strong>Chrome</strong> + <strong>Ready X</strong> extension, with <strong>Smart Wallet</strong> and <strong>Private</strong> turned on.<br/><br/>
<strong>iPhone:</strong> open Philoxenia in the <strong>Ready X wallet app browser</strong>. Safari / iOS Chrome will <strong>not</strong> work for login or private pay.<br/><br/>
<strong>Firefox:</strong> Ready X is <strong>not available</strong>. Only the old Ready Wallet appears — <strong>no private payments</strong>.
</p>

## Problem

Traditional home-sharing platforms are public marketplaces with platform fees and broad data exposure. Philoxenia targets hosts and guests who already trust each other — or are one introduction away — and want trustless settlement without a public listing directory.

## What Philoxenia is

- A **social trust network** for private stays
- **Friend-based discovery** — see listings from friends, not strangers
- **Connector introductions** — friends share listings with people outside the network
- **Trustless settlement** — escrow on Starknet; protocol earns **only** 10% of connector rewards (0% on direct bookings)
- **Payment privacy** — STRK20 when Ready X has Smart Wallet + Private enabled

## What Philoxenia is not

- Not Airbnb on blockchain
- No public marketplace, followers, or open search
- No protocol token or NFTs
- No custodial wallets or internal balances

## How you sign in

### What you must do (checklist)

1. **Desktop:** Install **Ready X** from [ready.co](https://www.ready.co/) in **Chrome** (not Firefox). Enable **Smart Wallet** and **Private**.
2. **iPhone:** Open https://philoxenia-iota.vercel.app inside the **Ready X wallet app browser** — not Safari or Chrome on iOS.
3. Connect Ready → Sign in (approve SNIP-12).

Braavos is not offered. There is no `/auth` page — Connect is a modal on `/home`. Display name is optional; friends add you by **wallet address only**.

### Firefox — no Ready X

Firefox does **not** list the Ready X extension. Users only see the **legacy Ready Wallet** (formerly Argent). That build typically **cannot** expose wallet API ≥ 0.10 or run Private pay / shield / unshield. Use **Chrome + Ready X** (desktop) or the **Ready X app browser** (iPhone).

### iPhone Safari / system Chrome — blocked

On iPhone you **must** use the browser inside the **Ready X** wallet app. Opening Philoxenia in Safari (or Chrome) and deep-linking to Ready does **not** complete login or private pay reliably.

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
