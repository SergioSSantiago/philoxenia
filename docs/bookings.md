<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Bookings

Bookings coordinate stay metadata off-chain and payment on-chain via escrow.

## Lifecycle

```
pending ──fund──► funded ──[future: settle]──► completed
   │                  │
   └── cancel ──► cancelled
                      └──[future: refund]──► refunded
```

| Status | Meaning |
|--------|---------|
| `pending` | Created; awaiting guest payment |
| `funded` | Guest submitted payment tx hash |
| `confirmed` | Reserved for post-settlement confirmation |
| `completed` | Stay settled on-chain |
| `cancelled` | Cancelled before funding |
| `refunded` | Escrow returned to guest |

**MVP note:** `confirmed`, `completed`, `cancelled`, and `refunded` statuses exist in schema but settle/refund/cancel flows are not wired in API or UI.

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

## On-chain booking ID

The web derives an on-chain ID from the UUID:

```typescript
BigInt(booking.id.replace(/-/g, "").slice(0, 16), 16).toString()
```

This ID must match a `create_booking` call on `BookingEscrow` before `fund_booking` succeeds. The web payment multicall runs `create_booking` + `approve` + `fund_booking` in one Ready X transaction (guest is allowed to create their own booking on-chain).

## Reading bookings

| Method | Path | Access |
|--------|------|--------|
| GET | `/bookings` | Guest or host bookings for current user |
| GET | `/bookings/:id` | Guest, host, or connector |

## Settlement (contract only)

On-chain `settle_booking`:

- Caller: guest or contract owner
- Transfers `host_amount` to host, `connector_amount` to connector
- No UI or API endpoint yet

## Refund (contract only)

On-chain `refund_booking`:

- Caller: host or contract owner
- Returns full `total_amount` to guest

## Implementation status

| Feature | Status |
|---------|--------|
| Create booking (API) | Implemented |
| Date overlap check | Implemented |
| Fund confirmation (API) | Implemented |
| Pay button (web) | Implemented |
| On-chain create before fund | **Not wired** |
| Settle / refund (UI + API) | **Not implemented** |

## Related

- [payments.md](./payments.md)
- [smart-contracts.md](./smart-contracts.md)
