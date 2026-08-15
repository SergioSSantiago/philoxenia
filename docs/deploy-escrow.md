<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# BookingEscrow on Starknet mainnet

**Status: live v2** — ABI on-chain, Voyager-verified, smoke-tested (public + anonymizer + connector).

## Addresses

| Piece | Address / class |
|-------|-----------------|
| Escrow STRK | [`0x030533c6110ee5c414a5678bd71115be738852d709c74d8136fa965271c2e1f3`](https://voyager.online/contract/0x030533c6110ee5c414a5678bd71115be738852d709c74d8136fa965271c2e1f3) |
| Escrow DAI | [`0x004c0322af24bb710f3aa0e48293517777188b42d9c4428b77304008ad0ea712`](https://voyager.online/contract/0x004c0322af24bb710f3aa0e48293517777188b42d9c4428b77304008ad0ea712) |
| Anonymizer | [`0x056a817104ad7544a55873584f3d8fb41a780e5466d152b3e1f12d578e75defb`](https://voyager.online/contract/0x056a817104ad7544a55873584f3d8fb41a780e5466d152b3e1f12d578e75defb) |
| Escrow class ✓ | [`0x026a90…fd24`](https://voyager.online/class/0x026a90e91e9e50f5a91cda8b4e40a4008de2a47658758374d170823014c4fd24) |
| Anonymizer class ✓ | [`0x05ba21…499e`](https://voyager.online/class/0x05ba21cfac1ce24c0b25330d24749c03223046b6ec3a4beb790ad9f23054599e) |
| Owner / treasury | `0x04746642f27C03a5d3706205E8d6fbFEd30d18Ed6bE45584BB2df5a65388E878` |

Constructor (escrow): `(token, owner, protocol_treasury, anonymizer)`.

## Env (web / Vercel)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS` | STRK escrow above |
| `NEXT_PUBLIC_DAI_BOOKING_ESCROW_ADDRESS` | DAI escrow above |
| `NEXT_PUBLIC_BOOKING_ANONYMIZER_ADDRESS` | anonymizer above |

## Fees

- Direct booking: protocol **0%**
- With connector: Philoxenia takes **10% of the connector reward** (`1000` bps)

Example: 0.1 STRK, 5% connector → host **0.095** / connector **0.0045** / protocol **0.0005** (verified on mainnet 2026-08-15).

## Mainnet smoke tests (2026-08-15)

| # | Path | Result |
|---|------|--------|
| 1 | Public create → approve → fund → settle (0.05 STRK, no connector) | Host +0.05 · funded+settled |
| 2 | Anonymizer: transfer → `privacy_invoke` (0.05 STRK) | Host +0.05 · anon balance 0 |
| 3 | Public with connector 5% (0.1 STRK) | Host +0.095 · connector +0.0045 · protocol +0.0005 |

Automated: `cd contracts && scarb test` (5/5) · `npm test -w @philoxenia/api` (13/13).

**Not automated here:** Ready wallet shield / Wallet API private pay (needs desktop Ready + shielded balance). App path is wired; smoke that flow manually once.

## Source

- [`contracts/src/booking_escrow.cairo`](../contracts/src/booking_escrow.cairo)
- [`contracts/src/booking_escrow_anonymizer.cairo`](../contracts/src/booking_escrow_anonymizer.cairo)
- [smart-contracts.md](./smart-contracts.md) · [booking-escrow-anonymizer.md](./booking-escrow-anonymizer.md) · [payments.md](./payments.md)
