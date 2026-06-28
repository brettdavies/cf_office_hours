# 11. Deployment Architecture

The full, step-by-step deploy runbook is
[`docs/deployment/DEPLOYMENT_INSTRUCTIONS.md`](../deployment/DEPLOYMENT_INSTRUCTIONS.md) — treat it as the source of
truth for commands. This section describes the deployment model.

## 11.1 Overview

The platform deploys as two Cloudflare Workers, driven by Wrangler (locally or from CI). There is no Git-integrated
build pipeline and no separate static-site host: the web app ships as Workers static assets.

- **API Worker** (`cf-office-hours-api`): Hono app bound to a D1 database.
- **Web Worker** (`cf-office-hours-web`): the built React SPA served as static assets, with SPA fallback via
  `not_found_handling`.

## 11.2 Environments

Each Worker defines a `staging` and a `production` environment in its `wrangler.jsonc`. Every environment binds its own
D1 database and sets its own `vars`.

| Environment | API URL                                             | Web URL                                             | D1 database               |
| ----------- | --------------------------------------------------- | --------------------------------------------------- | ------------------------- |
| Staging     | `cf-office-hours-api-staging.<account>.workers.dev` | `cf-office-hours-web-staging.<account>.workers.dev` | `cf-office-hours-staging` |
| Production  | `api.officehours.youcanjustdothings.io`             | `officehours.youcanjustdothings.io`                 | `cf-office-hours`         |

Production routing is declared in `wrangler.jsonc` (the API as a route, the web as a custom domain); Wrangler provisions
the DNS and TLS on first production deploy.

## 11.3 Web Deployment

The web bundle bakes `VITE_API_BASE_URL` at build time, so each environment has its own build-and-deploy script
(`deploy:staging` / `deploy:production` in `apps/web`). Deploying a plain `npm run build` would point the SPA at the
wrong API.

## 11.4 API Deployment

`deploy:staging` / `deploy:production` in `apps/api` run `wrangler deploy --env <env>`. Before the first deploy to an
environment, create its D1 database (`wrangler d1 create`), apply migrations (`wrangler d1 migrations apply …
--remote`), and set `JWT_SECRET` (`wrangler secret put`). Optional secrets (`OPENAI_API_KEY`, `RESEND_API_KEY`,
`EMAIL_FROM`) are set the same way.

## 11.5 Scheduled Jobs

Each environment registers a weekly Cron Trigger (`0 9 * * 1`) in `wrangler.jsonc`. The Worker's `scheduled` handler
re-anchors the demo seed's dates so the upcoming-meetings window never drifts into the past. See
[8.10 Background Jobs & Scheduled Tasks](./8-backend-architecture.md#810-background-jobs--scheduled-tasks).

## 11.6 Rollback

Wrangler retains prior versions of each Worker:

```bash
cd apps/api    # or apps/web
npx wrangler deployments list --env production
npx wrangler rollback --env production [<version-id>]
```

D1 schema changes roll forward with new migrations; there is no automatic schema rollback.

## 11.7 Authentication and Secrets

Deploys authenticate with a Cloudflare API token provided via the `CLOUDFLARE_API_TOKEN` environment variable, never
committed. Runtime secrets are Worker secrets read through the `Env` interface; see
[8.14 Deployment Configuration](./8-backend-architecture.md#814-deployment-configuration).
