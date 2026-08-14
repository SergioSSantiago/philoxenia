# Security

Security model for the Philoxenia MVP. This document describes intended controls and known gaps.

## Authentication

- **Wallet-based auth** — Users prove control of a Starknet address by signing a short-lived challenge (`Philoxenia authentication\nNonce: …`). No password or custodial keys.
- **JWT sessions** — API issues 7-day JWTs after signature verification. Protect `JWT_SECRET` in production.
- **Nonce replay protection** — Auth nonces expire after 5 minutes and are marked used after verification.

## Authorization

All sensitive API routes require a valid JWT. Resource access is denied with generic errors:

- Listings return 404 when the viewer is not the host or a friend.
- Bookings are visible only to guest, host, or connector.
- Share creation requires friendship with the host (or being the host).

Authorization logic lives in `apps/api/src/lib/authorization.ts` and is enforced in service layer calls.

## On-chain security

- **`BookingEscrow`** — Only the designated guest can fund; only guest or contract owner can settle; only host or owner can refund.
- **`create_booking`** — Owner-only. Prevents arbitrary booking injection.
- **0% protocol fee** — Enforced in contract math: `host_amount + connector_amount = total_amount`.

## Payment integrity

- The API records `fundTxHash` and `privacyMode` after the guest submits payment confirmation.
- **MVP limitation:** The API does not yet verify on-chain that the tx actually funded the correct escrow booking. Trust is placed in the client-reported hash until indexer verification is added.

## Known gaps (MVP)

| Gap | Risk | Mitigation path |
|-----|------|-----------------|
| No on-chain tx verification | Client could report a fake hash | Add RPC/event indexer validation |
| `create_booking` not called before `fund_booking` | Public payment path may fail on-chain | Wire owner relayer or open `create_booking` to authorized callers |
| No settle/refund UI | Funds may remain in escrow | Implement guest settle + host refund flows |
| Off-chain data at API operator | Operator can read all metadata | Self-host; encrypt at rest; future E2E options |
| User search by display name / wallet | Minor enumeration | Rate-limit; restrict in production |
| STRK20 private path vs escrow state | Escrow may not reflect private transfer | Integrate anonymizer or unified funding flow |

## Operational security

- Change default `JWT_SECRET` and database credentials before any public deployment.
- Restrict CORS (`CORS_ORIGIN`) to your frontend origin.
- Run PostgreSQL on a private network; do not expose port 5432 publicly.
- Keep Scarb/Starknet Foundry and Node dependencies updated.

## Reporting

Report security issues privately to the repository maintainers. Do not open public issues for unpatched vulnerabilities.

## Further reading

- [docs/security.md](./docs/security.md) — API, contract, and deployment checklist
