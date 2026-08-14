# Deployment

Deploying Philoxenia beyond local development.

## Components to deploy

| Component | Suggested hosting |
|-----------|-------------------|
| PostgreSQL | Managed DB (RDS, Supabase, Neon) or self-hosted |
| API (`apps/api`) | Node container (Fly.io, Railway, ECS) |
| Web (`apps/web`) | Vercel, Netlify, or static/Node host |
| `BookingEscrow` | Starknet Sepolia (test) or mainnet (prod) |

## 1. Database

Provision PostgreSQL 16+. Set:

```env
DATABASE_URL=postgresql://user:pass@host:5432/philoxenia
```

Run migrations from CI or one-off job:

```bash
npm run db:migrate -w @philoxenia/api
```

Do not expose port 5432 to the public internet.

## 2. API

Build and start:

```bash
npm run build -w @philoxenia/shared
npm run build -w @philoxenia/api
npm run start -w @philoxenia/api
```

Required env:

```env
API_PORT=4000
API_URL=https://api.yourdomain.com
JWT_SECRET=<strong-random-secret>
CORS_ORIGIN=https://app.yourdomain.com
DATABASE_URL=...
```

Health check: `GET /health` → `{ "status": "ok" }`

## 3. Web

Build:

```bash
npm run build -w @philoxenia/web
```

Required env (build time for Next.js public vars):

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_STARKNET_CHAIN=sepolia   # or mainnet
NEXT_PUBLIC_RPC_URL=<your-rpc-endpoint>
NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS=<deployed-escrow>
NEXT_PUBLIC_STRK_TOKEN_ADDRESS=<strk-erc20>
NEXT_PUBLIC_DAI_TOKEN_ADDRESS=<dai-erc20>   # if using DAI
NEXT_PUBLIC_STRK20_PRIVACY=true             # or false to force public
```

## 4. Smart contracts

### Build

```bash
cd contracts
scarb build
```

Artifacts appear under `contracts/target/dev/`.

### Deploy (manual)

No scripted deploy in MVP. Typical steps:

1. Choose network (Sepolia recommended for testing)
2. Deploy ERC20 token or use canonical STRK address
3. Deploy `BookingEscrow` with `(token, owner)` constructor args
4. Record address in `NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS`
5. Secure owner key — owner creates on-chain bookings and can settle/refund

### Post-deploy wiring

For each off-chain booking, owner must call:

```cairo
create_booking(
    booking_id, listing_id, host, guest, connector,
    total_amount, connector_reward_bps
)
```

Until a relayer automates this, payments via `fund_booking` will revert.

**STRK20 note:** Private wallet transfers to the escrow address do not invoke `fund_booking`. Full private escrow requires anonymizer integration per [STRK20 docs](./strk20.md).

## 5. STRK20 (optional)

Philoxenia does not deploy privacy infrastructure. Users need privacy-enabled wallets.

Optional future env (not used by MVP web code today):

```env
STRK20_PROVING_URL=
STRK20_DISCOVERY_URL=
```

Refer to [starknet-privacy repo](https://github.com/starkware-libs/starknet-privacy) for prover/discovery setup if building custom wallet flows.

## Production checklist

- [ ] HTTPS on API and web
- [ ] Strong `JWT_SECRET`
- [ ] Restrictive CORS
- [ ] Private PostgreSQL
- [ ] Escrow owner key in multisig or HSM
- [ ] RPC endpoint with reliability SLA
- [ ] Monitoring on `/health` and error rates
- [ ] Plan for on-chain tx verification

## Local → staging smoke test

1. `docker compose up -d && npm run db:migrate -w @philoxenia/api`
2. Deploy escrow to Sepolia; set env addresses
3. Seed or manually create users, friendship, listing, share
4. Complete invite → friend → book → pay flow
5. Verify booking status `funded` in API

## Related

- [development.md](./development.md)
- [smart-contracts.md](./smart-contracts.md)
- [security.md](./security.md)
