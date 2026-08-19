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
| `/` | Landing. Brand-first hero + live network stats; header brand links here. Guest card: **Book & pay through friendship or a place invite** (not “an invite”). Role headings **Publish places** / **Earn as a connector** / **Book & pay** (not “Host” / “Connector” / “Guest”). Connector body **Earn the connector % set on the place** (not “host-set %”) |
| `/home` | Unsigned heading **Book & pay with people you trust**; **Connect Ready X to Book & pay places from people you trust.** Signed-in: **Places from friends to Book & pay. STRK or DAI.** (not “Places from people you trust”). Compact **Ready X wallet** + STRK/DAI + **Shield & swap** / **Edit Ready X** (not “Edit profile”) to Ready X, globe of accessible places (pin **View place: {title}**, not “Open {title}”; zoom **Zoom places in** / **Zoom places out** / **Reset globe of places**), friends’ places (**Places from friends to Book & pay**, not “Places from my friends”; subtitle **Places from friends to Book & pay — STRK or DAI**, not “trust network”), **Place invites to Book & pay** (not “Shared with me”; subtitle **Last place invite wins connector attribution**; empty **No place invites yet**), own places (**Priced in DAI. Book & pay STRK or DAI**, not “Guests Book & pay”; **share a place invite and earn**), **My stays** (recent Book & pay stays), **Friends to Book & pay** (not “My friends”; pending **friend request(s) to Book & pay**; count **{n} friends to Book & pay**, not “{n} friends”; CTA **Friends to Book & pay**, not “Manage friends”) |
| `/auth` | Legacy redirect to `/home` |
| `/profile` | Page title **Ready X** (not “Profile”). Display name, public STRK/DAI, shield/unshield **STRK or DAI**, AVNU STRK ↔ DAI swap. Name field placeholder **Display name**; label **Display name (friends add you by Ready X wallet)** (not “Name shown to others”); CTA **Save display name** (busy **Saving display name…**; done **Display name saved**, not “Saved!”). Disconnect heading **Ready X in this browser** (not “Session”). Empty PATCH: **Enter a display name or sealed Messages keys**. Loader **Loading Ready X…** (not “Loading Ready X profile…”). Swap fail **Could not swap STRK or DAI**. Copy fail **Could not copy this Ready X wallet**. Helper **friends can add you** (not “trusted friends”). Helper body **Friends add you by Ready X wallet — display names are not searchable** (not “Change it anytime”) |
| `/friends` | Page title **Friends to Book & pay** (not “Friends”; nav stays **Friends**). Search by **Ready X wallet**; tap name/wallet → friend places. Add heading **Add by Ready X wallet** (not “Add someone you trust”). Result CTA **Add by Ready X wallet** (not “Add friend”). Search **Search Ready X wallet** (not “Search”). Dismiss **Close add by Ready X wallet**. Sent: **Friend request sent — Book & pay after they accept.** Send busy **Sending friend request…**. Send fail **Could not send friend request to Book & pay**. Accept idle **Accept to Book & pay**; busy **Accepting…** (not “Working…”). Reject **Reject to Book & pay**. Cancel **Cancel friend request to Book & pay**. Loader **Loading friends to Book & pay…**. Incoming **Friend requests to Book & pay** (not “Incoming requests”). Sent **Sent requests to Book & pay**. List **Friends to Book & pay** (not “Your friends”). List CTA **Messages** (not Message). End **End friendship** (not “Remove friend”). List subtitle **End friendship ends it for both of you** (not “Remove ends the friendship”) |
| `/friends/[id]` | Friend profile: **Places to Book & pay** + share-as-connector. Back **Back to Friends to Book & pay** / **← Friends to Book & pay** (not “Back to friends”). Empty: **hasn’t published a place yet**; Book & pay when they **publish a place** |
| `/messages`, `/messages/[friendId]` | Sealed chat + peer pay; banner **Sealed Messages is on**. Opening **Opening sealed Messages…**. Header **Sealed Messages** / **Waiting for friend’s sealed key**. Inbox lock **Sealed note**. Name/wallet → friend places; intro **share a place invite**; preview **Open Messages with …** (not “Open chat”). Empty-thread preview **Start a sealed note to Book & pay**. Empty thread heading **Start a sealed note to Book & pay** (not “Say hello — sealed note”). Inbox date **Yesterday in Messages** (not “Yesterday”). Inbox load fail **Could not load sealed Messages.** (not “Could not load Messages.”). Keys fail **Could not enable sealed Messages**. Load fail **This Messages thread isn’t available.** Note fail **Could not send this sealed note**. Composer **Write a sealed note to Book & pay** / **Send sealed note** (not “Write a sealed note…” / “Send”). Pay fail **Could not send STRK or DAI**. Public send helper **Send STRK or DAI on-chain via Ready X**. Missing tx **Send STRK or DAI needs a transaction hash.** Generic API miss **Could not reach Philoxenia. Try Philoxenia again.** Optional **Anchor this sealed note**. Pay sheet toggle **Close Send STRK or DAI** (not “Close”). Decrypt miss **Could not open this sealed note on this device**. Transfer eyebrow **Private Send STRK or DAI** (not “Private transfer”). Transfer body **Sent STRK or DAI** / **Received STRK or DAI** (not “You sent”). Tx link **View on Voyager** (not “View transaction”). Keys: **Ready X is required for sealed Messages** |
| `/my-listings`, `/listings/new` | Host place CRUD + map + availability calendar; headings **About this place** / **Open nights to Book & pay** (not “Open nights guests can Book & pay”); host range CTA **Open nights to Book & pay** (not “Add range”); start **Open from**; end date **Until (morning they leave)** (not “Until (morning guests leave)”); price **DAI list price / night**; create form labels **Title for this place** / **Description for this place**; create form label **DAI list price / night** (not “Default price per night (DAI)”); submit busy **Publishing this place…**; idle **Publish this place** (not “List this place”); fail **Could not publish this place**; map heading **Place on the map**; search **Search this place** (not “Search”); missing pin **Pin this place on the map**; map coords **Pin a valid place on the map**; stay limits **Stay limits must allow at least one night to Book & pay**; default DAI **Enter a valid DAI list price / night**; night price **Enter a valid DAI list price for {day}** |
| `/listings/[id]` | Place detail (authorized viewers) + share; guest CTA **Book & pay**. Friend + % > 0 **Share place invite & earn**. Share busy **Creating place invite…**; fail **Could not share this place**. Copy **Copy place invite** (flash **Place invite copied**, not “Copied!”); status **Place invite copied** / **Place invite shared**. Native share button **Share place invite…** (not “Share via…”); native share text: **open this place invite**. Host share: **You published this place** — **this place invite has no connector** (not “You shared as the host” / “this link”). Guest nights helper **selected — Book & pay** (not “continue to Book & pay”). Host nights busy **Saving open nights…** (fail **Could not save open nights**; discard **Discard open nights**). Delete fail **Could not delete this place**. Delete busy **Deleting this place…** (not “Working…”). Host badge **Publishes this place** (not “Host”; own place **Your place**). Map **Open this place on OpenStreetMap** (not “Open on OpenStreetMap”). Price helper **to who publishes this place & connector** (not “to host & connector”). Unauthorized **This place isn’t available to Book & pay.** |
| `/invite/[token]` | Place invite landing; first paint **Opening place invite to Book & pay…**; missing/expired **This place invite isn’t available to Book & pay.** (not “Invitation unavailable.”). Request CTA **Request friendship to Book & pay with {name}** (not “Request friendship with”). Invite body **Place hosted by** (not “Private place hosted by”). Host badge **Publishes this place** (not “Host”). Connector empty **None — host place invite**. Host share **This host place invite has no connector reward.** |
| `/bookings`, `/bookings/new`, `/bookings/[id]` | Book & pay nights (**nights not consecutive** is fine, not “they need not be consecutive”); STRK or DAI. Empty nights **Ask them to open nights to Book & pay**. Public helper **Visible on Voyager**. DAI helper **Who publishes this place and the connector are paid immediately** (not “Host and connector”). Missing wallet **this place has no Ready X wallet** (not “this host”). Quote heading **Book & pay breakdown**; quote DAI row **Place list total (DAI)**. List title **My stays**. Stay status **Book & pay complete** / **Nights freed** / **Book & pay refunded** (not raw `completed`). Stay detail **Loading stay…**; missing **This stay isn’t available to Book & pay.** (not “Booking not found”). Missing place title **this place** (not “Private place”). Night labels **First night** / **Morning you leave** (not Check-in / Check-out). Gapped nights **nights not consecutive**. Heading **Cancellation terms**; settled CTA **Free nights (no clawback)**. Cancel busy **Freeing nights…**. Cancel fail **Could not free these nights** (not “Could not free nights”). Confirm prompt ends **Free these nights?** (not “Continue?”). If Ready X already charged you, do not Book & pay twice — open **My stays**. Quote fail **Could not quote Book & pay**. Confirm fallback **Could not record this Book & pay stay**. Recording: **Book & pay landed on-chain** (not “Payment landed”). Stay split **Host paid at Book & pay** (not “Host received”). Stay CTAs **Messages** / **Places to Book & pay** (not “Message host”). Stay helper **Open Places to Book & pay to see more** (not “Open their profile”). Stay badge **Publishes this place** / **Book & pay** (not “Host” / “Guest”). Private helper **Shield the Book & pay asset on Ready X first** (not “on Profile”). Signing needs a live **Ready X** session |
| `/connector` | **Earn as connector** — intro **When you share a place invite** (not “introduce a guest”). Example **950 DAI to who publishes this place** (not “host 950 DAI”). Explain model, share friend places, reward history. Section **Share place invite & earn** (not “Share & earn”). Subtitle **Share your place invite**. Step 1 **Friends to Book & pay** (not “people you already trust”). Rewards heading **Rewards from Book & pay** (not “Your rewards”). Rewards subtitle: paid when they **Book & pay through your place invite**. Rewards loader **Loading rewards from Book & pay…**. 0% empty **Friends to Book & pay have places** (not “Your friends have places”). 0% list **Also among friends to Book & pay** (not “Also in your network”). Host line **Publishes this place: {name}** (not “Host {name}”). 0% empty: ask hosts to set a % when they **publish a place**. No places CTA **Friends to Book & pay** (not “Add friends”) |

