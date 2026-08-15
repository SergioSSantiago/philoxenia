<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Payments

Philoxenia supports STRK and DAI payments with optional STRK20 privacy for STRK.

## Principles

- **Non-custodial** — funds move via the guest's Ready X wallet; Philoxenia holds no balances.
- **Protocol fee only on connector rewards** — 10% of the connector share; **0%** on direct host↔guest bookings.
- **Honest privacy labeling** — payments are marked `private` only when the wallet privacy API succeeds; otherwise `public`.

## Payment providers (web)

Located in `apps/web/src/lib/payments/`:

| Provider | When used |
|----------|-----------|
| `Strk20PaymentProvider` | `paymentAsset === "STRK"` and `NEXT_PUBLIC_STRK20_PRIVACY !== "false"` |
| `PublicPaymentProvider` | DAI, privacy disabled, or STRK20 fallback |

Factory: `createPaymentProvider()` in `strk20-payment-provider.ts`.

## Public path (ERC20)

Used for DAI and as STRK fallback:

1. Multicall `create_booking` (guest) + ERC20 `approve` (if needed) + `fund_booking`
2. Return `{ status: "pending", txHash, privacyMode: "public" }`

Requires:

- `NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS`
- Token address (`NEXT_PUBLIC_STRK_TOKEN_ADDRESS` or `NEXT_PUBLIC_DAI_TOKEN_ADDRESS`)
- Host / optional connector wallet addresses on the booking payload

## STRK20 path

When the connected wallet exposes `walletApi.privacy` (see [strk20.md](./strk20.md)):

1. Detect support via `walletApi.privacy.shield` presence
2. Call `walletApi.privacy.privateTransfer({ token, amount, recipient: escrowAddress })`
3. Return `{ privacyMode: "private", txHash }`

On failure or missing support → falls back to public path.

## API payment record

After wallet execution, guest calls **POST `/bookings/:id/fund`**. The API inserts into `payments`:

| Column | Description |
|--------|-------------|
| `amount` | Booking total |
| `asset` | STRK or DAI |
| `txHash` | From wallet |
| `privacyMode` | `private` or `public` |
| `status` | `confirmed` (MVP; no chain verification yet) |

## Connector earnings

**GET `/connector/earnings`** — sums `connectorRewardAmount` for bookings with status `confirmed` or `completed`.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS` | Escrow contract |
| `NEXT_PUBLIC_STRK_TOKEN_ADDRESS` | STRK ERC20 |
| `NEXT_PUBLIC_DAI_TOKEN_ADDRESS` | DAI ERC20 |
| `NEXT_PUBLIC_STRK20_PRIVACY` | `"false"` disables STRK20 provider |
| `STRK20_PROVING_URL` | Reserved for future SDK prover config |
| `STRK20_DISCOVERY_URL` | Reserved for future discovery config |

## MVP gaps

| Gap | Impact |
|-----|--------|
| No on-chain tx verification | API trusts client-reported hash |
| STRK20 private transfer ≠ `fund_booking` | Escrow state may not update on private path |
| No settle/refund in app | Funds remain in escrow after funding |

## Related

- [strk20.md](./strk20.md)
- [smart-contracts.md](./smart-contracts.md)
- [bookings.md](./bookings.md)
