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
<strong>iPhone:</strong> install <a href="https://apps.apple.com/us/app/ready-x/id6744935604">Ready X</a>. Safari can <strong>Connect</strong> via WalletConnect redirect into Ready X (StarknetKit mobile system browser mode). For <strong>Private Book & pay</strong>, prefer opening Philoxenia in the <strong>Ready X in-app browser</strong>.<br/><br/>
<strong>Firefox:</strong> Ready X is <strong>not available</strong>. Only the old Ready Wallet appears — <strong>no Private Book & pay</strong>.
</p>

## Problem

Traditional home-sharing platforms are public marketplaces with platform fees and broad data exposure. Philoxenia targets hosts and guests who already trust each other — or are one introduction away — and want trustless settlement without a public directory of places.

## What Philoxenia is

- A **social trust network** for private stays
- **Friend-based discovery** — see places from friends, not strangers
- **Connectors (key growth loop)** — friends introduce guests to host places and **earn a % when the stay settles**; this is how the private network expands without a public marketplace
- **Trustless settlement** — escrow on Starknet; protocol earns **only** 10% of connector rewards (0% on direct **Book & pay**)
- **Payment privacy** — STRK20 for STRK and DAI when Ready X has Smart Wallet + Private enabled (**Private Book & pay**)
- **Sealed chat + peer pay** — E2E messages between friends; public or private peer transfers
- **STRK ↔ DAI swap** — public AVNU swap on Ready X (and from Home)

## What Philoxenia is not

- Not Airbnb on blockchain
- No public marketplace, followers, or open search
- No protocol token or NFTs
- No custodial wallets or internal balances

## Why connectors matter

Philoxenia has no public directory of places. **Growth is introductions.** A connector is a friend of the host who shares a place invite with someone they trust. When they Book & pay through the invite, the connector is paid on settle.

That loop is the product: hosts fill nights, connectors earn for good intros, guests arrive with a social vouch — and Philoxenia only takes a cut of the connector reward (never of direct host↔guest stays).

See the full guide: **[connectors.md](./connectors.md)** — Earnings UI, friend profiles, share surfaces, and fee examples.

## How you sign in

### What you must do (checklist)

