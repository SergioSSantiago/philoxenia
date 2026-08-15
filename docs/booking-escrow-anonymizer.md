<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# BookingEscrow anonymizer (Phase 3 design)

**Status:** design + dapp wiring. Philoxenia owns Cairo review, audit, deploy, and maintenance. This repo’s STRK20 skill does **not** generate the production anonymizer contract.

## Goal

Fund `BookingEscrow` from shielded STRK/DAI so observers see **pool ↔ anonymizer**, not the guest’s main wallet paying escrow — per [privacy_invoke](https://strk20-by-example.org/helpers/privacy-invoke) and [private DeFi](https://strk20-by-example.org/starknet-wallet-api/private-defi).

## What stays public

- Escrow storage still records guest, host, connector, amounts (current Cairo API).
- Open-note output amounts (if any) are public by protocol design.
- Shield/unshield ERC-20 legs are public.

## Interim path (shipped in app)

Until `NEXT_PUBLIC_BOOKING_ANONYMIZER_ADDRESS` is set, the web app funds via **shadow account** (`shadow_account_invoke`): private balance → withdraw to shadow → approve/create/fund/settle on escrow. That unlinks the **transaction payer** from the main wallet; guest address remains in escrow.

Code: `apps/web/src/lib/payments/private-escrow-fund.ts`.

## Target path (team Cairo)

1. Study `packages/vesu_lending_anonymizer` / Ekubo helpers in https://github.com/starkware-libs/starknet-privacy
2. Helper `privacy_invoke`:
   - Pool withdraws token to helper
   - Helper `approve` + `create_booking` + `fund_booking` (+ optional `settle_booking`) on the correct escrow (STRK or DAI instance)
   - Measure balance delta; return `Span<OpenNoteDeposit>` (or empty if no refund note)
3. Atomic rollback if escrow reverts
4. **Audit** before mainnet
5. Deploy; set `NEXT_PUBLIC_BOOKING_ANONYMIZER_ADDRESS` (and DAI twin if needed)
6. Dapp already calls `fundBookingViaAnonymizer` when that env is set

### Possible escrow API adjustments (team decision)

Current `create_booking` takes an explicit `guest` address — still public in storage. Stronger privacy may require a redesign (e.g. commitment guest id). Track under `STRK20_INTEGRATION_PLAN.md` open items.

## Env

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_BOOKING_ANONYMIZER_ADDRESS` | Team-deployed helper; enables `invoke` path |
| `NEXT_PUBLIC_SHADOW_ACCOUNT_ANONYMIZER` | Override shadow infra (defaults to mainnet privacy anonymizer) |

## References

- https://strk20-by-example.org/helpers/privacy-invoke
- https://strk20-by-example.org/starknet-wallet-api/private-defi
- `STRK20_INTEGRATION_PLAN.md`
