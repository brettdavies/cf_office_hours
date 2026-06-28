# 9. Unified Project Structure

## 9.1 Monorepo Layout

CF Office Hours is one npm-workspaces monorepo. Two deployable apps and two shared packages:

```text
cf-office-hours/
├── apps/
│   ├── api/                  # Cloudflare Workers API (Hono + D1)
│   │   ├── src/              # routes, middleware, services, repositories, providers, events, lib
│   │   ├── migrations/       # D1 schema migrations
│   │   ├── seeds/            # generated D1 seed (gitignored)
│   │   └── wrangler.jsonc    # Worker + D1 + cron config
│   └── web/                  # React + Vite SPA
│       ├── worker/           # static-assets Worker entry
│       ├── src/              # components, pages, hooks, services, stores, lib
│       └── wrangler.jsonc    # static-assets Worker config
├── packages/
│   ├── shared/               # Zod schemas + TypeScript types shared by api and web
│   └── config/               # shared ESLint / TypeScript / build configuration
├── scripts/                  # convert_backup_to_d1.py, bump-seed-dates.sql, ...
├── docs/                     # documentation (this tree + archive)
└── package.json              # workspace root
```

## 9.2 Workspaces

The root `package.json` declares the `apps/*` and `packages/*` workspaces and the orchestration scripts.
`packages/shared` is consumed by both apps as `@cf-office-hours/shared`, so request/response types and validation live
in exactly one place.

## 9.3 Shared Configuration

`packages/config` centralizes ESLint, TypeScript, and build configuration. Each workspace extends the shared base so
lint rules, compiler options, and formatting stay consistent across `apps/api`, `apps/web`, and `packages/shared`.

## 9.4 Common Commands

Run from the repository root (see [`README.md`](../../README.md) for the full list):

```bash
npm install            # install all workspaces
npm run dev            # run web and api locally
npm run build          # build all packages
npm run test           # run all tests
npm run lint           # lint all workspaces
npm run type-check     # TypeScript check
npm run generate:api-types  # regenerate web API types from the OpenAPI spec
```

## 9.5 Environment Variables

The platform uses a small, explicit set of variables. There are no third-party identity-provider, external-database, or
data-sync credentials.

| Variable               | Where                             | Purpose                                           |
| ---------------------- | --------------------------------- | ------------------------------------------------- |
| `VITE_API_BASE_URL`    | web build (or `apps/web/.env`)    | API base URL, baked into the bundle at build time |
| `JWT_SECRET`           | API secret (`apps/api/.dev.vars`) | Sign/verify session JWTs                          |
| `OPENAI_API_KEY`       | API secret (optional)             | AI-based matching engine                          |
| `RESEND_API_KEY`       | API secret (optional)             | Email delivery; logs to console when unset        |
| `EMAIL_FROM`           | API secret (optional)             | Sender address for notification email             |
| `CLOUDFLARE_API_TOKEN` | deploy environment                | Authenticates Wrangler deploys; never committed   |

The full runtime binding shape is the `Env` interface in `apps/api/src/types/bindings.ts`.

## 9.6 Continuous Integration

The repository workflow `guard-main-docs.yml` keeps engineering-only docs (this `docs/` tree) off the `main` branch.
Deploys are run with the `deploy:staging` / `deploy:production` workspace scripts (locally or from CI); there is no
automated GitHub Actions deploy pipeline. See [11. Deployment Architecture](./11-deployment-architecture.md).
