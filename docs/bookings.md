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
- Valid connector introduction exists; connector still friends with host
- No overlapping `pending`, `funded`, or `confirmed` bookings for same dates

### Amount calculation

```
totalPrice = pricePerNight × nights
connectorRewardAmount = totalPrice × connectorRewardPercent / 100
hostAmount = totalPrice - connectorRewardAmount
```

Philoxenia protocol fee: **0%**.

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

This ID must match a `create_booking` call on `BookingEscrow` before `fund_booking` succeeds. **MVP gap:** `create_booking` is not invoked by API/web; only the contract owner can call it today.

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
