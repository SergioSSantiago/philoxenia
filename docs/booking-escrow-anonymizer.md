<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# BookingEscrow anonymizer (STRK20 privacy_invoke)

**Status: production** — ABI declared, Voyager-verified, mainnet smoke-tested, env live on https://philoxenia-iota.vercel.app.

## Addresses

| Piece | Link |
|-------|------|
| Anonymizer | [`0x056a817…defb`](https://voyager.online/contract/0x056a817104ad7544a55873584f3d8fb41a780e5466d152b3e1f12d578e75defb) |
| Class ✓ | [`0x05ba21…499e`](https://voyager.online/class/0x05ba21cfac1ce24c0b25330d24749c03223046b6ec3a4beb790ad9f23054599e) |
| Escrow STRK / DAI | see [deploy-escrow.md](./deploy-escrow.md) |

## Behaviour

Observers see **pool ↔ anonymizer ↔ escrow**, not the guest wallet paying escrow.

`privacy_invoke(escrow, token, booking_id, listing_id, host, guest, connector, total_amount, connector_reward_bps, note_id) → Span<OpenNoteDeposit>`

1. Assert helper balance ≥ total  
2. `approve` escrow → `create_booking` → `fund_booking` → `settle_booking`  
3. Empty span if settle consumes all (typical for Philoxenia)

Escrow still stores guest / host / amounts publicly.

## App wiring

`NEXT_PUBLIC_BOOKING_ANONYMIZER_ADDRESS` → `fundBookingViaAnonymizer`.

Wallet API actions for settle-all (no leftover):

1. `withdraw` token amount to the anonymizer (pool → helper)
2. `invoke` anonymizer calldata with `note_id = 0` (empty `OpenNoteDeposit` span)

Do **not** create an `OPEN` note: the privacy pool reverts with `UNDEPOSITED_OPEN_NOTES`
if an open note is created but not filled, and rejects zero-amount fills.

No silent fallback to public when Private is selected. Shadow backup is opt-in (`NEXT_PUBLIC_STRK20_SHADOW_FALLBACK=1`).

## Smoke (mainnet)

Simulated pool withdraw (`transfer` to anonymizer) + `privacy_invoke`: create/fund/settle succeeded; host paid; anonymizer balance 0. See [deploy-escrow.md](./deploy-escrow.md).

## Product scope

Shipped: private payer path via anonymizer. Out of scope for this product: Wallet API sub-accounts, Xverse, redesigning escrow to hide guest storage.
