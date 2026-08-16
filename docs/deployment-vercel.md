<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Deploy on Vercel (no localhost)

**Author:** Sergio Sapiña Santiago · [@sergiossantiago](https://t.me/sergiossantiago)

## Repository

https://github.com/SergioSSantiago/philoxenia

## Production URLs

| Service | URL |
|---------|-----|
| Web | https://philoxenia-iota.vercel.app |
| API | https://philoxenia-api.vercel.app |

## Vercel projects (monorepo)

Two projects linked to the same GitHub repo:

1. **philoxenia** — root directory: `apps/web`
2. **philoxenia-api** — root directory: `apps/api`

## Smart contracts (mainnet)

| Variable | Project | Value |
|----------|---------|-------|
| `NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS` | web | `0x030533c6110ee5c414a5678bd71115be738852d709c74d8136fa965271c2e1f3` (STRK) |
| `NEXT_PUBLIC_DAI_BOOKING_ESCROW_ADDRESS` | web | `0x004c0322af24bb710f3aa0e48293517777188b42d9c4428b77304008ad0ea712` (DAI) |
| `NEXT_PUBLIC_BOOKING_ANONYMIZER_ADDRESS` | web | `0x056a817104ad7544a55873584f3d8fb41a780e5466d152b3e1f12d578e75defb` |
| `NEXT_PUBLIC_STRK_TOKEN_ADDRESS` | web | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` |
| `NEXT_PUBLIC_DAI_TOKEN_ADDRESS` | web | `0x00da114221cb83fa859dbdb4c44beeaa0bb37c7537ad5ae66fe5e0efd20e6eb3` |

Voyager STRK: https://voyager.online/contract/0x030533c6110ee5c414a5678bd71115be738852d709c74d8136fa965271c2e1f3  
Voyager DAI: https://voyager.online/contract/0x004c0322af24bb710f3aa0e48293517777188b42d9c4428b77304008ad0ea712  
Voyager anonymizer: https://voyager.online/contract/0x056a817104ad7544a55873584f3d8fb41a780e5466d152b3e1f12d578e75defb — see [deploy-escrow.md](./deploy-escrow.md).

## Environment variables (Vercel Dashboard)

Configure on **both** projects (web + api) where applicable:

| Variable | Project | Value |
|----------|---------|-------|
| `ALCHEMY_API_KEY` | web **and** api | your Alchemy key (mainnet RPC) |
| `STARKNET_CHAIN` | api | `SN_MAIN` |
| `DATABASE_URL` | api | Neon connection string |
| `JWT_SECRET` | api | long random string |
| `CORS_ORIGIN` | api | `https://philoxenia-iota.vercel.app` |
| `NEXT_PUBLIC_API_URL` | web | `https://philoxenia-api.vercel.app` |
| `NEXT_PUBLIC_STARKNET_CHAIN` | web | `mainnet` |
| `NEXT_PUBLIC_BOOKING_ESCROW_ADDRESS` | web | `0x030533c6110ee5c414a5678bd71115be738852d709c74d8136fa965271c2e1f3` |
| `NEXT_PUBLIC_DAI_BOOKING_ESCROW_ADDRESS` | web | `0x004c0322af24bb710f3aa0e48293517777188b42d9c4428b77304008ad0ea712` |
| `NEXT_PUBLIC_BOOKING_ANONYMIZER_ADDRESS` | web | `0x056a817104ad7544a55873584f3d8fb41a780e5466d152b3e1f12d578e75defb` |
| `NEXT_PUBLIC_STRK_TOKEN_ADDRESS` | web | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` |
| `NEXT_PUBLIC_DAI_TOKEN_ADDRESS` | web | `0x00da114221cb83fa859dbdb4c44beeaa0bb37c7537ad5ae66fe5e0efd20e6eb3` |
| `NEXT_PUBLIC_STRK20_PRIVACY` | web | `true` |

Neon Postgres (**philoxenia-api** project):

```bash
cd apps/api
vercel link --project philoxenia-api
printf 'y\n' | vercel integration add neon -m region=fra1 -m auth=false --plan free_v3 -e production
```

After connecting Neon, Vercel injects `DATABASE_URL` into **philoxenia-api** (not the web project).

### Migrations (against Neon, not localhost)

```bash
cd apps/api
vercel env pull ../../.env.production.api --environment=production --yes
set -a && source ../../.env.production.api && set +a
cd ../.. && npm run db:migrate -w @philoxenia/api
```

Important: do not run `vercel env pull` from the repo root without `--project philoxenia-api` — that pulls **web** (`philoxenia`) vars and will not include `DATABASE_URL`.

## Manual deploy

```bash
cd apps/api && vercel --prod
cd apps/web && vercel --prod
```

Each push to `main` on GitHub redeploys if Git Integration is enabled.

The web app uses the Philoxenia cameo as favicon (`apps/web/public/philoxenia-mark.png`). The header logo links to `/`. Sign-in is a Ready X modal on `/home`. **Ideal:** Ready X in-app browser (see [product.md](./product.md)).

**Smartphone blocked:** mobile Ready login does not complete the signature step reliably; it is not a supported client until that is fixed.

## Local (optional)

Only if you need to debug on your machine. Production = Vercel above.
