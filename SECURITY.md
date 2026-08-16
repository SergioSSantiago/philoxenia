<p align="center">
  <img src="apps/web/public/philoxenia-mark.png" alt="Philoxenia" width="72" height="72" />
</p>

# Security

Security model for the Philoxenia MVP. This document describes intended controls and known gaps.

## Authentication

- **Wallet-based auth** — SNIP-12 typed-data signature (`Authentication { nonce }`, domain `Philoxenia`). **Desktop:** Chrome + Ready X (Smart Wallet + Private). **iPhone:** Ready X app browser only (not Safari). Firefox has no Ready X / no privacy API.
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

- `POST /bookings/confirm` verifies the Starknet receipt (`SUCCEEDED`) and a `BookingSettled` event for the claimed `escrowBookingId` on Philoxenia STRK/DAI escrow.
- Reused `fundTxHash` values are rejected.
- Confirm / cancel / rate-limit hits write to `audit_logs`.

## Known gaps (honest)

| Gap | Risk | Status |
|-----|------|--------|
| Guest/host/amounts in escrow storage | On-chain link of parties/amounts | By design for MVP escrow |
| Off-chain social graph at API operator | Operator can read friendships / listing metadata | Self-host mitigation |
| Messaging Phase C (viewing-key discovery) | Friend link still off-chain | Blocked on Wallet API / SDK |
| Escrow owner is single EOA | Key risk | Multisig ops follow-up |
| Ready X only for private pay | UX friction | Documented product constraint |

## Operational security

- Change default `JWT_SECRET` and database credentials before any public deployment.
- Restrict CORS (`CORS_ORIGIN`) to your frontend origin.
- Run PostgreSQL on a private network; do not expose port 5432 publicly.
- Keep Scarb/Starknet Foundry and Node dependencies updated.

## Reporting

Report security issues privately to the repository maintainers. Do not open public issues for unpatched vulnerabilities.

## Further reading

- [docs/security.md](./docs/security.md) — API, contract, and deployment checklist
