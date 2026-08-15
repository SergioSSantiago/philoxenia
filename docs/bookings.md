<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Bookings

Bookings coordinate stay metadata off-chain and payment on-chain via escrow.

## Lifecycle

```
pending ──fund──► funded ──settle──► completed
   │                  │
   └── cancel ──► cancelled
                      └──refund──► refunded
```

| Status | Meaning |
|--------|---------|
| `pending` | Created; awaiting guest payment |
| `funded` | Guest submitted payment tx hash |
| `confirmed` | Reserved for post-settlement confirmation |
| `completed` | Guest settled on-chain; host / connector / treasury paid |
| `cancelled` | Cancelled before funding (API not wired yet) |
| `refunded` | Host refunded on-chain; full amount returned to guest |

## Creating a booking

**POST `/bookings`** (authenticated guest)

```json
{
  "listingId": "uuid",
  "checkIn": "ISO date",
  "checkOut": "ISO date"
}
```

Validations:

- Guest can view the listing (friend of host)
- Stay length within `minStay` / `maxStay`
- Connector is **optional**: if a share introduction exists and the connector is still friends with the host, they are attributed; otherwise direct booking
- No overlapping `pending`, `funded`, or `confirmed` bookings for same dates

### Amount calculation

```
totalPrice = pricePerNight × nights

# With connector (listing connectorRewardPercent, e.g. 5%):
connectorGross = totalPrice × connectorRewardPercent / 100
protocolFeeAmount = connectorGross × 10 / 100          # Philoxenia: 10% of connector reward
connectorRewardAmount = connectorGross − protocolFeeAmount
hostAmount = totalPrice − connectorGross

# Without connector:
hostAmount = totalPrice
connectorRewardAmount = 0
protocolFeeAmount = 0
```

UI shows **percentages**. On-chain uses basis points internally.

## Funding

Guest pays via wallet on `/bookings/[id]`, then confirms:

**POST `/bookings/:id/fund`**

```json
{
  "fundTxHash": "0x…",
  "escrowBookingId": "optional on-chain id",
  "privacyMode": "private | public"
}
```

Updates booking to `funded` and inserts a `payments` row.

## Settlement

Guest (or contract owner) calls `settle_booking` on-chain, then confirms:

**POST `/bookings/:id/settle`** (guest only)

```json
{
  "settleTxHash": "0x…"
}
```

Updates booking to `completed`. Pays host, connector (if any), and protocol treasury.

## Refund

Host (or contract owner) calls `refund_booking` on-chain, then confirms:

**POST `/bookings/:id/refund`** (host only)

```json
{
  "refundTxHash": "0x…"
}
```

Updates booking to `refunded`. Returns full `total_amount` to the guest.

## On-chain booking ID

The web derives an on-chain ID from the UUID:

```typescript
BigInt(`0x${booking.id.replace(/-/g, "").slice(0, 16)}`).toString()
```

This ID is stored as `escrowBookingId` after funding. Settle and refund reuse it.

The web payment multicall runs `create_booking` + `approve` + `fund_booking` in one Ready X transaction (guest is allowed to create their own booking on-chain).

## Reading bookings

| Method | Path | Access |
|--------|------|--------|
| GET | `/bookings` | Guest or host bookings for current user |
| GET | `/bookings/:id` | Guest, host, or connector |

## Implementation status

| Feature | Status |
|---------|--------|
| Create booking (API) | Implemented |
| Date overlap check | Implemented |
| Fund confirmation (API) | Implemented |
| Pay button (web) | Implemented |
| On-chain create before fund | Implemented (multicall) |
| Settle (UI + API) | Implemented |
| Refund (UI + API) | Implemented |
| Cancel before fund | Not implemented |

## Related

- [payments.md](./payments.md)
- [smart-contracts.md](./smart-contracts.md)
