<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Security (detailed)

Expanded security notes for API, contracts, and deployment.

## Threat model (MVP)

| Asset | Threat | Current control |
|-------|--------|-----------------|
| User accounts | Impersonation | Wallet signature on auth challenge |
| Listings / bookings | Unauthorized access | Server-side authorization; 404 on denial |
| JWT tokens | Theft / forgery | HTTPS + secret signing key |
| Escrow funds | Wrong recipient | Contract enforces guest/host/connector addresses at `create_booking` |
| Payment claims | Fake tx hash | **Mitigated** — receipt + `BookingSettled` for escrow id; reject reused hashes |

## API security

### Authentication flow

1. `POST /auth/challenge` — server generates nonce, stores with expiry
2. Client signs SNIP-12 typed data (`Authentication { nonce }`) in Ready X
3. `POST /auth/verify` — server verifies via RPC `verifyMessageInStarknet`, issues JWT. Fail: **Invalid Ready X signature. Connect Ready X again.** (not “Invalid signature”). RPC errors ask to confirm **Ready X** is on mainnet.

Nonces are single-use and expire in 5 minutes.

### Authorization patterns

- JWT required on all routes except `GET /health`, `GET /stats/network`, `GET /rates/strk-dai`, `POST /auth/*`, and `GET /invite/:token`
- Listing/booking access checks in service layer before returning data
- Generic error messages prevent enumeration

### Input validation

Zod schemas on all request bodies and params.

### Recommendations for production

- Rotate `JWT_SECRET`; use strong random value
- Enable HTTPS everywhere
- Rate-limit auth and search endpoints ✅ (`/auth/challenge`, `/auth/verify`, `/friends/search`)
- On-chain tx verification before completing bookings ✅ (`verifyEscrowPaymentTx`)
- Structured audit logging ✅ (`audit_logs` for confirm / cancel / rate-limit)
- Keep `ALCHEMY_API_KEY` + `STARKNET_CHAIN=SN_MAIN` on the **API** Vercel project

## Contract security

- OpenZeppelin ERC20 for token operations
- State machine prevents double fund/settle/refund
- `create_booking` restricted to owner — prevents spam bookings but requires trusted relayer
- Integer overflow handled by Cairo u256 arithmetic

### Owner privileges

Contract owner can:

- Create bookings (sets party addresses and amounts)
- Settle or refund on behalf of parties

Document and secure the owner key; consider multisig for production.

## Frontend security

- No private keys in frontend code
- Ready X only. Safari → WalletConnect redirect (`ready://`) for login; **ideal for STRK20:** Philoxenia inside the Ready X in-app browser. Firefox / desktop often only have legacy Ready without privacy API.
- Escrow/token addresses from env vars (public)
- Wallet prompts user for all signatures
- Sign-in UI is a modal on `/home`; `/auth` redirects there

## Database

- Use least-privilege DB user in production
- Encrypt connections (TLS to PostgreSQL)
- Regular backups; friendship/listing data is sensitive

## Privacy-related security

- STRK20 does not hide off-chain PostgreSQL data
- Tx hashes stored in DB may link to on-chain activity
- See [privacy.md](./privacy.md) for full privacy boundaries

## Dependency hygiene

```bash
npm audit
cd contracts && scarb build && scarb test
```

Keep `starknet`, `@starknet-react/core`, OpenZeppelin, and Foundry versions aligned with `Scarb.toml`.

## Pre-deployment checklist

- [x] Change `JWT_SECRET` and DB password
- [x] Set restrictive `CORS_ORIGIN`
- [ ] Deploy escrow with multisig owner (current: single owner — ops follow-up)
- [x] Configure RPC endpoint (Alchemy on API + web)
- [x] Verify `NEXT_PUBLIC_*` addresses match deployed contracts
- [x] Do not expose PostgreSQL port publicly (Neon)
- [x] Tx verification before accepting funded/completed status
- [x] Rate-limit auth + friend search
- [x] Audit log table for payment confirm / cancel / rate-limit

## Related

- [../SECURITY.md](../SECURITY.md) — summary
- [deployment.md](./deployment.md)
