<p align="center">
  <img src="apps/web/public/philoxenia-mark.png" alt="Philoxenia — a sleeping head resting on joined hands" width="96" height="96" />
</p>

# Philoxenia

**Trust who you trust. Pay trustless.**

**Author:** [Sergio Sapiña Santiago](https://github.com/SergioSSantiago) · Telegram [@sergiossantiago](https://t.me/sergiossantiago)

Built with [Cursor](https://cursor.com) AI-assisted development (disclosed, not hidden).

Philoxenia is a private peer-to-peer hospitality protocol on Starknet. It is **not** a public accommodation marketplace. Listings are visible only to hosts, their friends, and guests introduced through a valid share flow.

The brand mark is a cameo of a sleeping head on joined hands — rest, trust, hospitality. It sits next to the name in the app header and links to `/`. See [docs/brand.md](./docs/brand.md).

## What it is

- A social trust network for private hospitality
- Friend-based discovery (no public listing directory)
- Trustless settlement via Cairo escrow (optional connector; Philoxenia takes **10% of the connector reward**, **0%** on direct bookings)
- STRK20 private payments where wallet support exists
- Ready X for wallet connect on **desktop** (browser extension)

## What it is not

- Not Airbnb on blockchain
- No public marketplace, followers, NFTs, or protocol token
- No custodial wallets or internal balances
- No Braavos or other wallet connectors

## Architecture

```
Frontend (Next.js) → Backend (Fastify) → PostgreSQL
Frontend (Next.js) → Ready X → BookingEscrow + ERC20/STRK20
```

Off-chain: friendships, listings, invitations, booking metadata
On-chain: payment escrow and settlement only

See [ARCHITECTURE.md](./ARCHITECTURE.md) for details.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS |
| Backend | Fastify, Drizzle ORM, PostgreSQL |
| Contracts | Cairo 2.12, Scarb, Starknet Foundry |
| Wallet | Ready X via `@starknet-react/core`, `starknetkit`, starknet.js v8 |
| Privacy | STRK20 via Starknet Wallet API |

## Quick start

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)
- Scarb 2.12+ and Starknet Foundry (for contracts)
- [Ready X](https://www.ready.co/) browser extension (desktop)

## Deploy (production — Vercel)

**Production on Vercel + GitHub — not localhost.**

| App | URL |
|-----|-----|
| Web | https://philoxenia-iota.vercel.app |
| API | https://philoxenia-api.vercel.app |

### Smart contract (Starknet mainnet)

| | |
|--|--|
| **BookingEscrow** | [`0x071472045bd45e232bb0542f8f6f9a9af42947e15e57575cd7b55650ac9001bd`](https://voyager.online/contract/0x071472045bd45e232bb0542f8f6f9a9af42947e15e57575cd7b55650ac9001bd) |
| Network | Starknet **mainnet** |
| Token | STRK |
| Owner / protocol treasury | `0x04746642f27C03a5d3706205E8d6fbFEd30d18Ed6bE45584BB2df5a65388E878` |
| Protocol fee | **10% of connector reward** (0% if no connector) |

Details: [docs/deploy-escrow.md](./docs/deploy-escrow.md) · [docs/smart-contracts.md](./docs/smart-contracts.md)

Repo: https://github.com/SergioSSantiago/philoxenia · Vercel guide: [docs/deployment-vercel.md](./docs/deployment-vercel.md)

### Install (optional local development)

```bash
git clone https://github.com/SergioSSantiago/philoxenia
cd philoxenia
npm install
```

Paste `ALCHEMY_API_KEY` into `.env` (repo root) and into the Vercel dashboard (web **and** api projects).

### Database (production)

Neon Postgres via Vercel Integration — see [docs/deployment-vercel.md](./docs/deployment-vercel.md).

### Database (optional local)

```bash
docker compose up -d
npm run db:migrate -w @philoxenia/api
```

### Development

```bash
npm run dev          # API :4000 + Web :3000
npm run dev:api
npm run dev:web
```

### Tests

```bash
npm test                              # API unit tests
npm run test:contracts                # Cairo tests
npm run typecheck
```

### Contracts

```bash
cd contracts
scarb build
scarb test
```

## Sign-in

There is no `/auth` page. The header brand goes to `/` (landing). Connect / disconnect opens a **Ready X** modal on `/home`.

**Supported today: desktop web with the Ready X browser extension.** Friends find each other by **wallet address only**. Display names are editable in Profile and are not searchable.

### Known limitation — smartphone blocked

**Phone / mobile Safari (and Chrome on Android) login does not work reliably.** After WalletConnect opens Ready, the second step — the SNIP-12 login signature — often never shows an approve sheet in the wallet (Ready X vs Ready Mobile deep-link mismatch, and iOS blocking programmatic re-open of the app). Until that is fixed upstream or with a supported Ready mobile path, **Philoxenia is desktop-only for sign-in and payments.** Do not treat smartphone as a supported client.

## Environment variables

See `.env` at the repo root (not committed). Paste your Alchemy key into `ALCHEMY_API_KEY` only — the mainnet RPC URL is built automatically.

Key variables:

- `DATABASE_URL` — PostgreSQL connection
- `JWT_SECRET` — API session signing
- `NEXT_PUBLIC_API_URL` — frontend → backend
- `NEXT_PUBLIC_STARKNET_CHAIN` — `mainnet` in production
- `NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS` — mainnet escrow (`0x071472045bd45e232bb0542f8f6f9a9af42947e15e57575cd7b55650ac9001bd`)
- `NEXT_PUBLIC_STRK20_PRIVACY` — enable STRK20 path (default true)

## Acceptance scenario

Bob lists an apartment in Florence (150 STRK/night, 5% connector reward).
Alice (Bob's friend) shares the listing with Carlos.
Carlos creates an account, requests friendship with Bob, Bob accepts.
Carlos books 5 nights (750 STRK total).
Settlement: Host 712.5 STRK, Connector 33.75 STRK, Philoxenia 3.75 STRK (10% of connector reward). Direct bookings (no connector): host gets 100%, protocol 0%.

## Documentation

- [docs/](./docs/) — full docs index
- [docs/deploy-escrow.md](./docs/deploy-escrow.md) — **BookingEscrow mainnet address**
- [docs/smart-contracts.md](./docs/smart-contracts.md) — escrow interface and fees
- [docs/brand.md](./docs/brand.md) — logo and header
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [PRIVACY.md](./PRIVACY.md)
- [SECURITY.md](./SECURITY.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)

## STRK20 Private Sprint

Registered for the [STRK20 Private Sprint](https://github.com/starkience/strk20-hackathon). Progress tracked in [`strk20.json`](./strk20.json).

- Mainnet pool: `0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a`
- Mainnet RPC: set `ALCHEMY_API_KEY` in `.env` — **never commit that file**
- STRK20 skill installed: `.agents/skills/strk20-privacy-integration/`

## License

MIT — see [LICENSE](./LICENSE)