Shell nav: Home, Friends, Messages, List your place, Bookings, Earnings (`/connector`). Mobile **Open Philoxenia menu** / **Close Philoxenia menu** (not “Open menu” / “Close menu”). Overlay **Close Philoxenia menu overlay**. Notification bell heading **Friends, notes & stays** (not “Notifications”). Notification bell footer: Friends, Messages, Bookings, **Earnings**. Signed-out header CTA is **Connect Ready X** (same as landing). Missing mobile connector: **Ready X is not available. Use Chrome or the Ready X app.** Sign-in without a session: **Ready X is not connected. Tap Connect Ready X.** Expired challenge: **Sign-in expired. Connect Ready X again.** JWT miss: **Connect Ready X to continue.** iPhone modal: **Copy Philoxenia link for Ready X.** Header/nav always `max-w-6xl`; page content may be `max-w-4xl` or `max-w-6xl` (`wide`). Client error boundary (`error.tsx`): heading **Philoxenia couldn’t load this page**; retry **Try Philoxenia again** (not “Try again”); body **Try Philoxenia again** (not “Try again”); **Disconnect Ready X & go Home** (not “Clear session & Connect Ready X”); **Connect Ready X to Book & pay** if the session is stuck; **Back to Home** is `/home` (not the landing). Home loaders: **Loading places to Book & pay…**. Host section title **My places**. Stay list title **My stays** (nav stays **Bookings**).

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
