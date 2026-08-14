# Philoxenia

**Trust who you trust. Pay trustless.**

**Author:** [Sergio Sapiña Santiago](https://github.com/SergioSSantiago) · Telegram [@sergiossantiago](https://t.me/sergiossantiago)

Built with [Cursor](https://cursor.com) AI-assisted development (disclosed, not hidden).

Philoxenia is a private peer-to-peer hospitality protocol on Starknet. It is **not** a public accommodation marketplace. Listings are visible only to hosts, their friends, and guests introduced through a valid share flow.

## What it is

- A social trust network for private hospitality
- Friend-based discovery (no public listing directory)
- Trustless settlement via Cairo smart contracts
- STRK20 private payments where wallet support exists
- 0% protocol commission

## What it is not

- Not Airbnb on blockchain
- No public marketplace, followers, NFTs, or protocol token
- No custodial wallets or internal balances

## Architecture

```
Frontend (Next.js) → Backend (Fastify) → PostgreSQL
Frontend (Next.js) → Starknet wallet → BookingEscrow + ERC20/STRK20
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
| Wallet | starknet-react, starknet.js |
| Privacy | STRK20 via Starknet Wallet API |

## Quick start

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)
- Scarb 2.12+ and Starknet Foundry (for contracts)

## Deploy (producción — Vercel)

**Producción en Vercel + GitHub — no localhost.**

| App | URL |
|-----|-----|
| Web | https://philoxenia-iota.vercel.app |
| API | https://philoxenia-api.vercel.app |

Repo: https://github.com/SergioSSantiago/philoxenia · Guía: [docs/deployment-vercel.md](./docs/deployment-vercel.md)

### Install (desarrollo local opcional)

```bash
git clone https://github.com/SergioSSantiago/philoxenia
cd philoxenia
npm install
```

Pega `ALCHEMY_API_KEY` en `.env` (raíz) y en el dashboard de Vercel (proyecto web).

### Database (producción)

Neon Postgres vía Vercel Integration — ver [docs/deployment-vercel.md](./docs/deployment-vercel.md).

### Database (local opcional)

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

## Environment variables

See `.env` at the repo root (not committed). Paste your Alchemy key into `ALCHEMY_API_KEY` only — the mainnet RPC URL is built automatically.

Key variables:

- `DATABASE_URL` — PostgreSQL connection
- `JWT_SECRET` — API session signing
- `NEXT_PUBLIC_API_URL` — frontend → backend
- `NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS` — deployed escrow
- `NEXT_PUBLIC_STRK20_PRIVACY` — enable STRK20 path (default true)

## Acceptance scenario

Bob lists an apartment in Florence (150 STRK/night, 5% connector reward).  
Alice (Bob's friend) shares the listing with Carlos.  
Carlos creates an account, requests friendship with Bob, Bob accepts.  
Carlos books 5 nights (750 STRK total).  
Settlement: Host 712.5 STRK, Connector 37.5 STRK, Philoxenia 0 STRK.

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [PRIVACY.md](./PRIVACY.md)
- [SECURITY.md](./SECURITY.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [docs/](./docs/)

## STRK20 Private Sprint

Registered for the [STRK20 Private Sprint](https://github.com/starkience/strk20-hackathon). Progress tracked in [`strk20.json`](./strk20.json).

- Mainnet pool: `0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a`
- Mainnet RPC: set `ALCHEMY_API_KEY` in `.env` — **never commit that file**
- STRK20 skill installed: `.agents/skills/strk20-privacy-integration/`

## License

MIT — see [LICENSE](./LICENSE)
