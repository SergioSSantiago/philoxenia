<p align="center">
  <img src="./public/philoxenia-mark.png" alt="Philoxenia" width="72" height="72" />
</p>

# @philoxenia/web

Next.js 15 app for Philoxenia. Brand lockup (name + sleeping-head cameo) lives in `src/components/brand-lockup.tsx` and always links to `/`.

## Production

https://philoxenia-iota.vercel.app

## Scripts (from repo root)

```bash
npm run dev:web
npm run build -w @philoxenia/web
npm run typecheck -w @philoxenia/web
```

## Auth

Sign-in is a modal on `/home`. Signed-out Shell header is **Connect Ready X**. **Desktop:** Chrome + Ready X (Smart Wallet + Private). **iPhone:** Safari can Connect via WalletConnect (`ready://`); **Private Book & pay** needs the Ready X in-app browser. `/auth` redirects to `/home`.

Firefox: no Ready X → no Private Book & pay.

## Layout

| Route | Purpose |
|-------|---------|
| `/` | Landing. Header brand → here |
| `/home` | App home + connect modal if signed out |
| `/profile` | Display name, balances, disconnect |
| `/friends` | Friends; search by Ready X wallet only |
| `/listings/*`, `/bookings/*`, `/connector` | Hosted stays, payments, earnings |
| `/invite/[token]` | Connector invitation |

See [docs/architecture.md](../../docs/architecture.md) and [docs/brand.md](../../docs/brand.md).
