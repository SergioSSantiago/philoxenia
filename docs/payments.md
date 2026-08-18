<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Payments

Philoxenia supports STRK and DAI payments with optional STRK20 privacy for **both** assets.

List prices are always **DAI**. At pay time the guest chooses:

| Asset | Amount | Escrow |
|-------|--------|--------|
| **DAI** | `totalPriceDai` (1:1) | `NEXT_PUBLIC_DAI_BOOKING_ESCROW_ADDRESS` |
| **STRK** | `totalPriceDai × live strkPerDai` (CoinGecko) | `NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS` |

Each escrow is the same Cairo class with a different constructor token.

## Principles

- **Non-custodial** — funds move via the guest's Ready X wallet; Philoxenia holds no balances.
- **Protocol fee only on connector rewards** — 10% of the connector share; **0%** on direct host↔guest bookings.
- **Immediate settle** — `create_booking` → `approve` → `fund_booking` → `settle_booking` in one multicall; host (+ connector) paid on pay.
- **Honest privacy labeling** — payments are marked `private` only when the wallet privacy API succeeds; otherwise `public`.

## Payment providers (web)

Located in `apps/web/src/lib/payments/`:

| Provider | When used |
|----------|-----------|
| `Strk20PaymentProvider` | STRK/DAI with `NEXT_PUBLIC_STRK20_PRIVACY !== "false"` |
| `PublicPaymentProvider` | Privacy off, wallet without STRK20, or user chose Public |

Private fund (default when Ready X wallet API ≥ 0.10):

1. **Anonymizer (live)** — `withdraw` to helper + `privacy_invoke` (no silent public fallback). If the wallet lacks STRK20, Book & pay errors: **Private Book & pay needs Ready X** (wallet API ≥ 0.10) — then shield on Profile, or choose Public. User-abort and failure copy is **Private Book & pay cancelled/failed** (no public fallback).
2. Shadow-account backup only if `NEXT_PUBLIC_STRK20_SHADOW_FALLBACK=1` (Ready X lacks it by default)
3. Public ERC-20 only when the guest explicitly chooses Public

Mainnet smoke tests (public, anonymizer helper, connector split): [deploy-escrow.md](./deploy-escrow.md).

## Swap STRK ↔ DAI (Profile)

Public swaps use [@avnu/avnu-sdk](https://docs.avnu.fi) (`getQuotes` + `executeSwap`) from **Profile** (Home shortcut is **Shield & swap**). Labels: **You sell** / **You receive** (not “You pay” — that is **Book & pay**). Ready X must be connected to sign (**Connect Ready X** / **Connecting Ready X…** — Chrome or iPhone). Notices say Ready X, not a generic Ready extension. Slippage default **1%**. Private AVNU swaps need a paymaster/server path and are not wired in the browser yet.

## Balances (Home vs Profile)

`WalletBalances` (`apps/web/src/components/wallet-balances.tsx`) shows **public** ERC-20 STRK and DAI.

| Surface | Mode | Notes |
|---------|------|--------|
| `/home` | `compact` | Public STRK **and DAI** hints “shield for Private Book & pay” |
| `/profile` | full | Same public rows + `Strk20PrivacyPanel` (shield / unshield **STRK or DAI** for **Private Book & pay**). Notices: **Ready X session needed** (not a generic Ready session) |

If the JWT session is still valid but Ready X is disconnected, public balances still load from the session wallet address. **Connect Ready X** is required to sign (shield, **Private Book & pay**, settle, swap). `/bookings/new` says the same when Book & pay is blocked.

Factory: `createPaymentProvider()` in `strk20-payment-provider.ts`.  
Token / escrow helpers: `tokenAddressForAsset`, `escrowAddressForAsset` in `lib/tokens.ts`.

**Bookable nights:** API and guest calendar reject nights before UTC today (copy: cannot be added to **Book & pay**).

## Public path (ERC20)

Used when the guest chooses Public (or privacy is disabled):

1. Multicall `create_booking` + ERC20 `approve` (if needed) + `fund_booking` + `settle_booking`
2. Return `{ status: "pending", txHash, privacyMode: "public" }`
3. Client confirms with `POST /bookings/confirm` (`paymentAsset`, `totalPrice`, `privacyMode`, nights)

Requires the matching escrow address for the chosen asset, token address, and host / optional connector wallets.

## STRK20 path

See [strk20.md](./strk20.md). Private selection does **not** fall back to public on failure.

## Peer transfers (Messages)

Friends can send DAI or STRK directly from chat (`peer-transfer.ts`) — used for voluntary returns after social cancel. Not escrow. Chat and booking pay both say **Connect Ready X** when the JWT is live but the wallet is not.

## Live FX

`GET /rates/strk-dai` (optional `?fresh=1`) — CoinGecko USD prices → `strkPerDai = usdDai / usdStrk`. Quote and pay refresh with `fresh: true`.

## Related

- [connectors.md](./connectors.md) — connector rewards paid on settle
- [bookings.md](./bookings.md)
- [strk20.md](./strk20.md)
- [deploy-escrow.md](./deploy-escrow.md)
