<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Product

Philoxenia is private peer-to-peer hospitality on Starknet.

**Tagline:** Trust who you trust. Pay trustless.

The header lockup (name + sleeping-head cameo) always opens `/`. See [brand.md](./brand.md).

<p style="border:2px solid #b91c1c; background:#fef2f2; color:#991b1b; padding:14px 16px; border-radius:10px; line-height:1.55;">
<strong style="color:#7f1d1d;">⚠ Required: Ready X setup (read this first)</strong><br/><br/>
<strong>Chrome or Brave</strong> + <strong>Ready X</strong> extension, with <strong>Smart Wallet</strong> and <strong>Private</strong> turned on in the wallet settings — <em>or</em> open Philoxenia in the <strong>Ready X in-app browser</strong>.<br/><br/>
<strong>Firefox:</strong> Ready X is <strong>not available</strong>. Only the old Ready Wallet appears, and it <strong>does not support private payments</strong> (no wallet API ≥ 0.10). Do not use Firefox for Philoxenia privacy flows.
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

1. Install **Ready X** from [ready.co](https://www.ready.co/) in **Chrome** or **Brave** (not Firefox).
2. In Ready X, enable **Smart Wallet** and **Private**.
3. Open https://philoxenia-iota.vercel.app → Connect Ready → Sign in (approve SNIP-12).
4. Optional alternate: open the same URL inside the **Ready X in-app browser**.

Braavos is not offered. There is no `/auth` page — Connect is a modal on `/home`. Display name is optional; friends add you by **wallet address only**.

### Firefox — no Ready X

Firefox does **not** list the Ready X extension. Users only see the **legacy Ready Wallet** (formerly Argent). That build typically **cannot**:

- expose wallet API ≥ 0.10  
- run Private booking pay / shield / unshield  

Public ERC-20 may still work if the old extension connects — but **private Philoxenia requires Chrome/Brave + Ready X** (or Ready X in-app).

### External mobile Safari / Chrome — blocked

Opening Philoxenia in the phone’s system browser and deep-linking out to Ready is **not** reliable for the login signature. Prefer the **Ready X in-app browser**.

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
