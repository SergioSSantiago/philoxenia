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
| `ALCHEMY_API_KEY` | web | tu key de Alchemy |
| `DATABASE_URL` | api | connection string de Neon |
| `JWT_SECRET` | api | string aleatorio largo |
| `CORS_ORIGIN` | api | `https://philoxenia.vercel.app` |
| `NEXT_PUBLIC_API_URL` | web | `https://philoxenia-api.vercel.app` |
| `NEXT_PUBLIC_STARKNET_CHAIN` | web | `mainnet` |
| `NEXT_PUBLIC_STRK20_PRIVACY` | web | `true` |

Neon Postgres: `vercel integration add neon -m region=fra1 --plan free_v3` desde `apps/api`.

## Deploy manual

```bash
cd apps/api && vercel --prod
cd apps/web && vercel --prod
```

Cada push a `main` en GitHub redeploya si Git Integration está activa.

## Local (opcional)

Solo si necesitas depurar en máquina. Producción = Vercel arriba.
