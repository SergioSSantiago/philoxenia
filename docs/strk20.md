<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# STRK20 (Starknet Privacy)

Philoxenia uses STRK20 for optional private STRK/DAI **booking fund** and for shield/unshield of **STRK and DAI** on Profile. Official protocol docs remain authoritative.

## Official resources

| Resource | URL |
|----------|-----|
| Starknet Privacy overview | https://docs.starknet.io/build/starknet-privacy |
| Full docs index | https://docs.starknet.io/llms.txt |
| TypeScript SDK + proving stack | https://github.com/starkware-libs/starknet-privacy |
| Integration guides | https://strk20-by-example.org/ |
| Full site (single file) | https://strk20-by-example.org/llms-full.txt |

## What STRK20 is

From the [official overview](https://docs.starknet.io/build/starknet-privacy/overview):

- Private asset transfers on Starknet — sender, receiver, and amounts hidden from outside observers (inside the pool)
- Validity enforced with client-side zero-knowledge proofs
- Compliance layer allows selective disclosure for authorized auditors
- Privacy pool (mainnet): [`0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a`](https://voyager.online/contract/0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a)

Philoxenia does **not** implement the STRK20 protocol. It integrates via the **Wallet API** and a team-owned **anonymizer**.

## Philoxenia paths (complete)

1. **Wallet API** — shield / unshield / balances for STRK and DAI (`WalletAccountV6`, wallet API ≥ 0.10). **Ideal:** Ready X in-app browser. Firefox / desktop legacy Ready usually lacks ≥ 0.10 → Private unavailable. Profile, swap, chat, and Private pay errors say **Ready X** (Chrome or iPhone). When Profile cannot see ≥ 0.10, the shield panel lists Chrome + Ready X (not Firefox) **or** iPhone in-app browser, then Smart Wallet + Private, then Reconnect Ready X.
2. **Anonymizer** — private booking fund via `BookingEscrowAnonymizer.privacy_invoke` ([booking-escrow-anonymizer.md](./booking-escrow-anonymizer.md))

### Private fund actions (settle-all)

```text
withdraw (token, amount → anonymizer)
invoke  (privacy_invoke calldata, note_id = 0)
```

No `OPEN` note: the helper returns an empty deposit span (full amount consumed). Creating an unfilled OPEN note reverts with `UNDEPOSITED_OPEN_NOTES`. Calldata felts are `0x`-hex (Ready rejects decimal `CallData.compile` strings).

### Detection

```typescript
const versions = await walletV6.supportedWalletApi(wallet);
// wallet-API >= 0.10 ⇒ STRK20-capable — never probe strk20Balances for detection
```

## What stays public

- Escrow storage: guest / host / amounts  
- Host (and connector) settlement transfers  
- Shield / unshield ERC-20 legs  

## Fallback behavior

- **Private selected:** anonymizer only; error on failure (no silent public). Shadow path is opt-in via `NEXT_PUBLIC_STRK20_SHADOW_FALLBACK=1` (Ready currently lacks shadow commitment).  
- **Public selected:** public ERC-20 multicall; `privacyMode: "public"`.

## Configuration

| Variable | Default | Effect |
|----------|---------|--------|
| `NEXT_PUBLIC_STRK20_PRIVACY` | enabled unless `"false"` | Use `Strk20PaymentProvider` |
| `NEXT_PUBLIC_BOOKING_ANONYMIZER_ADDRESS` | mainnet anonymizer | Private fund helper |
| `NEXT_PUBLIC_STRK20_SHADOW_FALLBACK` | unset | Set `1` to try shadow after anonymizer failure |

## Related

- [privacy.md](./privacy.md)
- [payments.md](./payments.md)
- [booking-escrow-anonymizer.md](./booking-escrow-anonymizer.md)
- `STRK20_INTEGRATION_PLAN.md` (complete)
