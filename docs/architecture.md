<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Architecture (detailed)

Component-level architecture for the Philoxenia monorepo.

The header brand (name + sleeping-head cameo) always links to `/`. See [brand.md](./brand.md).

## Monorepo layout

```
philoxenia/
├── apps/
│   ├── api/          # Fastify REST API
│   └── web/          # Next.js 15 frontend
├── packages/
│   └── shared/       # Shared TypeScript types
├── contracts/        # Cairo smart contracts
└── docs/             # Documentation
```

## API (`apps/api`)

- **Framework:** Fastify 5 with `@fastify/jwt` and `@fastify/cors`
- **ORM:** Drizzle with PostgreSQL
- **Auth:** Starknet typed-data signature verification via `starknet.js`
- **Routes:** Defined in `src/routes/index.ts`; business logic in `src/services/`

### Database schema (high level)

| Table | Purpose |
|-------|---------|
| `users` | Wallet address + display name |
| `friend_requests` | Pending/accepted/rejected requests |
| `friendships` | Bidirectional friend pairs (ordered UUID pair) |
| `listings` | Host listings with pricing and connector reward |
| `listing_availability` | Optional date ranges |
| `listing_shares` | Opaque invite tokens |
| `share_introductions` | Guest ↔ connector ↔ listing attribution |
| `bookings` | Stay metadata, amounts, status, tx hashes |
| `payments` | Payment records with privacy mode |
| `auth_nonces` | Wallet auth challenge nonces |

## Web (`apps/web`)

- **Framework:** Next.js 15 (App Router), React, Tailwind CSS
- **Wallet:** Ready X only on **desktop** (`@starknet-react/core` injected `argentX`). **Smartphone login is blocked** (Ready WalletConnect connect/sign deep-link does not complete reliably).
- **State:** React context for auth (`auth-context.tsx`); JWT in localStorage
- **API client:** `lib/api.ts` (Bearer JWT)
- **Brand:** `components/brand-lockup.tsx` → `/`

### Key pages

| Route | Purpose |
|-------|---------|
| `/` | Landing. Header brand links here |
| `/home` | App home. If signed out, Ready X connect modal |
| `/auth` | Legacy redirect to `/home` |
| `/profile` | Display name, STRK/DAI balances, disconnect |
| `/friends` | Friends; search by wallet address only |
| `/my-listings`, `/listings/new` | Host listing CRUD |
| `/listings/[id]` | Listing detail (authorized viewers) |
| `/invite/[token]` | Invitation landing |
| `/bookings`, `/bookings/new`, `/bookings/[id]` | Booking flow + payment |
| `/connector` | Connector earnings |

## Shared types (`packages/shared`)

Exports TypeScript interfaces used by both API responses and web components: `User`, `Listing`, `Booking`, `Payment`, `InviteResolution`, payment capability types, etc.

## Contracts (`contracts/`)

Single production contract: `BookingEscrow` (`src/booking_escrow.cairo`).

- Built with Scarb 2.12, OpenZeppelin ERC20
- Tested with Starknet Foundry (`contracts/tests/`)

## Data flow: booking + payment

```
Guest creates booking (API) ──► pending status in PostgreSQL
Guest clicks Pay (Web)      ──► wallet executes transfer
Guest confirms (API)        ──► POST /bookings/:id/fund ──► funded status
[Future] Guest settles      ──► settle_booking on-chain ──► completed
```

## Environment configuration

See `.env` (not committed). Critical variables:

- `DATABASE_URL`, `JWT_SECRET` — API
- `NEXT_PUBLIC_API_URL` — web → API
- `NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS` — escrow (empty until deployed)
- `NEXT_PUBLIC_STRK20_PRIVACY` — enable STRK20 provider path

## Deployment topology (typical)

```
Internet ──► Next.js (Vercel/self-hosted)
              │
              ├──► Fastify API (Railway/Fly/self-hosted)
              │         └──► PostgreSQL
              │
              └──► Starknet RPC + user wallet
                        └──► BookingEscrow (Sepolia/mainnet)
```

See [deployment.md](./deployment.md) for setup steps.
