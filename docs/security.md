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
| Payment claims | Fake tx hash | **Weak** — client-reported; no chain verification |

## API security

### Authentication flow

1. `POST /auth/challenge` — server generates nonce, stores with expiry
2. Client signs SNIP-12 typed data (`Authentication { nonce }`) in Ready X
3. `POST /auth/verify` — server verifies via RPC `verifyMessageInStarknet`, issues JWT

Nonces are single-use and expire in 5 minutes.

### Authorization patterns

- JWT required on all routes except `/health`, `/auth/*`, and unauthenticated `GET /invite/:token`
- Listing/booking access checks in service layer before returning data
- Generic error messages prevent enumeration

### Input validation

Zod schemas on all request bodies and params.

### Recommendations for production

- Rotate `JWT_SECRET`; use strong random value
- Enable HTTPS everywhere
- Rate-limit auth and search endpoints
- Add on-chain tx verification before marking bookings funded
- Structured audit logging for admin/owner actions

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
- Ready X only. **Ideal:** Philoxenia inside the Ready X in-app browser (STRK20). Firefox / desktop often only have legacy Ready without privacy API. System mobile browser deep-links are unsupported for reliable login.
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

- [ ] Change `JWT_SECRET` and DB password
- [ ] Set restrictive `CORS_ORIGIN`
- [ ] Deploy escrow with multisig owner
- [ ] Configure RPC endpoint (not public shared node for production)
- [ ] Verify `NEXT_PUBLIC_*` addresses match deployed contracts
- [ ] Do not expose PostgreSQL port publicly
- [ ] Plan tx verification before accepting funded status

## Related

- [../SECURITY.md](../SECURITY.md) — summary
- [deployment.md](./deployment.md)
