<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Deploy en Vercel (sin localhost)

**Autor:** Sergio Sapiña Santiago · [@sergiossantiago](https://t.me/sergiossantiago)

## Repositorio

https://github.com/SergioSSantiago/philoxenia

## URLs de producción

| Servicio | URL |
|----------|-----|
| Web | https://philoxenia-iota.vercel.app |
| API | https://philoxenia-api.vercel.app |

## Proyectos Vercel (monorepo)

Dos proyectos enlazados al mismo repo de GitHub:

1. **philoxenia** — root directory: `apps/web`
2. **philoxenia-api** — root directory: `apps/api`

## Variables de entorno (Vercel Dashboard)

Configurar en **ambos** proyectos (web + api) donde aplique:

| Variable | Proyecto | Valor |
|----------|----------|-------|
| `ALCHEMY_API_KEY` | web **y api** | tu key de Alchemy (RPC mainnet) |
| `STARKNET_CHAIN` | api | `SN_MAIN` |
| `DATABASE_URL` | api | connection string de Neon |
| `JWT_SECRET` | api | string aleatorio largo |
| `CORS_ORIGIN` | api | `https://philoxenia-iota.vercel.app` |
| `NEXT_PUBLIC_API_URL` | web | `https://philoxenia-api.vercel.app` |
| `NEXT_PUBLIC_STARKNET_CHAIN` | web | `mainnet` |
| `NEXT_PUBLIC_STRK20_PRIVACY` | web | `true` |

Neon Postgres (proyecto **philoxenia-api**):

```bash
cd apps/api
vercel link --project philoxenia-api
printf 'y\n' | vercel integration add neon -m region=fra1 -m auth=false --plan free_v3 -e production
```

Tras conectar Neon, Vercel inyecta `DATABASE_URL` en **philoxenia-api** (no en el proyecto web).

### Migraciones (contra Neon, no localhost)

```bash
cd apps/api
vercel env pull ../../.env.production.api --environment=production --yes
set -a && source ../../.env.production.api && set +a
cd ../.. && npm run db:migrate -w @philoxenia/api
```

Importante: no uses `vercel env pull` desde la raíz del repo sin `--project philoxenia-api` — eso descarga vars del **web** (`philoxenia`) y no trae `DATABASE_URL`.

## Deploy manual

```bash
cd apps/api && vercel --prod
cd apps/web && vercel --prod
```

Cada push a `main` en GitHub redeploya si Git Integration está activa.

La web usa el camafeo de Philoxenia como favicon (`apps/web/public/philoxenia-mark.png`). El logo del header apunta a `/`. Sign-in es un modal Ready X en `/home` (**escritorio con extensión**).

**Smartphone bloqueado:** el login móvil con Ready no completa la firma de forma fiable; no es un cliente soportado hasta que eso se resuelva.

## Local (opcional)

Solo si necesitas depurar en máquina. Producción = Vercel arriba.
