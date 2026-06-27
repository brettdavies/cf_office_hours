# Deployment Instructions

The platform runs entirely on Cloudflare as two Workers:

- **API** (`cf-office-hours-api`): Hono application bound to a Cloudflare D1 (SQLite) database.
- **Web** (`cf-office-hours-web`): the built React SPA served as static assets, with SPA routing via
  `not_found_handling`.

Each Worker defines a `staging` and a `production` environment in its `wrangler.jsonc`. Staging deploys to a
`*.workers.dev` URL; production deploys to custom domains. Deployment is driven by Wrangler (locally or from CI); there
is no Git/Pages integration.

## Prerequisites

- A Cloudflare account with Workers and D1 enabled.
- Node.js 22+ and npm 10+.
- A Cloudflare API token with Workers Scripts, D1, and Workers Routes permissions. Provide it to Wrangler via the
  `CLOUDFLARE_API_TOKEN` environment variable; never commit it.
- DNS for `youcanjustdothings.io` managed in the same Cloudflare account (for the production custom domains).

```bash
# Wrangler reads CLOUDFLARE_API_TOKEN from the environment for headless deploys.
export CLOUDFLARE_API_TOKEN="<token>"
```

## One-Time Setup

### 1. Create the D1 database

```bash
cd apps/api
npx wrangler d1 create cf-office-hours
```

Copy the returned `database_id` into the matching `d1_databases` binding in `apps/api/wrangler.jsonc` for the target
environment.

### 2. Apply migrations and seed

```bash
cd apps/api
npx wrangler d1 migrations apply cf-office-hours --env staging --remote
# Optional: load seed data (the seed file is generated and gitignored; see scripts/convert_backup_to_d1.py)
npx wrangler d1 execute cf-office-hours --env staging --remote --file=seeds/d1_seed.sql
```

Repeat with `--env production` against the production database.

The seed is self-correcting: the generated file ends with a footer that shapes the bookings and anchors all dates to
load time, so no separate fix step is needed. After deploy, the API Worker's weekly Cron Trigger (`0 9 * * 1`,
configured in `wrangler.jsonc`) re-runs `scripts/bump-seed-dates.sql` against staging and production so the
upcoming-meetings window never drifts into the past.

### 3. Set secrets

The API signs and verifies its session JWT with `JWT_SECRET`. Set it per environment without printing it:

```bash
cd apps/api
openssl rand -hex 32 | npx wrangler secret put JWT_SECRET --env staging
openssl rand -hex 32 | npx wrangler secret put JWT_SECRET --env production
```

### 4. Custom domains (production)

Production routes are declared in `wrangler.jsonc`:

- API: `api.officehours.youcanjustdothings.io` (route)
- Web: `officehours.youcanjustdothings.io` (custom domain)

Wrangler provisions the DNS records and TLS certificates on first production deploy.

## Deploying

The web bundle bakes `VITE_API_BASE_URL` at build time, so each environment has its own build-and-deploy script.

```bash
# Staging
npm run deploy:staging --workspace=apps/api
npm run deploy:staging --workspace=apps/web

# Production
npm run deploy:production --workspace=apps/api
npm run deploy:production --workspace=apps/web
```

Resulting URLs:

| Environment | API                                                         | Web                                                         |
| ----------- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| Staging     | `https://cf-office-hours-api-staging.<account>.workers.dev` | `https://cf-office-hours-web-staging.<account>.workers.dev` |
| Production  | `https://api.officehours.youcanjustdothings.io`             | `https://officehours.youcanjustdothings.io`                 |

Replace `<account>` with your Workers `workers.dev` subdomain.

## Verification

After deploying:

1. **API health:** `curl https://<api-url>/health` returns `{ "status": "ok", ... }`.
2. **Web loads:** open the web URL; the login page renders with the three role buttons.
3. **Demo login:** click a role button; the network tab shows `POST /v1/auth/demo-login` returning a JWT, and the app
   lands on the dashboard.
4. **Authenticated data:** a protected call (e.g. `GET /v1/availability`) succeeds with the `Authorization: Bearer`
   header and no CORS errors.

## Rollback

Wrangler keeps prior versions of each Worker. To roll back:

```bash
cd apps/api   # or apps/web
npx wrangler deployments list --env production
npx wrangler rollback --env production [<version-id>]
```

## Troubleshooting

### CORS error: origin not allowed

The API allows configured static origins plus any `*.workers.dev` origin (`apps/api/src/index.ts`). Confirm the web
origin matches an allowed origin and that the production web domain is included.

### 401 on every authenticated request

`JWT_SECRET` differs between the token issuer and verifier, or is unset. Re-run `wrangler secret put JWT_SECRET` for the
environment and redeploy the API.

### Web calls the wrong API

`VITE_API_BASE_URL` is baked at build time. Confirm you deployed with the matching `deploy:staging` /
`deploy:production` script rather than a plain `npm run build`.

### D1 errors on first request

Migrations were not applied to the remote database for that environment. Re-run `wrangler d1 migrations apply
cf-office-hours --env <env> --remote`.

## Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
