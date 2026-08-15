<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# BookingEscrow on Starknet mainnet

**Status: live v2** (WITH ABI + Voyager verified) — STRK + DAI + anonymizer

| Field | STRK escrow | DAI escrow | Anonymizer |
|-------|-------------|------------|------------|
| Contract | [`0x030533…e1f3`](https://voyager.online/contract/0x030533c6110ee5c414a5678bd71115be738852d709c74d8136fa965271c2e1f3) | [`0x004c03…a712`](https://voyager.online/contract/0x004c0322af24bb710f3aa0e48293517777188b42d9c4428b77304008ad0ea712) | [`0x056a81…defb`](https://voyager.online/contract/0x056a817104ad7544a55873584f3d8fb41a780e5466d152b3e1f12d578e75defb) |
| Class | [`0x026a90…fd24`](https://voyager.online/class/0x026a90e91e9e50f5a91cda8b4e40a4008de2a47658758374d170823014c4fd24) | same | [`0x05ba21…499e`](https://voyager.online/class/0x05ba21cfac1ce24c0b25330d24749c03223046b6ec3a4beb790ad9f23054599e) |
| Token | STRK | DAI | — |
| Owner / treasury | `0x047466…E878` | same | — |
| Protocol take | **10%** of connector reward; **0%** if no connector | same | — |

Env (web):

- `NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS`
- `NEXT_PUBLIC_DAI_BOOKING_ESCROW_ADDRESS`
- `NEXT_PUBLIC_BOOKING_ANONYMIZER_ADDRESS`

Private pay uses the anonymizer (`privacy_invoke`). Shadow account remains fallback if the wallet lacks STRK20.

## Fee examples

**With connector** (750 total, 5% connector reward): host 712.5 / connector 33.75 / Philoxenia 3.75.  
**Direct booking:** host 100%; protocol 0%.

## Source

- [`contracts/src/booking_escrow.cairo`](../contracts/src/booking_escrow.cairo)
- [`contracts/src/booking_escrow_anonymizer.cairo`](../contracts/src/booking_escrow_anonymizer.cairo)
- [smart-contracts.md](./smart-contracts.md) · [booking-escrow-anonymizer.md](./booking-escrow-anonymizer.md)

### Constructor (escrow v2)

`token`, `owner`, `protocol_treasury`, `anonymizer`
