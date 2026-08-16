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
| `listings` | Host listings with DAI pricing, geo, connector reward |
| `listing_availability` | Optional date ranges (legacy window) |
| `listing_available_days` | Per-night inventory + per-night DAI price |
| `listing_shares` | Opaque invite tokens (optional connector) |
| `share_introductions` | Guest ↔ connector ↔ listing attribution |
| `bookings` | Stay metadata, selected nights, FX, amounts, status, tx hashes |
| `payments` | Payment records with privacy mode |
| `notifications` | In-app notifications |
| `direct_messages` | Friend chat + optional peer transfers |
| `auth_nonces` | Wallet auth challenge nonces |

### Public endpoints (no auth)

| Route | Purpose |
|-------|---------|
| `GET /health` | Liveness |
| `GET /rates/strk-dai` | Live STRK per DAI (CoinGecko) |
| `GET /stats/network` | Landing totals: users, countries, listings open, nights booked, DAI/STRK booked |
| `DELETE /my-listings/:id` | Host deletes listing if no active paid bookings remain |

## Web (`apps/web`)

- **Framework:** Next.js 15 (App Router), React, Tailwind CSS
- **Wallet:** Ready X — **ideal path is the Ready X in-app browser** (`isInArgentMobileAppBrowser`). Firefox / desktop tabs usually inject only legacy Ready (no STRK20 API ≥ 0.10). System mobile browsers deep-linking to Ready are unreliable for SNIP-12.
- **State:** React context for auth (`auth-context.tsx`); JWT in localStorage
- **API client:** `lib/api.ts` (Bearer JWT)
- **Brand:** `components/brand-lockup.tsx` → `/`; landing hero shows live `LandingNetworkStats`

### Key pages

| Route | Purpose |
|-------|---------|
| `/` | Landing. Brand-first hero + live network stats; header brand links here |
| `/home` | App home: compact wallet/balances + interactive globe of accessible listings |
| `/auth` | Legacy redirect to `/home` |
| `/profile` | Display name, STRK/DAI balances, disconnect |
| `/friends` | Friends; search by wallet address only |
| `/messages`, `/messages/[friendId]` | Chat + voluntary peer DAI/STRK |
| `/my-listings`, `/listings/new` | Host listing CRUD + map + availability calendar |
| `/listings/[id]` | Listing detail (authorized viewers) |
| `/invite/[token]` | Invitation landing |
| `/bookings`, `/bookings/new`, `/bookings/[id]` | Book nights (non-contiguous OK); pay STRK or DAI |
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
Guest pays (Web)
  ├─ Public  ──► multicall create + approve + fund + settle
  └─ Private ──► Wallet API withdraw → anonymizer privacy_invoke
Guest confirms (API)        ──► POST /bookings/confirm ──► completed (+ privacyMode)
Host refunds (Web, rare)    ──► refund_booking on-chain ──► POST /refund ──► refunded
```

## Environment configuration

See `.env` (not committed). Critical variables:

- `DATABASE_URL`, `JWT_SECRET` — API
- `NEXT_PUBLIC_API_URL` — web → API
- `NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS` — STRK escrow (mainnet)
- `NEXT_PUBLIC_DAI_BOOKING_ESCROW_ADDRESS` — DAI escrow (mainnet)
- `NEXT_PUBLIC_BOOKING_ANONYMIZER_ADDRESS` — private fund helper
- `NEXT_PUBLIC_STRK20_PRIVACY` — enable STRK20 provider path (default on)

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
