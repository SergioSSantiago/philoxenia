<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Privacy (detailed)

Philoxenia's privacy model across discovery, data storage, and payments.

## Design intent

Philoxenia minimizes **public discovery** of hospitality offers. It does not promise full anonymity for participants or operators.

## Layer-by-layer analysis

### Discovery privacy ✅ (by design)

- No public marketplace or global search
- Listings returned only to host, friends, or introduced guests
- Unauthorized API responses are indistinguishable (404)

This is the strongest privacy guarantee in the MVP.

### Social graph privacy ⚠️ (off-chain trust)

- Friendships stored in PostgreSQL
- API operator can read all relationships
- User search is by wallet address only (display names are not indexed for search)

**Mitigation:** Self-host the API and database.

### Booking metadata privacy ⚠️

- Dates, amounts, parties, and status stored off-chain
- Connectors, hosts, and guests can see their bookings via API
- Tx hashes link off-chain records to on-chain activity

### Payment privacy ⚡ (conditional)

Depends on asset, wallet, and code path:

| Path | On-chain visibility |
|------|---------------------|
| Public ERC20 (`approve` + `fund_booking`) | Full — amount, sender, escrow visible |
| STRK20 wallet `privateTransfer` | Transfer details hidden per Starknet Privacy protocol |
| Escrow settlement (`settle_booking`) | Public ERC20 transfers to host and connector |

STRK20 properties (from [official docs](https://docs.starknet.io/build/starknet-privacy/overview)):

- Sender, receiver, amount hidden from outside observers
- Compliance layer supports selective disclosure for authorized auditors
- Requires privacy-enabled wallet and registered viewing keys

Philoxenia records `privacyMode` on the payment row but does not independently verify privacy guarantees.

## What STRK20 does not hide in Philoxenia

1. **Listing and booking metadata** in PostgreSQL
2. **Wallet address** on user profile (used for auth)
3. **Escrow settlement** when using public ERC20 on settle
4. **API JWT sessions** — server knows who is logged in

## Fallback policy

`Strk20PaymentProvider` never marks a payment private unless the wallet privacy API returns a transaction hash. Otherwise it uses `PublicPaymentProvider` and records `privacyMode: "public"`.

## Escrow + privacy gap

The MVP escrow contract uses standard ERC20. Two paths exist today:

1. **Public:** guest calls `fund_booking` — updates escrow state, visible transfer
2. **Private:** guest calls wallet `privateTransfer` to escrow address — may **not** update escrow booking state

Production private escrow should follow upstream [anonymizer / escrow patterns](https://strk20-by-example.org/) rather than sending private notes directly to a public ERC20 escrow.

## Compliance

Starknet Privacy includes auditor selective disclosure by design. Philoxenia inherits this when using STRK20 — it is not a "mixer" and does not remove compliance features of the underlying protocol.

## User-facing guidance (honest)

Tell users:

- Listings are private from the public, not from the platform operator
- Payment privacy requires a compatible wallet and STRK; DAI is always public
- Even with STRK20 funding, settlement may be visible unless fully integrated
- Friend and booking data live in the app's database

## Configuration

| Variable | Effect |
|----------|--------|
| `NEXT_PUBLIC_STRK20_PRIVACY=false` | Disable STRK20 path; all STRK payments public |
| Default (unset or not `"false"`) | Attempt STRK20 when asset is STRK |

## References

- [Starknet Privacy](https://docs.starknet.io/build/starknet-privacy)
- [starknet-privacy GitHub](https://github.com/starkware-libs/starknet-privacy)
- [STRK20 by Example](https://strk20-by-example.org/)
- [strk20.md](./strk20.md)
- [../PRIVACY.md](../PRIVACY.md)
