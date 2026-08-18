<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Privacy (detailed)

Philoxenia's privacy model across discovery, data storage, and payments.

## Design intent

Philoxenia minimizes **public discovery** of hospitality offers and offers an optional **private escrow payer** path via STRK20. It does not promise full anonymity for participants or operators.

## Layer-by-layer analysis

### Discovery privacy ✅ (by design)

- No public marketplace or global search
- Listings returned only to host, friends, or introduced guests
- Unauthorized API responses are indistinguishable (404)

### Social graph privacy ⚠️ (off-chain trust)

- Friendships stored in PostgreSQL
- API operator can read all relationships
- User search is by **Ready X wallet** address only

**Mitigation:** Self-host the API and database.

### Booking metadata privacy ⚠️

- Dates, amounts, parties, and status stored off-chain
- `payments.privacy_mode` records whether fund used STRK20 (`private`) or public ERC-20 (`public`)
- Tx hashes link off-chain records to on-chain activity

### Payment privacy ⚡ (shipped)

| Path | On-chain visibility |
|------|---------------------|
| Public ERC-20 | Full — guest → escrow → host/connector |
| Private (anonymizer) | Pool withdraws to Philoxenia anonymizer; helper create/fund/settle; host paid. Guest is not the public ERC-20 payer into escrow. Escrow **storage** still holds guest/host/amounts. Settlement transfers to host (and connector) are public. |
| Shield / unshield | Public ERC-20 legs into/out of the privacy pool |

Philoxenia records `privacyMode` on the payment row and surfaces it on booking responses. It does not independently re-verify pool proofs.

### Direct message privacy ⚡ (Phase A sealed)

- Chat bodies are **E2E sealed** (`phx1.…`) before POST; API stores ciphertext only
- Device ECDH keys; public half published as `users.message_public_key`
- Friend graph and who messaged whom remain visible to the API operator
- On-chain anonymous mail (`MessageMailbox` + `privacy_invoke`) is Phase B; pool ECDH discovery is Phase C — see [messages.md](./messages.md) and [PRIVATE_MESSAGING_PLAN.md](../PRIVATE_MESSAGING_PLAN.md)

## What STRK20 does not hide in Philoxenia

1. Listing and booking metadata in PostgreSQL  
2. Wallet address on user profile (auth)  
3. Escrow guest/host/amount fields and settlement Transfer events  
4. API JWT sessions  
5. Who is friends / who DMs whom (until Phase C viewing-key discovery)  

## Fallback policy

When the guest selects **Private**, there is **no silent public fallback**. Failure surfaces an error (shield more, update Ready X, or choose Public explicitly). Wallet errors and chat reconnect copy name **Ready X** (Chrome or iPhone), not a generic Ready extension.

When the guest selects **Public**, or privacy is disabled (`NEXT_PUBLIC_STRK20_PRIVACY=false`), the public ERC-20 multicall is used and labeled `public`.

## Compliance

Starknet Privacy includes auditor selective disclosure by design. Philoxenia inherits this when using STRK20 — it is not a mixer and does not remove compliance features of the underlying protocol.

## User-facing guidance (honest)

- Prefer Private when Ready X supports wallet API ≥ 0.10 (Chrome + Ready X, or Ready X in-app browser on iPhone). Profile’s shield checklist says so when the session is not privacy-capable.
- On Firefox / desktop legacy Ready, use Public ERC-20 — **Private Book & pay** will not activate
- Expect guest/host/amounts to remain readable on the escrow contract  
- Treat shield/unshield amounts as public  
- Keep some **public** STRK for gas when paying Public after shielding most of your balance

## Related

- [PRIVACY.md](../PRIVACY.md)
- [strk20.md](./strk20.md)
- [booking-escrow-anonymizer.md](./booking-escrow-anonymizer.md)
- [messages.md](./messages.md)
- [payments.md](./payments.md)
