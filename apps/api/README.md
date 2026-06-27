# CF Office Hours API

Hono-based REST API for the Office Hours platform, running on Cloudflare Workers with a Cloudflare D1 (SQLite) database.

## Quick Start

### Prerequisites

- Node.js 22+ and npm 10+
- No Cloudflare account required for local development (Wrangler runs a local D1)

### Local Development

```bash
# Install dependencies (from project root)
npm install

# Apply migrations and seed a local D1 database. The seed is self-correcting: its
# footer thins bookings to a realistic per-mentee shape, sets the status mix, and
# anchors every date to load time, so no extra steps are needed.
cd apps/api
npx wrangler d1 migrations apply cf-office-hours --local
npx wrangler d1 execute cf-office-hours --local --file=seeds/d1_seed.sql

# Start the local development server
npm run dev
```

The API is available at `http://localhost:8787`. The local server auto-reloads on code changes.

## Authentication

The API issues its own session JWT (HS256, signed with `JWT_SECRET` via `jose`) and verifies it locally on each request.
There is no signup or user creation: the database holds a fixed allowlist of demo users.

**POST /v1/auth/demo-login** — body `{ "role": "mentee" | "mentor" | "coordinator" }`. Selects a random existing user
with that role and returns a signed JWT. The SPA's "Login as …" buttons call this endpoint.

Protected routes require an `Authorization: Bearer <jwt>` header. Missing or invalid tokens return `401`.

## Available Endpoints

### Health Check

**GET /health** — returns API health status. No authentication required.

```json
{ "status": "ok", "timestamp": "2025-10-05T12:34:56.789Z" }
```

```bash
curl http://localhost:8787/health
```

### OpenAPI

The full route surface is documented via OpenAPI at `GET /api/openapi.json` (Swagger UI mounted alongside). Frontend
types are generated from this spec with `npm run generate:api-types` (root).

### Error Responses

All errors return a structured JSON body:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "timestamp": "2025-10-05T12:34:56.789Z"
  }
}
```

Common codes: `NOT_FOUND` (404), `UNAUTHORIZED` (401), `INTERNAL_ERROR` (500).

## Environment Variables

The API reads one secret at runtime. For local development, copy the example file and set a value:

```bash
cd apps/api
cp .dev.vars.example .dev.vars
```

```bash
# apps/api/.dev.vars (gitignored, never committed)
JWT_SECRET=your-local-jwt-secret
```

| Variable     | Location         | Description                                             |
| ------------ | ---------------- | ------------------------------------------------------- |
| `JWT_SECRET` | `.dev.vars`      | Secret used to sign/verify session JWTs (NOT committed) |
| `DB`         | `wrangler.jsonc` | D1 database binding                                     |

For deployed environments, set the secret with `npx wrangler secret put JWT_SECRET --env <staging|production>`.

## Testing

```bash
npm run test         # Run all tests once
npm run test:watch   # Run tests in watch mode
```

Tests run against an in-memory D1 shim backed by `node:sqlite` (Node 22+), so no Wrangler or remote database is needed.

## Project Structure

```text
apps/api/
├── src/
│   ├── index.ts                # Hono app entry point + scheduled (cron) handler
│   ├── seed-date-bump.ts       # Weekly seed date re-anchor (runs bump-seed-dates.sql)
│   ├── routes/                 # API endpoints (incl. auth demo-login)
│   ├── middleware/
│   │   ├── error-handler.ts    # Global error handling
│   │   └── auth.ts             # JWT verification middleware
│   ├── repositories/           # D1 data access
│   ├── services/               # Business logic
│   ├── providers/              # Pluggable matching / calendar / notification engines
│   ├── events/                 # Event-driven match recalculation triggers
│   └── lib/
│       ├── db.ts               # D1 binding accessor
│       ├── jwt.ts              # Sign / verify session JWTs
│       └── d1-utils.ts         # Shared D1 helpers
├── migrations/                 # D1 (SQLite) schema migrations
├── seeds/                      # D1 seed data (generated; gitignored)
├── wrangler.jsonc              # Cloudflare Workers + D1 configuration
├── .dev.vars.example           # Environment variables template
└── package.json
```

## Deployment

```bash
npm run deploy:staging       # Deploy to the staging environment
npm run deploy:production     # Deploy to production
```

Deploys authenticate with a Cloudflare API token supplied via the environment (`CLOUDFLARE_API_TOKEN`); the token is
never committed. See the repository deployment docs for the full procedure.

Each environment registers a weekly Cron Trigger (`0 9 * * 1`, configured in `wrangler.jsonc`). Its `scheduled` handler
re-anchors the demo seed's dates onto the current date by running `scripts/bump-seed-dates.sql`, so the
upcoming-meetings window never drifts into the past.

## Technology Stack

- **Framework:** Hono 4.x (`@hono/zod-openapi`)
- **Runtime:** Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite)
- **Auth:** Worker-issued session JWT (`jose`)
- **Testing:** Vitest 3.x
- **TypeScript:** 5.7.x

## Additional Resources

- [Hono Documentation](https://hono.dev/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
