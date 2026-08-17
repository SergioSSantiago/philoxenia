# Bookings

Bookings coordinate stay metadata off-chain and payment on-chain via escrow.
**Pay = fund + settle in one transaction.** The API only records a booking after
Starknet receipt verification (`BookingSettled` on Philoxenia escrow).

## Lifecycle (current)

```
quote → on-chain create/fund/settle → POST /bookings/confirm (verified) → completed
                                                              │
                                              social-cancel → cancelled (nights freed)
```

| Status | Meaning |
|--------|---------|
| `completed` | Payment verified on-chain; host/connector paid |
| `cancelled` | Social cancel — nights free; **no** escrow clawback |
| `funded` | Legacy intermediate (pre-settle path only) |
| `refunded` | Legacy on-chain refund — only if still `funded` |
| `pending` | Unused by current web pay path |

## Creating a booking

1. `POST /bookings/quote` — nights (need not be consecutive) + amounts  
2. Client pays on-chain (public multicall or STRK20 anonymizer)  
3. `POST /bookings/confirm` with `{ bookingId, listingId, nights, fundTxHash, escrowBookingId, … }`

`/bookings/new` calendar copy: tap nights one by one; they need not be consecutive; pay STRK or DAI. If the JWT is live but the wallet is not, the page asks to **Connect Ready X** (Chrome or iPhone) — Public and Private both need a live session; Private also needs wallet API ≥ 0.10. Reconnect failures and Private pay errors name Ready X (not a generic Ready extension).

**Confirm verifies:**

- Tx exists and `execution_status === SUCCEEDED`
- Escrow emitted `BookingSettled` for `escrowBookingId`
- `fundTxHash` not already used on another payment

Fake or unrelated hashes are rejected.

## Cancel & refund (honest)

| Action | Effect |
|--------|--------|
| **Free nights** (`POST …/social-cancel`) | Confirm dialog: nights free, **no** on-chain clawback; money return via Messages |
| **Money return** | Voluntary peer transfer in Messages (Send DAI/STRK) |
| **On-chain `refund_booking`** | Only if booking never settled (`funded`); UI does not offer this after immediate settle |

## API

| Method | Path | Notes |
|--------|------|-------|
| POST | `/bookings/quote` | Quote |
| POST | `/bookings/confirm` | Verified create → `completed` |
| POST | `/bookings/:id/social-cancel` | Free nights |
| POST | `/bookings/:id/fund` | Legacy — verified |
| POST | `/bookings/:id/settle` | Legacy — verified |
| POST | `/bookings/:id/refund` | Legacy funded-only — verified |
| GET | `/bookings` | List — empty copy points to booking a friend or waiting on an invite; cards show **You host** / **You stay** |
| GET | `/bookings/:id` | Detail — listing title + Open listing; host/guest profile |

## Related

- [payments.md](./payments.md)
- [smart-contracts.md](./smart-contracts.md)
- [demo-checklist.md](./demo-checklist.md)
- [security.md](./security.md)
