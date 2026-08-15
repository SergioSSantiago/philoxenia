<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# BookingEscrow anonymizer (STRK20 privacy_invoke)

**Status: live mainnet** — declared **with ABI**, Voyager-verified, wired into the web app.

## Live addresses

| Piece | Address |
|-------|---------|
| **BookingEscrowAnonymizer** | [`0x056a817104ad7544a55873584f3d8fb41a780e5466d152b3e1f12d578e75defb`](https://voyager.online/contract/0x056a817104ad7544a55873584f3d8fb41a780e5466d152b3e1f12d578e75defb) |
| Class (verified) | [`0x05ba21cfac1ce24c0b25330d24749c03223046b6ec3a4beb790ad9f23054599e`](https://voyager.online/class/0x05ba21cfac1ce24c0b25330d24749c03223046b6ec3a4beb790ad9f23054599e) |
| Escrow STRK v2 | [`0x030533…e1f3`](https://voyager.online/contract/0x030533c6110ee5c414a5678bd71115be738852d709c74d8136fa965271c2e1f3) |
| Escrow DAI v2 | [`0x004c03…a712`](https://voyager.online/contract/0x004c0322af24bb710f3aa0e48293517777188b42d9c4428b77304008ad0ea712) |
| Escrow class (verified) | [`0x026a90…fd24`](https://voyager.online/class/0x026a90e91e9e50f5a91cda8b4e40a4008de2a47658758374d170823014c4fd24) |

## Goal

Fund escrow from shielded STRK/DAI so observers see **pool ↔ anonymizer**, not the guest wallet as payer — [privacy_invoke](https://strk20-by-example.org/helpers/privacy-invoke).

## What stays public

- Escrow storage: guest, host, connector, amounts
- Open-note output amounts; shield/unshield ERC-20 legs

## Cairo

`privacy_invoke(escrow, token, booking_id, listing_id, host, guest, connector, total_amount, connector_reward_bps, note_id) → Span<OpenNoteDeposit>`

approve → create → fund → settle; empty span when settle consumes all.

Dapp: `apps/web/src/lib/payments/private-escrow-fund.ts` (`fundBookingViaAnonymizer` when env set).

## Env

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_BOOKING_ANONYMIZER_ADDRESS` | Enables `invoke` path |
| `NEXT_PUBLIC_SHADOW_ACCOUNT_ANONYMIZER` | Shadow fallback |

## Optional later

Sub-accounts Wallet API, Xverse, escrow redesign to hide guest on-chain.
