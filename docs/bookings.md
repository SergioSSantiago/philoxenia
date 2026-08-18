# Bookings

Bookings coordinate stay metadata off-chain and payment on-chain via escrow.
**Book & pay = fund + settle in one transaction.** The API only records a booking after
Starknet receipt verification (`BookingSettled` on Philoxenia escrow).

## Lifecycle (current)

```
quote → on-chain create/fund/settle → POST /bookings/confirm (verified) → completed
                                                              │
                                              social-cancel → cancelled (nights freed)
```

| Status | Meaning |
|--------|---------|
| `completed` | Payment verified on-chain; host/connector paid. UI: **Book & pay complete** |
| `cancelled` | Social cancel — nights free; **no** escrow clawback. UI: **Nights freed** |
| `funded` | Legacy intermediate (pre-settle path only). UI: **Paid — recording stay** |
| `refunded` | Legacy on-chain refund — only if still `funded`. UI: **Book & pay refunded** |
| `pending` | Unused by current web pay path. UI: **Recording stay…** |
| `confirmed` | Legacy intermediate. UI: **Book & pay confirmed** |

## Creating a booking

1. `POST /bookings/quote` — nights (need not be consecutive) + amounts  
2. Client pays on-chain (public multicall or STRK20 anonymizer)  
3. `POST /bookings/confirm` with `{ bookingId, listingId, nights, fundTxHash, escrowBookingId, … }`

`/bookings/new` calendar copy: tap nights one by one; they need not be consecutive (**nights not consecutive**, not “non-consecutive OK”); then **Book & pay** in STRK or DAI. Empty selection: **Tap nights to Book & pay.** No open nights: ask the host to open nights you can **Book & pay**. Unauthorized place: **This place isn’t available to Book & pay.** Quote labels **Book & pay with** (STRK or DAI) and **Book & pay now**. Quote card heading **Book & pay breakdown** (not “Price breakdown”). Quote DAI row **Place list total (DAI)**. Primary button is **Book & pay {amount} STRK/DAI**; busy: **Book & pay…** or **Private Book & pay…**; idle Private suffix is **· Private**. Guest calendar: past nights cannot be added to Book & pay. Own place: **You cannot Book & pay your own place.** **Back to place.** Missing query: **Missing place to Book & pay.** If the JWT is live but the wallet is not, the page asks to **Connect Ready X** (Chrome or iPhone) to **Book & pay** — Public and Private both need a live session; Private also needs wallet API ≥ 0.10. Reconnect failures and Private Book & pay errors name Ready X (not a generic Ready extension). Wallet dismiss: **Book & pay cancelled in Ready X.** Missing hash: **Book & pay did not return a transaction hash**. Missing host wallet: **Could not Book & pay — this host has no Ready X wallet.** Recording banner: **Book & pay landed on-chain.** Private hint: **Book & pay from shielded STRK or DAI**. Public toggle: **Public Book & pay** (not “Public ERC-20”); helper **Public Book & pay: approve in Ready X, then fund.** Recording copy: do not tap **Book & pay** again — open My stays. There is no silent fallback to Public Book & pay.

After a successful on-chain pay, the client stores a pending row in `localStorage` (`philoxenia_pending_paid_booking`) and retries `POST /bookings/confirm` (Ready X sometimes throws after the tx already landed). Confirm error: **Book & pay landed on Starknet. Recording the stay — do not Book & pay again.** **Recording stay…** only appears when that pending row (or an in-flight Book & pay) exists — a normal Book & pay visit is not locked. Intro and recording errors: **Do not Book & pay again** — open My stays (also if Ready X charged you). Exhausted confirm retries: **Could not record Book & pay stay**. Quote and stay detail label **Book & pay privacy** (**Public Book & pay** / Private — not “Public ERC-20”). Reopening the page resumes confirm until it succeeds; `/bookings` title is **My stays**; loading is **Loading stays…**; empty: **No Book & pay stays yet** — wait for a guest after a **place invite** (not “connector invite”); stay detail **Loading stay…**; pay page **Loading place to Book & pay…**. Subtitle: **Book & pay is STRK or DAI**; cancel only frees nights. Stay cancel busy: **Freeing nights…**; fail: **Could not free nights**.

**Confirm verifies:**

- Tx exists and `execution_status === SUCCEEDED`
- Escrow emitted `BookingSettled` for `escrowBookingId`
- `fundTxHash` not already used on another payment

