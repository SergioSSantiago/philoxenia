# Paymaster & on-ramp

Philoxenia reduces guest friction with **sponsored gas** (AVNU paymaster, ops-funded via Slot credits) and **Layerswap** on-ramp for STRK/DAI.

## Sponsored gas (Book & pay)

When `AVNU_PAYMASTER_API_KEY` and `NEXT_PUBLIC_SPONSORED_GAS=true` are set on Vercel, public **Book & pay** multicalls use SNIP-29 sponsorship through `/api/paymaster` (API key never exposed to the browser). If sponsorship fails, the app falls back to user-paid gas.

### Ops: Slot paymaster budget + policies

Slot manages budget and which contracts are eligible. AVNU relays sponsored transactions for Ready X wallets.

```bash
slot paymaster philoxenia create --team <team> --budget 500 --unit CREDIT
slot paymaster philoxenia policy add-from-json --file config/slot-paymaster-policies.json
slot paymaster philoxenia info
```

Create an AVNU Portal API key ([portal.avnu.fi](https://portal.avnu.fi)) and set:

| Variable | Where |
|----------|--------|
| `AVNU_PAYMASTER_API_KEY` | Vercel (web + api if needed) — server only |
| `NEXT_PUBLIC_SPONSORED_GAS` | Vercel web — `true` when key is live |

Sepolia: use `sepolia.paymaster.avnu.fi` automatically when `NEXT_PUBLIC_STARKNET_CHAIN=sepolia`.

## On-ramp (Layerswap)

**Profile → Add STRK or DAI** and the **Book & pay** sheet link to Layerswap with the user's Ready X wallet prefilled as `destAddress`.

No API key required for the hosted page. Optional Layerswap partner key later via `clientId=philoxenia`.

## User copy

- Sponsored gas applies to **public** escrow funding — not a substitute for booking tokens (guest still needs STRK/DAI balance).
- Private Book & pay uses STRK20 proofs; AVNU may sponsor private swap/pay paths separately when configured.
