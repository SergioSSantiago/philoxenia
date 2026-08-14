# Privacy

Philoxenia targets **selective payment privacy** via STRK20 (Starknet Privacy) where wallets support it. It does **not** claim full-stack anonymity.

## What is private

| Area | Privacy level |
|------|---------------|
| Listing discovery | Private by design — no public marketplace; listings visible only to host, friends, and introduced guests |
| Social graph | Off-chain; not published on-chain |
| Payment amount / sender (STRK path) | Can be private **if** the guest wallet exposes the [Starknet Wallet API privacy methods](https://docs.starknet.io/build/starknet-privacy) and the transfer succeeds |

## What is not private

| Area | Reality |
|------|---------|
| Off-chain metadata | Listings, bookings, friendships, and tx hashes are stored in PostgreSQL operated by the API host |
| Public ERC20 fallback | When STRK20 privacy is unavailable, payments use standard `approve` + `fund_booking` — visible on-chain |
| Escrow contract | `BookingEscrow` uses OpenZeppelin ERC20 transfers; settlement splits are public on-chain events |
| API sessions | JWT-authenticated; wallet address linked to user profile |
| Connector attribution | Connector identity is recorded off-chain for reward calculation |

## STRK20 integration (MVP)

The web app (`Strk20PaymentProvider`) probes the connected wallet for `walletApi.privacy` methods (as described in [STRK20 by Example](https://strk20-by-example.org/)). If privacy is unavailable, it **falls back to public ERC20** and records `privacyMode: "public"`. It never labels a payment private without wallet support.

**Current gap:** The private-transfer path sends funds via the wallet privacy API; the public path calls `fund_booking` on `BookingEscrow`. Full end-to-end private escrow (e.g. via anonymizer contracts) is not yet integrated. See [docs/strk20.md](./docs/strk20.md).

## Honest expectations

- Philoxenia reduces **discovery** exposure, not all data exposure.
- Payment privacy depends on wallet, network, and token support — not on Philoxenia alone.
- Starknet Privacy includes a [compliance layer](https://docs.starknet.io/build/starknet-privacy/overview) with selective disclosure for authorized auditors; this is a protocol property, not something Philoxenia disables.
- Operators hosting the API can see off-chain data. Self-hosting is the mitigation for that trust boundary.

## References

- [Starknet Privacy docs](https://docs.starknet.io/build/starknet-privacy)
- [starknet-privacy SDK repo](https://github.com/starkware-libs/starknet-privacy)
- [STRK20 by Example](https://strk20-by-example.org/)
- [docs/privacy.md](./docs/privacy.md) — detailed privacy model
