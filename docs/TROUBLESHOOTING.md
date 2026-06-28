# Troubleshooting Guide

Quick reference for common local development issues and their fixes. The platform runs as two Cloudflare Workers (API +
web) on a Cloudflare D1 database; for setup details see [`apps/api/README.md`](../apps/api/README.md) and
[`apps/web/README.md`](../apps/web/README.md).

## Setup Issues

### API not reachable / CORS errors

**Symptoms:** browser console shows CORS errors, API requests fail, or a page is stuck loading.

1. **Confirm the API is running on port 8787.**

   ```bash
   lsof -ti:8787   # should print a process id
   ```

2. **Check the dev port** in `apps/api/wrangler.jsonc` (`dev.port` is `8787`).

3. **Restart the API.**

   ```bash
   pkill -f "wrangler dev"
   npm run dev:api
   ```

4. **Check the CORS allowlist.** The API allows configured app origins plus any `*.workers.dev` origin
   (`apps/api/src/index.ts`). Confirm the web origin is allowed.

### Double `/v1` in request URLs (e.g. `/v1/v1/users/me`)

**Cause:** `VITE_API_BASE_URL` includes a `/v1` suffix, but the client already adds `/v1` to every path.

**Fix:** set the base URL without the suffix and restart the web dev server.

```bash
# apps/web/.env
VITE_API_BASE_URL=http://127.0.0.1:8787   # no /v1 suffix
```

## Authentication Issues

### "Login as …" does nothing / network error

**Cause:** the API is not running, or `VITE_API_BASE_URL` points at the wrong host.

**Fix:** start the API (`npm run dev:api`) and confirm `VITE_API_BASE_URL` matches it (`http://127.0.0.1:8787`).

### Demo login returns 404 (`No <role> accounts are available`)

**Cause:** the local D1 database has no users of that role — the seed was not loaded.

**Fix:** apply migrations and load the seed (see [Database Issues](#database-issues)).

### 401 on every authenticated request

**Cause:** `JWT_SECRET` is unset, or differs between the token issuer and verifier.

**Fix:** set `JWT_SECRET` for local dev in `apps/api/.dev.vars`; for deployed environments run `npx wrangler secret put
JWT_SECRET --env <staging|production>` and redeploy.

### 403 / sudden logout

**Cause:** the session token's user is no longer present (or the role is insufficient for the route). The web client
treats a `403` as an expired session and redirects to `/auth/login`.

**Fix:** sign in again from the login page.

## Database Issues

### Apply migrations and seed a local database

```bash
cd apps/api
npx wrangler d1 migrations apply cf-office-hours --local
npx wrangler d1 execute cf-office-hours --local --file=seeds/d1_seed.sql
```

The seed file is generated and gitignored (it contains demo PII). Regenerate it with `scripts/convert_backup_to_d1.py` —
see [`apps/api/seeds/README.md`](../apps/api/seeds/README.md).

### Seed loads but dates look stale

The seed is self-correcting (its footer anchors dates to load time), and the weekly Cron Trigger re-anchors deployed
data. For a long-running local database, re-run the `wrangler d1 execute … --file=seeds/d1_seed.sql` step to refresh.

### `D1_ERROR` / "no such table" on first request

**Cause:** migrations were not applied to that database.

**Fix:** re-run `npx wrangler d1 migrations apply cf-office-hours` (`--local`, or `--env <env> --remote` for a deployed
database).

## Development Workflow Issues

### Port already in use

```bash
lsof -ti:8787   # API
lsof -ti:3000   # web
lsof -ti:8787 | xargs kill -9
```

### Type errors after a schema or API change

```bash
npm run generate:api-types     # regenerate web types from the OpenAPI spec
npm run type-check
```

### Module not found / stale build

```bash
npm run clean
npm install
```

## Performance Issues

- **API timing:** stream structured request logs with `npm run tail --workspace=apps/api` (`wrangler tail`); each
  completion log includes `duration`.
- **Bundle size:** `npm run build:web`, then inspect `apps/web/dist`.

## Getting Help

1. Check recent changes: `git log --oneline -10`.
2. Gather the full error (and stack), reproduction steps, and your Node version.
3. Search the project issues and the [architecture docs](architecture/index.md).

## Related Documentation

- [Development Workflow](architecture/10-development-workflow.md) — local setup and the testing loop.
- [Data Models](architecture/4-data-models.md) — the D1 schema.
- [Deployment Instructions](deployment/DEPLOYMENT_INSTRUCTIONS.md) — deploying the Workers.
