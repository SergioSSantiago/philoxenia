<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Payments

Philoxenia supports STRK and DAI payments with optional STRK20 privacy for STRK.

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
| `Strk20PaymentProvider` | `paymentAsset === "STRK"` and `NEXT_PUBLIC_STRK20_PRIVACY !== "false"` |
| `PublicPaymentProvider` | DAI, privacy disabled, or STRK20 fallback |

Factory: `createPaymentProvider()` in `strk20-payment-provider.ts`.  
Token / escrow helpers: `tokenAddressForAsset`, `escrowAddressForAsset` in `lib/tokens.ts`.

## Public path (ERC20)

Used for DAI and as STRK fallback:

1. Multicall `create_booking` + ERC20 `approve` (if needed) + `fund_booking` + `settle_booking`
2. Return `{ status: "confirmed", txHash, privacyMode: "public" }`
3. Client confirms with `POST /bookings/confirm` (`paymentAsset`, `totalPrice`, nights)

Requires the matching escrow address for the chosen asset, token address, and host / optional connector wallets.

## STRK20 path

See [strk20.md](./strk20.md). Falls back to the public path when the wallet privacy API is unavailable.

## Peer transfers (Messages)

Friends can send DAI or STRK directly from chat (`peer-transfer.ts`) — used for voluntary returns after social cancel. Not escrow.

## Live FX

`GET /rates/strk-dai` (optional `?fresh=1`) — CoinGecko USD prices → `strkPerDai = usdDai / usdStrk`. Quote and pay refresh with `fresh: true`.
