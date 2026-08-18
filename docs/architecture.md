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

### Public endpoints (no JWT)

| Route | Purpose |
|-------|---------|
| `GET /health` | Liveness |
| `GET /rates/strk-dai` | Live STRK per DAI (CoinGecko) |
| `GET /stats/network` | Landing totals: users, countries, **places to Book & pay**, paid nights, DAI/STRK paid |
| `GET /invite/:token` | Resolve a share token (404 if invalid; does not leak places) |
| `POST /auth/challenge` | SNIP-12 nonce for a wallet |
| `POST /auth/verify` | Signature → JWT |

Host place delete is **not** public: `DELETE /my-listings/:id` requires JWT and only succeeds when the place has no active **Book & pay** stays. Error copy matches. Place 404: **This place isn’t available to Book & pay.**

Signed-in home uses `GET /home` (JWT): friends, network places, shared places, own places, bookings, pending friend-request count.

## Web (`apps/web`)

- **Framework:** Next.js 15 (App Router), React, Tailwind CSS
- **Wallet:** Ready X via `apps/web/src/lib/wallet-connectors.ts`. Safari Connect uses WalletConnect (`ready://` after `patches/starknetkit+3.4.3.patch`). **Ideal for STRK20:** Ready X in-app browser (`isInArgentMobileAppBrowser` / wallet API ≥ 0.10). Firefox / desktop tabs often inject only legacy Ready.
- **State:** React context for auth (`auth-context.tsx`); JWT in localStorage
- **API client:** `lib/api.ts` (Bearer JWT)
- **Brand:** `components/brand-lockup.tsx` → `/`; landing hero shows live `LandingNetworkStats`

### Key pages

| Route | Purpose |
|-------|---------|
| `/` | Landing. Brand-first hero + live network stats; header brand links here |
| `/home` | Unsigned: **Connect Ready X to Book & pay places from people you trust.** Signed-in snapshot: compact **Ready X wallet** + STRK/DAI + **Shield & swap** to Profile, globe of accessible places, friends’ places, **Shared with me** (**Place invites to Book & pay**), own places, **My stays** (recent Book & pay stays), friends count |
| `/auth` | Legacy redirect to `/home` |
| `/profile` | Display name, public STRK/DAI, shield/unshield **STRK or DAI**, AVNU STRK ↔ DAI swap. Name field placeholder **Display name**. Loader **Loading Ready X profile…**. Swap fail **Could not swap STRK or DAI** |
| `/friends` | Friends; search by **Ready X wallet**; tap name/wallet → friend places. Loader **Loading friends to Book & pay…** |
| `/friends/[id]` | Friend profile: **Places to Book & pay** + share-as-connector |
| `/messages`, `/messages/[friendId]` | Sealed chat + peer pay; banner **Sealed Messages is on**. Name/wallet → friend places; intro **share a place invite**. Empty-thread preview **Start a sealed conversation to Book & pay**. Load fail **This chat isn’t available.** Note fail **Could not send this sealed note**. Pay fail **Could not send STRK or DAI**. Missing tx **Send STRK or DAI needs a transaction hash.** |
| `/my-listings`, `/listings/new` | Host place CRUD + map + availability calendar; headings **About this place** / **Open nights guests can Book & pay**; host range CTA **Open nights to Book & pay** (not “Add range”); end date **Until (morning guests leave)**; submit busy **Publishing this place…**; fail **Could not list this place**; map coords **Pin a valid place on the map**; stay limits **Stay limits must allow at least one night to Book & pay** |
| `/listings/[id]` | Place detail (authorized viewers) + share; guest CTA **Book & pay**. Share busy **Creating place invite…**; fail **Could not share this place**. Copy **Copy place invite**; status **Place invite copied** / **Place invite shared**. Host nights busy **Saving open nights…** (fail **Could not save open nights**; discard **Discard open nights**). Delete fail **Could not delete this place**. Unauthorized **This place isn’t available to Book & pay.** |
| `/invite/[token]` | Place invite landing; API + page missing/expired **This place invite isn’t available to Book & pay.** (not “Invitation unavailable.”) |
| `/bookings`, `/bookings/new`, `/bookings/[id]` | Book & pay nights (non-contiguous OK); STRK or DAI. List title **My stays**. Stay status **Book & pay complete** / **Nights freed** (not raw `completed`). Stay detail **Loading stay…**; missing **This stay isn’t available to Book & pay.** (not “Booking not found”). Cancel busy **Freeing nights…**. If Ready X already charged you, do not Book & pay twice — open **My stays**. Quote fail **Could not quote Book & pay**. Recording: **Book & pay landed on-chain** (not “Payment landed”). Signing needs a live **Ready X** session |
| `/connector` | **Earn as connector** — explain model, share friend places, reward history. Share & earn subtitle **Share your place invite**. Rewards subtitle: paid when they **Book & pay through your place invite**. Rewards loader **Loading rewards from Book & pay…** |

Shell nav: Home, Friends, Messages, List your place, Bookings, Earnings (`/connector`). Notification bell footer: Friends, Messages, Bookings, **Earnings**. Signed-out header CTA is **Connect Ready X** (same as landing). Missing mobile connector: **Ready X is not available. Use Chrome or the Ready X app.** Sign-in without a session: **Ready X is not connected. Tap Connect Ready X.** Expired challenge: **Sign-in expired. Connect Ready X again.** JWT miss: **Connect Ready X to continue.** iPhone modal: **Copy Philoxenia link for Ready X.** Header/nav always `max-w-6xl`; page content may be `max-w-4xl` or `max-w-6xl` (`wide`). Client error boundary (`error.tsx`): **Clear session & Connect Ready X**; **Connect Ready X to Book & pay** if the session is stuck; **Back to Home** is `/home` (not the landing). Home loaders: **Loading places to Book & pay…**. Host section title **My places**. Stay list title **My stays** (nav stays **Bookings**).

## Shared types (`packages/shared`)

Exports TypeScript interfaces used by both API responses and web components: `User`, `Listing`, `Booking`, `Payment`, `InviteResolution`, payment capability types, etc.

## Contracts (`contracts/`)

Mainnet Cairo (Scarb 2.12, Starknet Foundry tests in `contracts/tests/`):

| Contract | Role |
|----------|------|
| `BookingEscrow` | Create / fund / settle / refund; STRK and DAI deployments of the same class |
| `BookingEscrowAnonymizer` | STRK20 `privacy_invoke` helper that funds escrow without the guest as public ERC-20 payer |
| `MessageMailbox` | Optional sealed-chat payload-hash anchor via the privacy pool |

Addresses: [smart-contracts.md](./smart-contracts.md), [message-mailbox.md](./message-mailbox.md), [deploy-escrow.md](./deploy-escrow.md).

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
- `NEXT_PUBLIC_MESSAGE_MAILBOX_ADDRESS` — optional on-chain message anchor
- `NEXT_PUBLIC_STRK20_PRIVACY` — enable STRK20 provider path (default on)

## Deployment topology (production)

```
Internet ──► Next.js (Vercel: philoxenia-iota.vercel.app)
              │
              ├──► Fastify API (Vercel: philoxenia-api.vercel.app)
              │         └──► Neon PostgreSQL
              │
              └──► Starknet mainnet RPC + Ready X
                        └──► BookingEscrow + anonymizer + mailbox
```

Push to `main` deploys both Vercel projects (Git Integration). Do not CLI-deploy after a push. See [deployment-vercel.md](./deployment-vercel.md). Generic/self-host notes: [deployment.md](./deployment.md).
