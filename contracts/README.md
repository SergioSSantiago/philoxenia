# Philoxenia contracts

## Mainnet (v2 — ABI + Voyager verified + smoke-tested)

| Contract | Address |
|----------|---------|
| BookingEscrowAnonymizer | [`0x056a817…defb`](https://voyager.online/contract/0x056a817104ad7544a55873584f3d8fb41a780e5466d152b3e1f12d578e75defb) |
| BookingEscrow STRK | [`0x030533…e1f3`](https://voyager.online/contract/0x030533c6110ee5c414a5678bd71115be738852d709c74d8136fa965271c2e1f3) |
| BookingEscrow DAI | [`0x004c03…a712`](https://voyager.online/contract/0x004c0322af24bb710f3aa0e48293517777188b42d9c4428b77304008ad0ea712) |

Classes: [anonymizer ✓](https://voyager.online/class/0x05ba21cfac1ce24c0b25330d24749c03223046b6ec3a4beb790ad9f23054599e) · [escrow ✓](https://voyager.online/class/0x026a90e91e9e50f5a91cda8b4e40a4008de2a47658758374d170823014c4fd24)

Docs: [deploy-escrow.md](../docs/deploy-escrow.md) (includes mainnet smoke results)

```bash
scarb build && scarb test   # 5/5
```
