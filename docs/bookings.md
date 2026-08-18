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

`/bookings/new` calendar copy: tap nights one by one; they need not be consecutive; then **Book & pay** in STRK or DAI. Quote labels **Book & pay with** (STRK or DAI) and **Book & pay now**. Primary button is **Book & pay {amount} STRK/DAI**. Guest calendar: past nights cannot be added to Book & pay. Own listing: **You cannot Book & pay your own listing.** If the JWT is live but the wallet is not, the page asks to **Connect Ready X** (Chrome or iPhone) to **Book & pay** — Public and Private both need a live session; Private also needs wallet API ≥ 0.10. Reconnect failures and Private pay errors name Ready X (not a generic Ready extension). Recording copy: do not tap **Book & pay** again.

After a successful on-chain pay, the client stores a pending row in `localStorage` (`philoxenia_pending_paid_booking`) and retries `POST /bookings/confirm` (Ready X sometimes throws after the tx already landed). **Recording booking…** only appears when that pending row (or an in-flight pay) exists — a normal Book & pay visit is not locked. Intro copy: if Ready X already charged you, do not pay twice; open My bookings. Reopening the page resumes confirm until it succeeds; `/bookings` loading is **Loading bookings…**; stay detail **Loading booking…**; pay page **Loading listing…**. Subtitle: **Book & pay is STRK or DAI**; cancel only frees nights.

**Confirm verifies:**

- Tx exists and `execution_status === SUCCEEDED`
- Escrow emitted `BookingSettled` for `escrowBookingId`
- `fundTxHash` not already used on another payment

Fake or unrelated hashes are rejected. Confirm also posts a chat/bell notice: **Book & pay for “…”** (host: **New Book & pay**, guest: **Book & pay complete**). Social cancel tells the other party to **Send STRK or DAI** in Messages (not “Send DAI/STRK”).

## Cancel & refund (honest)

| Action | Effect |
|--------|--------|
| **Free nights** (`POST …/social-cancel`) | Confirm dialog: nights free, **no** on-chain clawback; money return via Messages. Stay detail: **Book & pay settles immediately** |
| **Money return** | Voluntary peer transfer in Messages (**Send STRK or DAI**) |
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
| GET | `/bookings` | List — empty copy points to booking a friend or waiting on an invite; cards show **You host** / **You stay**. If nights are gapped, the card lists those dates (or “not consecutive”) instead of a contiguous check-in–out range |
| GET | `/bookings/:id` | Detail — listing title + Open listing; host/guest profile. Gapped `selectedNights` note that check-in/out is only the bounding window |

## Related

- [payments.md](./payments.md)
- [smart-contracts.md](./smart-contracts.md)
- [demo-checklist.md](./demo-checklist.md)
- [security.md](./security.md)