Fake or unrelated hashes are rejected. Confirm also posts a chat/bell notice: **Book & pay for “…”** (host: **New Book & pay**, guest: **Book & pay complete**). Social cancel tells the other party to **Send STRK or DAI** in Messages (not “Send DAI/STRK”). Bell title **Nights freed** (not “Booking cancelled”); chat/notification body **Stay at “…”: nights are free again**. Confirm wallet mismatch: **This Book & pay was not made from your Ready X wallet.** Wrong place: **This Book & pay is for a different place.** Reused hash: **This Book & pay was already used for another stay.** Missing place: **This place isn’t available to Book & pay.** (not “Place for this Book & pay was not found”). Unsettled: **This Book & pay stay is not settled on-chain.** Missing stay id: **Missing Book & pay stay id.** Not on chain yet: **Book & pay isn’t on Starknet yet** (not “not found”).

## Cancel policy (honest)

| Action | Effect |
|--------|--------|
| **Free nights** (`POST …/social-cancel`) | Confirm dialog: nights free, **no** on-chain clawback; host/connector were paid **at Book & pay**; money return via Messages. Stay detail heading is **Cancellation terms** (not Cancel policy / refund). Settled CTA: **Free nights (no clawback)** (not “no on-chain refund”). Stay body: **Money return is social** then **Send STRK or DAI**. Stay detail: **Book & pay settles immediately** |
| **Money return** | Voluntary peer transfer in Messages (**Send STRK or DAI**) |
| **On-chain `refund_booking`** | Only if booking never settled (`funded`); UI does not offer this after immediate settle |

## API

| Method | Path | Notes |
|--------|------|-------|
| POST | `/bookings/quote` | Quote |
| POST | `/bookings/confirm` | Verified create → `completed`. Fallback fail **Could not record this Book & pay stay** (not “Confirm booking failed”). Direct POST `/bookings` is rejected: **Stays are recorded only after Book & pay.** |
| POST | `/bookings/recover` | Recover a settled Book & pay. Fallback fail **Could not recover this Book & pay stay** |
| POST | `/bookings/:id/social-cancel` | Free nights |
| POST | `/bookings/:id/fund` | Legacy — verified |
| POST | `/bookings/:id/settle` | Legacy — verified |
| POST | `/bookings/:id/refund` | Legacy funded-only — verified |
| GET | `/bookings` | List title **My stays** — empty **No Book & pay stays yet** (wait after a **place invite**); Home empty matches. Cards show **You host** / **You stay** and stay status **Book & pay complete** / **Nights freed** / **Book & pay confirmed** / **Book & pay refunded** (not raw `completed` / `cancelled` / `confirmed` / `refunded`). Home **My stays** subtitle: recent Book & pay stays. If nights are gapped, the card lists those dates (or “nights not consecutive”) instead of a contiguous first-night–morning-you-leave range |
| GET | `/bookings/:id` | Detail eyebrow **Book & pay**. **Loading stay…**. Missing stay (API + page, not “Booking not found”): **This stay isn’t available to Book & pay.** Duplicate confirm: **This Book & pay stay is already recorded.** Quote with no nights: **Select at least one night to Book & pay**. Closed night: **Night {day} isn’t open to Book & pay**. Legacy fund/settle: **This stay cannot be recorded as Book & pay in its current state**. Night labels **First night** / **Morning you leave** (not Check-in / Check-out). Stay field **Book & pay complete** / **Nights freed** / **Book & pay refunded**. **Book & pay privacy**: **Private (STRK20 · STRK or DAI)** / **Public Book & pay**. Cancel idle (legacy): **Free nights (stay not settled yet)**. Stay CTA **Open Messages to Send STRK or DAI**. **Direct Book & pay — no connector.** **Place list total (DAI)**. **Connector reward (%)** (not “Connector received”). **Paid at Book & pay**. Settled free-nights: **Free nights (no clawback)**. Heading **Cancellation terms**. **Verified Book & pay tx**. Title fallback **Private place** + **View place**; host/guest profile (**places to Book & pay**). Gapped `selectedNights` note that first night / morning you leave is only the bounding window (**nights not consecutive**). Quote fail: **Could not quote Book & pay**. Escrow missing: **Book & pay escrow is not configured**. Social-cancel wrong state: **These nights cannot be freed in the current stay state**. Missing Ready X user: **Your Ready X account wasn’t found. Connect Ready X again.** |

## Related

- [payments.md](./payments.md)
- [smart-contracts.md](./smart-contracts.md)
- [demo-checklist.md](./demo-checklist.md)
- [security.md](./security.md)
