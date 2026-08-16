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

Connect with [Ready X](https://www.ready.co/) — **Chrome** + Smart Wallet + Private on desktop; on **iPhone** open the app in the **Ready X wallet browser** (not Safari). Firefox has no Ready X.

### Wallet clients

| Client | Auth | Private STRK20 |
|--------|------|----------------|
| Chrome + Ready X (Smart Wallet + Private) | Supported | Yes |
| Ready X **app browser** (iPhone) | Supported (required on iPhone) | Yes |
| Firefox / legacy Ready | Often works | Usually **no** |
| iPhone Safari / system Chrome → Ready | Unreliable | No |

## Common issues

| Issue | Fix |
|-------|-----|
| API connection refused | Check `docker compose ps`; verify `DATABASE_URL` |
| CORS errors | Match `CORS_ORIGIN` to web URL |
| Payment fails | Set `NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS`; ensure on-chain booking exists |
| Wallet auth fails (Ready X) | Mainnet; Smart Wallet + Private; `ALCHEMY_API_KEY` |
| Wallet auth fails on iPhone Safari | Expected — open Philoxenia in the Ready X app browser |
| Private pay blocked on Firefox | Expected — use Chrome + Ready X or Ready X app browser |

## Related

- [brand.md](./brand.md)
- [deployment.md](./deployment.md)
- [../CONTRIBUTING.md](../CONTRIBUTING.md)
