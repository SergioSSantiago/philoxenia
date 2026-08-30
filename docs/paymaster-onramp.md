# Paymaster & on-ramp

Philoxenia reduces guest friction with **sponsored gas** (AVNU paymaster, ops-funded via Slot credits) and **Layerswap** on-ramp for STRK/DAI.

## Sponsored gas (Book & pay)

When `AVNU_PAYMASTER_API_KEY` (or `AVNU_API_KEY`) and `NEXT_PUBLIC_SPONSORED_GAS=true` are set on Vercel:

- Public **Book & pay** multicalls use SNIP-29 sponsorship through `/api/paymaster`.
- **AVNU swaps** (public and private STRK ↔ DAI) pass `paymasterBaseUrl` to the AVNU SDK so privacy paymaster RPC also goes through the same proxy.

The API key never reaches the browser. If sponsorship fails, public flows fall back to user-paid gas.

Check configuration: `GET /api/avnu/status` (includes optional sponsor-activity credits).

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
| `AVNU_PAYMASTER_API_KEY` or `AVNU_API_KEY` | Vercel (web) — server only |
| `NEXT_PUBLIC_SPONSORED_GAS` | Vercel web — `true` when key is live |

Sepolia: use `sepolia.paymaster.avnu.fi` automatically when `NEXT_PUBLIC_STARKNET_CHAIN=sepolia`.

## On-ramp (Layerswap)

**Profile → Add STRK or DAI** and the **Book & pay** sheet link to Layerswap with the user's Ready X wallet prefilled as `destAddress`.

No API key required for the hosted page. Optional Layerswap partner key later via `clientId=philoxenia`.

## User copy

- Sponsored gas applies to **public** escrow funding — not a substitute for booking tokens (guest still needs STRK/DAI balance).
- Private Book & pay uses STRK20 proofs. Private AVNU swaps use the same paymaster proxy when configured (pool fee is still taken from shielded balance).

### AVNU Portal shows "never used"

The portal flips to **used** only after at least one **sponsored on-chain transaction** (`txCount > 0` on sponsor-activity). Proxy pings alone do not count.

1. **Add STRK credits** on [portal.avnu.fi](https://portal.avnu.fi) (mainnet). Without credits, sponsorship fails silently and the app falls back to user-paid gas.
2. **Redeploy** after setting `NEXT_PUBLIC_SPONSORED_GAS=true` (Next.js inlines it at build time).
3. **Trigger usage**: public **Book & pay** or a **public AVNU swap** on Profile.

Check live status: `GET /api/avnu/status` (`hasUsage`, `sponsorReady`, `remainingStrkCreditsFormatted`).
