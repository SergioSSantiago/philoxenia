<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# STRK20 (Starknet Privacy)

Philoxenia uses STRK20 **where supported** for optional private STRK payments. This document references official sources only — do not treat Philoxenia-specific code as a substitute for upstream docs.

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

- Private asset transfers on Starknet — sender, receiver, and amounts hidden from outside observers
- Validity enforced with client-side zero-knowledge proofs (Stwo / Cairo)
- Compliance layer allows selective disclosure for authorized auditors
- Privacy pool contract live on mainnet: [`0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a`](https://voyager.online/contract/0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a)
- Sprint tracking: [`strk20.json`](../strk20.json) at repo root (mainnet pool txs, contracts, demo)
- SDK open source in `starkware-libs/starknet-privacy`

Philoxenia does **not** implement the STRK20 protocol itself. It integrates at the **wallet layer**.

## Integration paths (from STRK20 by Example)

The upstream docs describe several builder paths:

1. **Starknet Wallet API** — recommended for dapps; wallet handles shield, private transfer, withdraw
2. **Anonymizer contracts** — `privacy_invoke` pattern for DeFi and custom flows (e.g. escrow)
3. **Low-level SDK** — `createPrivateTransfers`, proving, discovery for wallet builders

Philoxenia MVP uses path **1** with fallback to public ERC20.

## Philoxenia implementation

`apps/web/src/lib/payments/strk20-payment-provider.ts`:

### Detection

Probes the connected account for:

```typescript
wallet.walletApi?.privacy?.shield
```

If absent → `PublicPaymentProvider`.

### Private transfer

When supported, calls (via wallet — **not** Philoxenia-defined protocol APIs):

```typescript
wallet.walletApi?.privacy?.privateTransfer?.({
  token: params.asset,      // e.g. "STRK"
  amount: params.amount,
  recipient: params.escrowAddress,
})
```

### Private balance (optional)

```typescript
wallet.walletApi?.privacy?.getPrivateBalance?.(token)
```

These method names come from the [Starknet Wallet API guide](https://strk20-by-example.org/) — refer there for exact signatures, error handling, and wallet compatibility.

## What Philoxenia does not do (yet)

- Deploy or call the Starknet Privacy pool directly
- Run proving or discovery infrastructure (`STRK20_PROVING_URL`, `STRK20_DISCOVERY_URL` are reserved)
- Use anonymizer contracts for escrow (see [Escrow example](https://strk20-by-example.org/) in upstream docs for the recommended pattern)
- Guarantee private settlement splits — `BookingEscrow.settle_booking` uses public ERC20 transfers

## Fallback behavior

If privacy detection fails, private transfer throws, or the wallet returns no tx hash → **public ERC20 path**. The UI labels the payment accordingly via `privacyLabel()`.

## Configuration

| Variable | Default | Effect |
|----------|---------|--------|
| `NEXT_PUBLIC_STRK20_PRIVACY` | enabled unless `"false"` | Use `Strk20PaymentProvider` for STRK |
| `STRK20_PROVING_URL` | empty | Not used in MVP web code |
| `STRK20_DISCOVERY_URL` | empty | Not used in MVP web code |

## Next integration steps

For production-grade private escrow, follow upstream guidance:

1. Review [Private DeFi End to End](https://strk20-by-example.org/) and [Escrow anonymizer](https://strk20-by-example.org/) patterns
2. Either adapt `BookingEscrow` to work through an anonymizer, or use wallet API open-note flows
3. Prefer private settlement splits when wallet APIs support them

## Related

- [payments.md](./payments.md)
- [privacy.md](./privacy.md)
