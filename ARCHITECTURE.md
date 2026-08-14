# Architecture

Philoxenia is a private peer-to-peer hospitality protocol on Starknet. It is **not** a public marketplace.

## System overview

```
┌─────────────────┐     JWT REST      ┌─────────────────┐     SQL      ┌────────────┐
│  Next.js (web)  │ ────────────────► │  Fastify (api)  │ ───────────► │ PostgreSQL │
└────────┬────────┘                   └─────────────────┘              └────────────┘
         │
         │ wallet (starknet-react / starknet.js)
         ▼
┌─────────────────┐
│ Starknet wallet │ ──► BookingEscrow + ERC20 / STRK20 (where supported)
└─────────────────┘
```

| Layer | Responsibility |
|-------|----------------|
| **Web** (`apps/web`) | Auth UI, social graph, listings, invitations, bookings, wallet payments |
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
- **Settlement trust** — Escrow holds guest funds until settlement or refund; the protocol takes 0% commission.
- **Connector rewards** — Configured per listing (0–100%); paid from the guest total on settlement.

## MVP implementation status

| Component | Status |
|-----------|--------|
| Wallet auth (Starknet signed message) | Implemented |
| Friends, listings, shares, bookings API | Implemented |
| `BookingEscrow` Cairo contract + unit tests | Implemented |
| Public ERC20 payment path (approve + `fund_booking`) | Implemented in web |
| STRK20 wallet API detection + fallback | Implemented in web |
| Contract deployment scripts | Not included — manual deploy required |
| On-chain `create_booking` before funding | Contract only — **not wired** to API/web |
| Settle / refund flows in UI or API | Contract only — **not wired** |
| Full STRK20 ↔ escrow integration | Partial — see [PRIVACY.md](./PRIVACY.md) and [docs/strk20.md](./docs/strk20.md) |

## Key design constraints

- No public listing directory or search index.
- No protocol token, NFTs, or internal custodial balances.
- No protocol fee (host + connector split only).
- Authorization enforced server-side; the API returns 404 for unauthorized resources rather than revealing their existence.

## Further reading

- [docs/architecture.md](./docs/architecture.md) — detailed component breakdown
- [docs/smart-contracts.md](./docs/smart-contracts.md) — escrow interface and lifecycle
- [docs/product.md](./docs/product.md) — user-facing flows
