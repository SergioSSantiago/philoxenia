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
| `/` | Landing. Brand-first hero + live network stats; header brand links here. Guest card: **Book & pay through friendship or a place invite** (not “an invite”) |
| `/home` | Unsigned heading **Book & pay with people you trust**; **Connect Ready X to Book & pay places from people you trust.** Signed-in: **Places from people you trust. Book & pay STRK or DAI.** Compact **Ready X wallet** + STRK/DAI + **Shield & swap** to Profile, globe of accessible places, friends’ places, **Shared with me** (**Place invites to Book & pay — last place invite wins connector attribution**; empty **No place invites yet**), own places (**share a place invite and earn**), **My stays** (recent Book & pay stays), friends count |
| `/auth` | Legacy redirect to `/home` |
| `/profile` | Display name, public STRK/DAI, shield/unshield **STRK or DAI**, AVNU STRK ↔ DAI swap. Name field placeholder **Display name**; CTA **Save display name**. Empty PATCH: **Enter a display name or sealed Messages keys**. Loader **Loading Ready X profile…**. Swap fail **Could not swap STRK or DAI**. Copy fail **Could not copy this Ready X wallet** |
| `/friends` | Friends; search by **Ready X wallet**; tap name/wallet → friend places. Loader **Loading friends to Book & pay…** |
| `/friends/[id]` | Friend profile: **Places to Book & pay** + share-as-connector. Empty: **hasn’t published a place yet**; Book & pay when they **publish a place** |
| `/messages`, `/messages/[friendId]` | Sealed chat + peer pay; banner **Sealed Messages is on**. Opening **Opening sealed Messages…**. Header **Sealed Messages** / **Waiting for friend’s sealed key**. Inbox lock **Sealed note**. Name/wallet → friend places; intro **share a place invite**; preview **Open Messages with …** (not “Open chat”). Empty-thread preview **Start a sealed note to Book & pay**. Keys fail **Could not enable sealed Messages**. Load fail **This Messages thread isn’t available.** Note fail **Could not send this sealed note**. Pay fail **Could not send STRK or DAI**. Public send helper **Send STRK or DAI on-chain via Ready X**. Missing tx **Send STRK or DAI needs a transaction hash.** Generic API miss **Could not reach Philoxenia. Try again.** Optional **Anchor this sealed note**. Keys: **Ready X is required for sealed Messages** |
| `/my-listings`, `/listings/new` | Host place CRUD + map + availability calendar; headings **About this place** / **Open nights guests can Book & pay**; host range CTA **Open nights to Book & pay** (not “Add range”); start **Open from**; end date **Until (morning guests leave)**; price **DAI list price / night**; create form labels **Title for this place** / **Description for this place**; create form label **DAI list price / night** (not “Default price per night (DAI)”); submit busy **Publishing this place…**; idle **Publish this place** (not “List this place”); fail **Could not publish this place**; map heading **Place on the map**; missing pin **Pin this place on the map**; map coords **Pin a valid place on the map**; stay limits **Stay limits must allow at least one night to Book & pay**; default DAI **Enter a valid DAI list price / night**; night price **Enter a valid DAI list price for {day}** |
| `/listings/[id]` | Place detail (authorized viewers) + share; guest CTA **Book & pay**. Friend + % > 0 **Share place invite & earn**. Share busy **Creating place invite…**; fail **Could not share this place**. Copy **Copy place invite**; status **Place invite copied** / **Place invite shared**. Native share button **Share place invite…** (not “Share via…”); native share text: **open this place invite**. Host share: **this place invite has no connector** (not “this link”). Host nights busy **Saving open nights…** (fail **Could not save open nights**; discard **Discard open nights**). Delete fail **Could not delete this place**. Unauthorized **This place isn’t available to Book & pay.** |
| `/invite/[token]` | Place invite landing; first paint **Opening place invite to Book & pay…**; missing/expired **This place invite isn’t available to Book & pay.** (not “Invitation unavailable.”). Connector empty **None — host place invite**. Host share **This host place invite has no connector reward.** |
| `/bookings`, `/bookings/new`, `/bookings/[id]` | Book & pay nights (non-contiguous OK); STRK or DAI. Quote heading **Book & pay breakdown**; quote DAI row **Place list total (DAI)**. List title **My stays**. Stay status **Book & pay complete** / **Nights freed** / **Book & pay refunded** (not raw `completed`). Stay detail **Loading stay…**; missing **This stay isn’t available to Book & pay.** (not “Booking not found”). Night labels **First night** / **Morning you leave** (not Check-in / Check-out). Gapped nights **nights not consecutive**. Heading **Cancellation terms**; settled CTA **Free nights (no clawback)**. Cancel busy **Freeing nights…**. If Ready X already charged you, do not Book & pay twice — open **My stays**. Quote fail **Could not quote Book & pay**. Confirm fallback **Could not record this Book & pay stay**. Recording: **Book & pay landed on-chain** (not “Payment landed”). Signing needs a live **Ready X** session |
| `/connector` | **Earn as connector** — explain model, share friend places, reward history. Section **Share place invite & earn** (not “Share & earn”). Subtitle **Share your place invite**. Rewards subtitle: paid when they **Book & pay through your place invite**. Rewards loader **Loading rewards from Book & pay…**. 0% empty: ask hosts to set a % when they **publish a place** |

Shell nav: Home, Friends, Messages, List your place, Bookings, Earnings (`/connector`). Notification bell footer: Friends, Messages, Bookings, **Earnings**. Signed-out header CTA is **Connect Ready X** (same as landing). Missing mobile connector: **Ready X is not available. Use Chrome or the Ready X app.** Sign-in without a session: **Ready X is not connected. Tap Connect Ready X.** Expired challenge: **Sign-in expired. Connect Ready X again.** JWT miss: **Connect Ready X to continue.** iPhone modal: **Copy Philoxenia link for Ready X.** Header/nav always `max-w-6xl`; page content may be `max-w-4xl` or `max-w-6xl` (`wide`). Client error boundary (`error.tsx`): heading **Philoxenia couldn’t load this page**; **Clear session & Connect Ready X**; **Connect Ready X to Book & pay** if the session is stuck; **Back to Home** is `/home` (not the landing). Home loaders: **Loading places to Book & pay…**. Host section title **My places**. Stay list title **My stays** (nav stays **Bookings**).

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
