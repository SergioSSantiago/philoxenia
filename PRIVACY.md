<p align="center">
  <img src="apps/web/public/philoxenia-mark.png" alt="Philoxenia" width="72" height="72" />
</p>

# Privacy

Philoxenia offers **selective payment privacy** via STRK20 when **Ready X** has **Smart Wallet** and **Private** enabled (wallet API ≥ 0.10) — on **Chrome** (desktop) or in the **Ready X app browser** (required on iPhone). It does **not** claim full-stack anonymity.

<p style="border:2px solid #b91c1c; background:#fef2f2; color:#991b1b; padding:12px 14px; border-radius:8px;">
<strong>iPhone:</strong> use the Ready X wallet app browser — not Safari.<br/>
<strong>Firefox:</strong> no Ready X extension → <strong>no private pay</strong>. Use Chrome + Ready X (desktop).
</p>

## What is private

| Area | Privacy level |
|------|---------------|
| Listing discovery | Private by design — no public marketplace; listings visible only to host, friends, and introduced guests |
| Social graph | Off-chain; not published on-chain |
| Escrow payer (Private STRK/DAI path) | Shielded balance → privacy pool → Philoxenia anonymizer → escrow. Observers see pool↔helper, not the guest as the public ERC-20 payer into escrow |

## What is not private

| Area | Reality |
|------|---------|
| Off-chain metadata | Listings, bookings, friendships, and tx hashes are stored in PostgreSQL operated by the API host |
| Escrow storage & settlement | Guest, host, amounts, and host/connector payouts remain public on-chain |
| Shield / unshield legs | Deposit and withdraw amounts are public ERC-20 transfers by STRK20 design |
| Public ERC-20 pay | Explicit “Public” choice — standard `approve` + fund/settle, fully visible |
| API sessions | JWT-authenticated; wallet address linked to user profile |
| Connector attribution | Connector identity is recorded off-chain for reward calculation |

## STRK20 integration (shipped)

- **Shield / unshield / private balance** — `WalletAccountV6` on Profile
- **Private booking fund** — `withdraw` to `BookingEscrowAnonymizer` + `privacy_invoke` (create/fund/settle). No silent fallback to public when Private is selected
- **Labeling** — `payments.privacy_mode` is `private` only when that path succeeds; exposed on booking API/UI as `privacyMode`

See [docs/strk20.md](./docs/strk20.md) and [docs/booking-escrow-anonymizer.md](./docs/booking-escrow-anonymizer.md).

## Honest expectations

- Philoxenia reduces **discovery** exposure and hides the **guest as public escrow payer** on the Private path — not all data exposure.
- Payment privacy depends on Ready + STRK20 — not on Philoxenia alone.
- Starknet Privacy includes a [compliance layer](https://docs.starknet.io/build/starknet-privacy/overview) with selective disclosure for authorized auditors.
- Operators hosting the API can see off-chain data. Self-hosting is the mitigation for that trust boundary.

## References

- [Starknet Privacy docs](https://docs.starknet.io/build/starknet-privacy)
- [starknet-privacy SDK repo](https://github.com/starkware-libs/starknet-privacy)
- [STRK20 by Example](https://strk20-by-example.org/)
- [docs/privacy.md](./docs/privacy.md) — detailed privacy model
