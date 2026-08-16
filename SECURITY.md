<p align="center">
  <img src="apps/web/public/philoxenia-mark.png" alt="Philoxenia" width="72" height="72" />
</p>

# Security

Security model for the Philoxenia MVP. This document describes intended controls and known gaps.

## Authentication

- **Wallet-based auth** — Users prove control of a Starknet address with a SNIP-12 typed-data signature (`Authentication { nonce }`, domain name `Philoxenia`). No password or custodial keys. **Ideal client:** Ready X **in-app browser** (STRK20). Firefox / desktop legacy Ready usually lacks privacy API; system mobile browser deep-links are unreliable for login.
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
- **Protocol fee** — **10% of the connector reward** only (0% when there is no connector). Enforced in `BookingEscrow` settlement math.

## Payment integrity

- The API records `fundTxHash` and `privacyMode` after the guest submits payment confirmation.
- **MVP limitation:** The API does not yet verify on-chain that the tx actually funded the correct escrow booking. Trust is placed in the client-reported hash until indexer verification is added.

## Known gaps (MVP)

| Gap | Risk | Mitigation path |
|-----|------|-----------------|
| No on-chain tx verification | Client could report a fake hash | Add RPC/event indexer validation |
| Guest/host/amounts in escrow storage | On-chain link of parties/amounts | Future escrow redesign (commitment guest id) |
| Off-chain data at API operator | Operator can read all metadata | Self-host; encrypt at rest; future E2E options |
| User search by wallet address | Minor enumeration | Rate-limit; display names are not searchable |
| Ready Wallet API private pay | Needs desktop Ready + shield | Manual smoke; fallback to public/shadow |

## Operational security

- Change default `JWT_SECRET` and database credentials before any public deployment.
- Restrict CORS (`CORS_ORIGIN`) to your frontend origin.
- Run PostgreSQL on a private network; do not expose port 5432 publicly.
- Keep Scarb/Starknet Foundry and Node dependencies updated.

## Reporting

Report security issues privately to the repository maintainers. Do not open public issues for unpatched vulnerabilities.

## Further reading

- [docs/security.md](./docs/security.md) — API, contract, and deployment checklist
