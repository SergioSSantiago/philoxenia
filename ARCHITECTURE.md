<p align="center">
  <img src="apps/web/public/philoxenia-mark.png" alt="Philoxenia" width="72" height="72" />
</p>

# Architecture

Philoxenia is a private peer-to-peer hospitality protocol on Starknet. It is **not** a public marketplace.

The brand mark (sleeping head on joined hands) sits in the header and always goes to `/`. Sign-in is a Ready X modal on `/home`, not a dedicated auth page.

**Ideal client:** Chrome + **Ready X** with **Smart Wallet** and **Private** (desktop), or the **Ready X app browser** on **iPhone** (not Safari). **Firefox has no Ready X**. See [docs/product.md](./docs/product.md).

## System overview

```
┌─────────────────┐     JWT REST      ┌─────────────────┐     SQL      ┌────────────┐
│  Next.js (web)  │ ────────────────► │  Fastify (api)  │ ───────────► │ PostgreSQL │
└────────┬────────┘                   └─────────────────┘              └────────────┘
         │
         │ wallet (Ready X — starknet-react / starknetkit / starknet.js)
         ▼
┌─────────────────┐
│ Starknet wallet │ ──► BookingEscrow + ERC20 / STRK20 (where supported)
└─────────────────┘
```

| Layer | Responsibility |
|-------|----------------|
| **Web** (`apps/web`) | Landing, Ready X auth modal, social graph, listings, invitations, bookings, wallet payments |
| **API** (`apps/api`) | Off-chain state, authorization, JWT sessions |
| **Shared** (`packages/shared`) | TypeScript types shared by web and API |
| **Contracts** (`contracts/`) | On-chain escrow and settlement |
| **PostgreSQL** | Users, friendships, listings, shares, booking metadata, payment records |

## On-chain vs off-chain

| Data / action | Location |
|---------------|----------|
| Friendships, friend requests | Off-chain (PostgreSQL) |
| Listings, availability, photos | Off-chain |
| Share links and introductions | Off-chain |
| Booking dates, amounts, status | Off-chain |
| Payment tx hashes, privacy mode | Off-chain (mirrors wallet activity) |
| Escrow funding, settlement, refund | On-chain (`BookingEscrow`) |

Philoxenia does **not** put social relationships or listing content on-chain. Only payment escrow and settlement are trustless.

## Trust model

- **Social trust** — Users discover listings through friends or connector invitations, not a public directory.
- **Connectors (growth loop)** — Friends of hosts share invite links and earn a listing % on settle; Philoxenia’s protocol fee is only 10% of that connector reward. See [docs/connectors.md](./docs/connectors.md).
- **Settlement trust** — Escrow holds guest funds until settlement or refund; direct bookings have **0%** protocol fee.
- **Connector rewards** — Configured per listing (0–100%); paid from the guest total on settlement.

## Implementation status

| Component | Status |
|-----------|--------|
| Wallet auth via Ready X **in-app browser** | Shipped (ideal path) |
| Wallet auth on Firefox / desktop legacy Ready | Partial — Public pay may work; **no STRK20 privacy** without API ≥ 0.10 |
| Wallet auth via system mobile browser → Ready | **Blocked** — deep-link sign unreliable |
| Friends, listings, shares, bookings API | Shipped |
| Friend profile + connector share UI (`/friends/[id]`, `/connector`) | Shipped |
| Profile (display name) + wallet-only friend search | Shipped |
| AVNU public STRK ↔ DAI swap | Shipped (Profile / Home) |
| `BookingEscrow` + anonymizer (connector + 10% of connector reward) | **Live mainnet** — [docs/deploy-escrow.md](./docs/deploy-escrow.md) |
| Public ERC20 path (create + approve + fund + settle multicall) | Shipped |
| STRK20 shield / unshield / private balances (Ready ≥ 0.10) | Shipped |
| Private booking fund via anonymizer | Shipped — [PRIVACY.md](./PRIVACY.md), [docs/strk20.md](./docs/strk20.md) |
| `privacyMode` on payments / booking API/UI | Shipped |
| Sealed E2E chat + peer transfers | Shipped |

## Key design constraints

- No public listing directory or search index.
- No protocol token, NFTs, or internal custodial balances.
- Protocol fee only on connector rewards (10% of connector share); **0%** on direct bookings.
- Authorization enforced server-side; the API returns 404 for unauthorized resources rather than revealing their existence.

## Further reading

- [docs/brand.md](./docs/brand.md) — logo and header
- [docs/connectors.md](./docs/connectors.md) — earn as a connector
- [docs/architecture.md](./docs/architecture.md) — detailed component breakdown
- [docs/smart-contracts.md](./docs/smart-contracts.md) — escrow interface and lifecycle
- [docs/product.md](./docs/product.md) — user-facing flows
