<p align="center">
  <img src="apps/web/public/philoxenia-mark.png" alt="Philoxenia" width="72" height="72" />
</p>

# Contributing

Thank you for contributing to Philoxenia.

## Prerequisites

- Node.js 20+
- Docker (PostgreSQL)
- Scarb 2.12+ and Starknet Foundry (contracts)
- Ready X for wallet testing

## Setup

```bash
git clone <repo-url> philoxenia
cd philoxenia
npm install
docker compose up -d
npm run db:migrate -w @philoxenia/api
```

Create a `.env` at the repo root (never commit it). Variables: [docs/development.md](./docs/development.md).

Optional demo data:

```bash
npm run db:seed -w @philoxenia/api
```

## Development

```bash
npm run dev          # API :4000 + Web :3000
npm run dev:api
npm run dev:web
```

## Tests

```bash
npm test                              # API unit tests
npm run test:contracts                # Cairo tests (from contracts/)
npm run typecheck
```

Contract tests only:

```bash
cd contracts && scarb test
```

## Project structure

```
apps/api/          Fastify REST API, Drizzle ORM, PostgreSQL
apps/web/          Next.js 15 frontend
packages/shared/   Shared TypeScript types
contracts/         Cairo BookingEscrow + tests
docs/              Detailed documentation
```

## Code guidelines

- Match existing patterns in each package (Fastify routes + Zod validation in API; client components + starknet-react in web).
- Keep changes focused — Philoxenia is an MVP; avoid scope creep (no public marketplace, no protocol token).
- Do not invent STRK20 APIs — follow [official Starknet Privacy docs](https://docs.starknet.io/build/starknet-privacy) and [STRK20 by Example](https://strk20-by-example.org/).
- Be honest in docs and UI about what is implemented vs planned (especially privacy and on-chain integration).
- Do not commit secrets (`.env`, keys, credentials).

## Pull requests

1. Fork and create a feature branch.
2. Run `npm test` and `npm run typecheck` before opening a PR.
3. Describe what changed and whether it affects on-chain, off-chain, or privacy behavior.
4. Link related issues if applicable.

## Documentation

When changing behavior, update the relevant file under `docs/` or the root `ARCHITECTURE.md`, `PRIVACY.md`, or `SECURITY.md`. Brand and header rules live in [docs/brand.md](./docs/brand.md).

## License

Contributions are accepted under the project MIT license.
