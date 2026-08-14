<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Development

Local development setup for Philoxenia. Production is Vercel — see [deployment-vercel.md](./deployment-vercel.md).

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| Docker | For PostgreSQL |
| Scarb | 2.12+ |
| Starknet Foundry | snforge 0.48+ |

## Initial setup

```bash
git clone <repo-url> philoxenia
cd philoxenia
npm install
```

## Database

Start PostgreSQL:

```bash
docker compose up -d
```

Run migrations:

```bash
npm run db:migrate -w @philoxenia/api
```

Optional seed data (demo users, friendships, listings):

```bash
npm run db:seed -w @philoxenia/api
```

## Run services

All at once:

```bash
npm run dev
```

Individually:

```bash
npm run dev:api    # http://localhost:4000
npm run dev:web    # http://localhost:3000
```

## Environment

Copy values into `.env` at the repo root (never commit it). Minimum for local dev:

```env
DATABASE_URL=postgresql://philoxenia:philoxenia@localhost:5432/philoxenia
JWT_SECRET=dev-secret-change-me
CORS_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_STARKNET_CHAIN=mainnet
ALCHEMY_API_KEY=
```

Leave `ALCHEMY_API_KEY` empty only if a public RPC fallback is acceptable. Production must set it on **both** Vercel projects (web and api).

Escrow address can remain empty for off-chain-only testing. Payment buttons require a deployed escrow.

## Contracts

```bash
cd contracts
scarb build
scarb test
```

## Testing

```bash
npm test              # API unit tests (vitest)
npm run test:contracts
npm run typecheck
npm run lint
```

Web payment provider tests:

```bash
npm test -w @philoxenia/web
```

## Project commands

| Command | Description |
|---------|-------------|
| `npm run dev` | API + web concurrently |
| `npm run build` | Build shared, api, web |
| `npm run typecheck` | TypeScript check all packages |
| `npm run test:contracts` | Cairo tests |

## API development notes

- Entry: `apps/api/src/index.ts`
- Routes: `apps/api/src/routes/index.ts`
- Schema: `apps/api/src/db/schema.ts`
- Drizzle config: `apps/api/drizzle.config.ts`

Generate migration after schema changes (if using drizzle-kit):

```bash
npm run db:generate -w @philoxenia/api   # if script exists
```

## Web development notes

- App Router under `apps/web/src/app/`
- Wallet providers in `apps/web/src/components/providers.tsx` (Ready X only)
- Auth context persists JWT in localStorage
- Sign-in UI: `apps/web/src/components/auth-modal.tsx` on `/home`
- Brand lockup: `apps/web/src/components/brand-lockup.tsx` → `/`

Connect with the [Ready X](https://www.ready.co/) **browser extension** on desktop (Starknet mainnet) for auth and payment testing.

### Smartphone testing — do not expect login to work

Mobile sign-in is **blocked / unsupported**. Ready may open for WalletConnect “connect”, but the second-step login signature often never prompts in the wallet. Develop and QA on desktop only until this is resolved.

## Common issues

| Issue | Fix |
|-------|-----|
| API connection refused | Check `docker compose ps`; verify `DATABASE_URL` |
| CORS errors | Match `CORS_ORIGIN` to web URL |
| Payment fails | Set `NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS`; ensure on-chain booking exists |
| Wallet auth fails (desktop) | Use Ready X extension on Starknet mainnet; set `ALCHEMY_API_KEY`; check chain id `SN_MAIN` |
| Wallet auth fails (phone) | Expected — smartphone login is blocked; use desktop Ready X |

## Related

- [brand.md](./brand.md)
- [deployment.md](./deployment.md)
- [../CONTRIBUTING.md](../CONTRIBUTING.md)
