# 10. Development Workflow

The authoritative setup and run steps live in [`apps/api/README.md`](../../apps/api/README.md) and
[`apps/web/README.md`](../../apps/web/README.md). This section summarizes the day-to-day loop and links out rather than
duplicating commands.

## 10.1 Initial Setup

```bash
npm install                                   # from the repository root

# API: apply migrations and seed a local D1 database
cd apps/api
npx wrangler d1 migrations apply cf-office-hours --local
npx wrangler d1 execute cf-office-hours --local --file=seeds/d1_seed.sql
cp .dev.vars.example .dev.vars                # set JWT_SECRET for local dev
```

No Cloudflare account is needed for local development — Wrangler runs a local D1. The seed file is generated and
gitignored; regenerate it with `scripts/convert_backup_to_d1.py` (see
[`apps/api/seeds/README.md`](../../apps/api/seeds/README.md)).

## 10.2 Local Development

```bash
npm run dev          # run web and api together
npm run dev:api      # API only (wrangler dev, local D1, port 8787)
npm run dev:web      # web only (Vite, port 3000)
```

The web app expects `VITE_API_BASE_URL` to point at the local API (`http://localhost:8787` by default).

## 10.3 Database Migrations

Schema changes are SQL migrations under `apps/api/migrations/`. Apply them with `wrangler d1 migrations apply
cf-office-hours` (`--local` for dev, `--env <env> --remote` for deployed databases). The schema is the source of truth
for the data model (see [4. Data Models](./4-data-models.md)). After a schema change that affects API shapes, regenerate
the web types with `npm run generate:api-types`.

## 10.4 Testing

```bash
npm run test         # all workspaces
npm run test:api     # API (Vitest; in-memory node:sqlite D1 shim)
npm run test:web     # web (Vitest + Testing Library)
npm run test:e2e     # Playwright end-to-end
```

API tests run against a real-SQL D1 shim with no Wrangler or remote database. See
[13. Testing Strategy](./13-testing-strategy.md).

## 10.5 Code Quality

```bash
npm run lint         # ESLint
npm run format       # Prettier
npm run type-check   # TypeScript
```

Coding conventions are documented in [14. Coding Standards](./14-coding-standards.md).

## 10.6 Git and Pull Requests

Work happens on feature branches off `dev`; `dev` and `main` receive code only via pull request. The `main` branch is
the consumer-facing surface and excludes the engineering docs under `docs/` (enforced by `guard-main-docs.yml`). Keep
commits scoped and use Conventional Commit messages.

## 10.7 Troubleshooting

Common local issues — ports, CORS, double `/v1`, auth/JWT, D1 — and their fixes are collected in
[`docs/TROUBLESHOOTING.md`](../TROUBLESHOOTING.md).