1. **Desktop:** Install **Ready X** from [ready.co](https://www.ready.co/) in **Chrome** (not Firefox). Enable **Smart Wallet** and **Private**.
2. **iPhone:** Install **[Ready X](https://apps.apple.com/us/app/ready-x/id6744935604)** (not the older Ready / Crypto Card app). In Safari tap **Connect Ready X** (opens Ready X via `ready://` WalletConnect). For **Private Book & pay**, open the same URL in the **Ready X in-app browser**.
3. Connect Ready X → **Approve in Ready X** (SNIP-12). On mobile Safari this is two steps: Connect, then Approve in Ready X (second open of Ready X).

Braavos is not offered. There is no `/auth` page — Connect is a modal on `/home` (`ReadyWalletNotice` compact in the modal; full notice on the landing — **Private Book & pay** in the Ready X in-app browser). Unsigned `/home` heading: **Book & pay with people you trust**. The StarknetKit picker labels the injected wallet **Ready X** (connector id remains `argentX`). Display name is optional; friends add you by **Ready X wallet** only. Auth label **Display name (friends add you by Ready X wallet)** (not “Display name (optional)”). Name field placeholder **Display name**. Connect busy state is **Connecting Ready X…**. iPhone modal: **Copy Philoxenia link for Ready X**. Invalid address: **Invalid Ready X wallet address**. Sign-in fail: **Invalid Ready X signature. Connect Ready X again.** Expired challenge: **Sign-in expired. Connect Ready X again.** Missing JWT: **Connect Ready X to continue.** Missing/expired `/invite/:token`: **This place invite isn’t available to Book & pay.** Missing stay: **This stay isn’t available to Book & pay.**

Wallet wiring follows [StarknetKit Ready connector](https://www.starknetkit.com/docs/latest/connectors/ready) modes (desktop QR / mobile redirect / in-app). npm `starknetkit@3.4.3` still exports `ArgentMobileConnector` (docs rename: `ReadyConnector`); Philoxenia patches mainnet deep links to `ready://` because stock maps `SN_MAIN` → `argent://` (legacy).

### Firefox — no Ready X

Firefox does **not** list the Ready X extension. Users only see the **legacy Ready Wallet** (formerly Argent). That build typically **cannot** expose wallet API ≥ 0.10 or run **Private Book & pay** / shield / unshield. Use **Chrome + Ready X** (desktop) or the Ready X app browser (iPhone).

### iPhone — Safari vs in-app

| Path | Login | Private Book & pay |
|------|--------|----------------|
| Safari → Connect → Ready X (`ready://`) | Supported (WC redirect) | Unreliable — needs wallet API ≥ 0.10 |
| Ready X in-app browser | Supported (injected) | Supported when Smart Wallet + Private on |

## Roles

Philoxenia has three roles — **Host**, **Guest**, and **Connector**. One wallet can be all three. **Connector is the growth engine:** without introductions there is no public directory to fill stays.

| Role | Description |
|------|-------------|
| **Host** | Creates places; sets connector %; receives accommodation payment on settlement |
| **Guest** | Books and funds stays; must be friends with the host (or become friends after a **place invite**) |
| **Connector** | **Earn as a connector** — a friend who shares a place invite; earns the **connector % set on the place** (not a “host-set %”), paid to their Ready X wallet on settle |

**Be a connector:** open **Earnings** (`/connector`), share a friend’s place, earn when they Book & pay. No need to host. Details: **[roles.md](./roles.md)** · **[connectors.md](./connectors.md)**

One person can be host on their places, guest on friends’ places, and connector when they introduce others.

## Core flow (acceptance scenario)

1. Bob lists an apartment in Florence (**DAI**/night, **5% connector reward**) and opens nights on the calendar.
2. Alice (Bob's friend) opens **Earnings** or Bob’s friend profile, taps **Share place invite & earn**, and sends the place invite to Carlos.
3. Carlos creates an account, requests friendship with Bob, Bob accepts.
4. Carlos selects nights (need not be consecutive) and **Book & pay** in **STRK** (live FX) or **DAI** (1:1).
5. **Book & pay** is fund + settle in one tx → host (+ connector) receive immediately; booking is `completed`. Alice sees the reward under `/connector`.
6. Cancel is social (Messages + voluntary peer return); nights are freed when marked cancelled.

## Fee model

| Party | Fee |
|-------|------|
| Direct **Book & pay** (no connector) | **0%** protocol |
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

- Wallet authentication via Ready X (SNIP-12): Chrome extension, iPhone Safari WalletConnect, or **in-app browser** (ideal for Private Book & pay)
- Friend requests and friendships (search by **Ready X wallet** address)
- Friend profile (`/friends/[id]`): places + share-as-connector; name/wallet links from Friends & Messages
- **Earnings (`/connector`)**: how connectors earn, shareable friend places, reward history
- **Ready X** (page title, not “Profile”): display name (label **Display name (friends add you by Ready X wallet)**, not “Name shown to others”; helper **Friends add you by Ready X wallet — display names are not searchable**, not “Change it anytime”; CTA **Save display name**; busy **Saving display name…**; done **Display name saved**, not “Saved!”), public STRK/DAI balances, shield/unshield **STRK or DAI**, **AVNU STRK ↔ DAI swap**. Subtitle: friends add you by **Ready X wallet**.
- Private places (host + friends visibility)
- Share links and invite resolution
- Booking creation with date validation and connector attribution → **Book & pay** stays
- Payment initiation: **Private** (STRK20 anonymizer, default when wallet API ≥ 0.10) or **Public Book & pay**
- Settle is atomic with pay (host + connector paid immediately)
- Sealed E2E chat + peer transfers (public or private STRK)
- On-chain verify before booking confirm; rate limits + audit logs

**On-chain (mainnet):** `BookingEscrow` + `BookingEscrowAnonymizer` — see [deploy-escrow.md](./deploy-escrow.md) and [booking-escrow-anonymizer.md](./booking-escrow-anonymizer.md).

**Fee model:** optional connector; Philoxenia takes **10% of the connector reward**; direct bookings **0%**.

## Related docs

- [brand.md](./brand.md)
- [roles.md](./roles.md) — **Host · Guest · Connector (start with connector)**
- [connectors.md](./connectors.md) — **earn as a connector (key loop)**
- [social-graph.md](./social-graph.md)
- [listings.md](./listings.md)
- [invitations.md](./invitations.md)
- [bookings.md](./bookings.md)
- [messages.md](./messages.md)
- [payments.md](./payments.md)
- [privacy.md](./privacy.md)
- [strk20.md](./strk20.md)
