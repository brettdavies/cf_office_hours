# 8. Backend Architecture

The backend is a single Cloudflare Worker that serves the Office Hours REST API. It is built with Hono
(`@hono/zod-openapi`) and reads and writes a Cloudflare D1 (SQLite) database through the Worker's `DB` binding. There is
no separate application server, no ORM, and no external authentication service: the Worker issues and verifies its own
session JWT and talks to D1 directly with prepared statements.

**Stack at a glance:**

- **Runtime:** Cloudflare Workers (`nodejs_compat`)
- **Framework:** Hono 4.x with `@hono/zod-openapi` (OpenAPI-first routing and validation)
- **Database:** Cloudflare D1 (SQLite), accessed via the `DB` binding
- **Auth:** Worker-issued session JWT (HS256 via `jose`), verified locally on every request
- **AI:** OpenAI (optional) for one of the pluggable matching engines
- **Email:** Resend (optional; falls back to console logging when unconfigured)

**Request flow:** `index.ts` (entry + global middleware) → route handler (validates input) → service (business logic) →
repository (D1 queries) → D1. Errors thrown anywhere in that chain are caught by a single global error handler and
returned as a structured JSON body (see [15. Error Handling Strategy](./15-error-handling-strategy.md)).

## 8.1 Application Structure

```text
apps/api/
├── src/
│   ├── index.ts                 # Entry point: Hono app, middleware, routes, scheduled handler
│   ├── seed-date-bump.ts        # Cron handler logic (runs scripts/bump-seed-dates.sql)
│   ├── routes/                  # OpenAPI route definitions (auth, users, availability, bookings, matching)
│   ├── middleware/              # auth, error-handler, logging
│   ├── services/                # Business logic (booking, user, availability, matching, notification, tier-override)
│   ├── repositories/            # D1 data access (booking, user, availability, tier-override + BaseRepository)
│   ├── providers/
│   │   └── matching/            # Pluggable matching engines (interface, base, tag-based, ai-based)
│   ├── events/                  # Fire-and-forget event handlers (match recalculation)
│   ├── lib/                     # db, jwt, d1-utils, errors, base-repository
│   ├── types/                   # bindings (Env), context (Variables), ambient declarations
│   └── test/                    # Vitest fixtures, helpers (node:sqlite D1 shim), unit + integration tests
├── migrations/                  # D1 schema migrations
├── seeds/                       # Generated D1 seed (gitignored; see scripts/convert_backup_to_d1.py)
├── wrangler.jsonc               # Worker + D1 + cron configuration
└── package.json
```

The layering is strict: routes never touch D1, repositories never contain business rules, and services never reference
HTTP concerns (no access to `Context`, headers, or status codes — they throw `AppError` instead).

## 8.2 Entry Point & App Initialization

`src/index.ts` creates one `OpenAPIHono` instance typed with the Worker `Bindings` and Hono `Variables`, registers
global middleware, mounts the API, and exports the Worker handler.

- **Global middleware** (applied in order): Hono `logger()`, the custom `loggingMiddleware` (structured request/response
  logs), `cors()` (an origin allowlist plus any `*.workers.dev` origin for staging), and `prettyJSON()`.
- **Health and test routes:** `GET /health` (no auth) returns `{ status, timestamp }`; `GET /protected` (auth required)
  echoes the authenticated user.
- **API mount:** `app.route('/v1', routes)` mounts every resource group under `/v1`.
- **Documentation:** the OpenAPI 3.1 spec is served at `/api/openapi.json` with Swagger UI at `/api/docs`. The web app
  generates its API types from this spec.
- **Error handling:** `app.onError(errorHandler)` and a JSON `notFound` handler are registered last.

The app is exported two ways. The Hono instance is a **named** export (`export const app`) so integration tests can call
`app.request(...)`. The **default** export is the Worker handler object:

```ts
export default { fetch: app.fetch, scheduled };
```

`scheduled` is the Cron Trigger handler (see [8.10](#810-background-jobs--scheduled-tasks)); `fetch` serves HTTP.

## 8.3 Routing Layer

Each file under `src/routes/` defines its endpoints with `createRoute()` and Zod schemas, so the request/response
contract and the OpenAPI spec come from one source. Handlers read validated input with `c.req.valid('json' | 'query' |
'param')`; a Zod failure throws and is rendered as a `400 VALIDATION_ERROR` by the global handler. Authentication and
role checks are applied per route via the middleware in [8.4](#84-middleware-layer).

| Group        | File              | Endpoints                                                                                    | Access             |
| ------------ | ----------------- | -------------------------------------------------------------------------------------------- | ------------------ |
| Auth         | `auth.ts`         | `POST /v1/auth/demo-login`                                                                   | Public             |
| Users        | `users.ts`        | `GET /v1/users/me`, `PUT /v1/users/me`, `GET /v1/users`, `GET /v1/users/{id}`                | Auth               |
| Availability | `availability.ts` | `GET /v1/availability`, `POST /v1/availability`                                              | Mentor             |
| Bookings     | `bookings.ts`     | `POST /v1/bookings`, `GET /v1/bookings/my-bookings`, `GET /v1/bookings/overrides/pending`    | Auth / Coordinator |
| Matching     | `matching.ts`     | `GET /v1/matching/algorithms`, `POST /v1/matching/find-matches`, `POST /v1/matching/explain` | Coordinator        |

`PUT /v1/users/me` additionally fires a fire-and-forget match recalculation after the profile update (see
[8.6](#86-matching-providers-and-events)).

## 8.4 Middleware Layer

| Middleware                    | File                          | Responsibility                               |
| ----------------------------- | ----------------------------- | -------------------------------------------- |
| `requireAuth` / `requireRole` | `middleware/auth.ts`          | Verify the session JWT and gate by role      |
| `errorHandler`                | `middleware/error-handler.ts` | Translate thrown errors into structured JSON |
| `loggingMiddleware`           | `middleware/logging.ts`       | Emit structured request/response logs        |

**Authentication.** `requireAuth` extracts the `Authorization: Bearer <jwt>` token, verifies it with `verifyJwt()`
(`jose`, HS256, signed with `JWT_SECRET`), confirms the token's email still maps to a non-deleted row in `users`, and
sets `c.set('user', { id, email, role })`. Missing or invalid tokens produce `401`; a token whose email is not in the
allowlist produces `403`. `requireRole('mentor' | 'coordinator' | …)` chains after `requireAuth` and enforces the
caller's role, throwing `403` with the required-vs-actual role in `details`.

Error handling and logging are covered in [15. Error Handling Strategy](./15-error-handling-strategy.md).

## 8.5 Service and Repository Layers

**Services** (`src/services/`) hold the business logic. Each is constructed with the Worker `Env`, instantiates the
repositories it needs, and throws `AppError` on any failure. Services return plain typed objects and never touch HTTP.

| Service                    | Responsibility                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `booking.service.ts`       | Validate a slot is free, create the booking and mark the slot booked, assemble "my bookings" |
| `user.service.ts`          | Read the current profile, update profile fields, list users, fetch a public profile          |
| `availability.service.ts`  | Create mentor availability blocks (mentor-only) and read available slots                     |
| `matching.service.ts`      | Read precomputed recommendations from `user_match_cache` and filter/sort them                |
| `notification.service.ts`  | Format booking-confirmation email (logs to console until Resend is wired)                    |
| `tier-override.service.ts` | Read pending tier-override requests, dropping expired ones                                   |

**Repositories** (`src/repositories/`) are the only layer that touches D1. They extend `BaseRepository` (which resolves
the `DB` handle through `getDb(env)`) and run raw SQL with the D1 prepared-statement API:

```ts
const row = await this.db
  .prepare('SELECT * FROM time_slots WHERE id = ?')
  .bind(slotId)
  .first<TimeSlotRow>();
```

Multi-statement writes (for example, inserting a booking and flipping `time_slots.is_booked`) run as a single
`this.db.batch([...])` so they commit atomically. Helpers in `lib/d1-utils.ts` bridge SQLite's storage conventions:
`toInt`/`toBool` for the 0/1 boolean columns, `parseJson`/`stringifyJson` for text-encoded JSON, and `nowIso`/`newId`
for timestamps and identifiers.

## 8.6 Matching Providers and Events

### 8.6.1 Pluggable matching engines

Match **calculation** is polymorphic; match **retrieval** is not. Engines under `src/providers/matching/` implement
`IMatchingEngine` (`recalculateMatches`, `recalculateAllMatches`, `getAlgorithmVersion`) and write their results, tagged
with an `algorithm_version`, into the `user_match_cache` table. `BaseMatchingEngine` provides the shared machinery:
chunked batch processing, an atomic cache write (delete-then-insert per user in a transaction), candidate fetching by
opposite role, and a 90-day dormancy cutoff.

| Engine                     | `algorithm_version` | Scoring                                                                     |
| -------------------------- | ------------------- | --------------------------------------------------------------------------- |
| `TagBasedMatchingEngineV1` | `tag-based-v1`      | Tag overlap only (0–60): shared industries, technologies, stages            |
| `AiBasedMatchingEngineV1`  | `ai-based-v1`       | OpenAI scores the mentor's bio against the mentee's company profile (0–100) |

`MatchingService` reads from `user_match_cache` and filters by `algorithm_version`, so the read path is agnostic to
which engine produced a row. Cache scores are stored on a 0–100 scale.

### 8.6.2 Events

`src/events/matching-triggers.ts` holds fire-and-forget handlers that refresh a user's cached matches when their inputs
change. Each is wrapped in `withErrorHandling()` and invoked without blocking the request (errors are logged, never
surfaced to the caller):

| Handler                            | Fires when                                      | Effect                                      |
| ---------------------------------- | ----------------------------------------------- | ------------------------------------------- |
| `handleUserProfileUpdate`          | A profile changes (wired to `PUT /v1/users/me`) | Recalculate that user's matches             |
| `handleUserTagsChange`             | A user's tags change                            | Recalculate that user's matches             |
| `handlePortfolioCompanyTagsChange` | A company's tags change                         | Recalculate matches for every linked mentee |
| `handleReputationTierChange`       | A user's reputation tier changes                | Recalculate that user's matches             |

Recalculation currently uses `TagBasedMatchingEngineV1`. The AI engine is exercised offline through the
`populate-match-cache` script.

## 8.7 Library Utilities

| Module                   | Provides                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `lib/db.ts`              | `getDb(env)` — returns `env.DB`, throwing at once if the binding is missing (fail-fast) |
| `lib/jwt.ts`             | `signJwt` / `verifyJwt` — `jose` HS256 session tokens (12h default TTL)                 |
| `lib/d1-utils.ts`        | `nowIso`, `newId`, `toInt`, `toBool`, `parseJson`, `stringifyJson`                      |
| `lib/errors.ts`          | `AppError(statusCode, message, code, details?)` — the one error type services throw     |
| `lib/base-repository.ts` | `BaseRepository` — holds the resolved `DB` handle for repositories                      |

## 8.8 Data Model

The schema lives in `migrations/0001_initial_schema.sql` and is applied with `wrangler d1 migrations apply`. It defines
eleven tables and two read views. D1 does not enforce foreign keys, so referential integrity is maintained in the
application layer; authorization is likewise application-only (no row-level security, no stored procedures).

**Tables:** `portfolio_companies`, `users`, `user_profiles`, `user_urls`, `taxonomy`, `entity_tags`, `availability`,
`time_slots`, `bookings`, `user_match_cache`, `tier_override_requests`.

**Conventions:**

- UUIDs and timestamps are `TEXT` (ISO-8601 UTC); booleans are `INTEGER` (0/1); JSON is `TEXT`.
- Most tables carry a soft-delete (`deleted_at` / `deleted_by`) and an audit trail (`created_at` / `created_by` /
  `updated_at` / `updated_by`). `time_slots` is the exception: it has `created_at` but **no `updated_at`**.
- `users.airtable_record_id` is an opaque external record id carried in the schema — it labels each row's origin in the
  seed data set. It is `UNIQUE NOT NULL`, indexed, and read by the user repository and matching service, but there is no
  live Airtable integration (no API client, webhook, or sync job).

**Views:** `algorithm_versions` (distinct algorithm versions present in the cache) and `distinct_users_with_scores` (the
flattened set of users appearing in `user_match_cache`).

## 8.9 Seed Data

Demo data is generated, not hand-written. `scripts/convert_backup_to_d1.py` converts a plain-text Postgres dump into
`apps/api/seeds/d1_seed.sql` (gitignored; contains scrubbed demo identities). The generator appends a **self-correcting
footer** so a freshly loaded database is immediately realistic with no manual fixes:

1. A demand-driven booking shape (3–8 bookings per mentee, ~20% confirmed / ~80% pending).
2. `scripts/bump-seed-dates.sql`, which anchors every timestamp to load time.

The same date-bump script is run weekly by the Worker Cron Trigger (next section). See `apps/api/seeds/README.md` and
the [0.20 story](../archive/stories/0.20.story.md) for the intended shape.

## 8.10 Background Jobs & Scheduled Tasks

The Worker uses exactly **one** Cloudflare Cron Trigger, and no Durable Objects. Several behaviors that a backend might
schedule are instead computed synchronously or at read time; this section records what actually runs.

### 8.10.1 Cron Trigger: weekly seed date bump

`wrangler.jsonc` registers `crons: ["0 9 * * 1"]` (Mondays 09:00 UTC) on both `staging` and `production`. The
`scheduled` handler in `index.ts` calls `runSeedDateBump(env)` (`src/seed-date-bump.ts`), which loads
`scripts/bump-seed-dates.sql` (imported as a text module), strips comments, splits it into statements, and runs them as
one `env.DB.batch()` — a single transaction, so the intermediate `_reanchor_shift` table persists across statements. The
job re-anchors the demo seed's dates onto the current date so the upcoming-meetings window never drifts into the past.
It operates only on demo data; it is not part of any user-facing flow.

### 8.10.2 Behaviors handled without a scheduler

| Behavior                  | How it works today                                                                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Time-slot generation      | Synchronous: `availability.repository.ts` generates slots in `slot_duration_minutes` increments and `batch()`-inserts them when an availability block is created |
| Match-cache recalculation | Event-driven, fire-and-forget (see [8.6.2](#862-events))                                                                                                         |
| Tier-override expiry      | Read-time filter: `tier-override.service.ts` hides requests whose `expires_at` has passed (status is not rewritten)                                              |
| Dormant-user exclusion    | Match-time filter: `BaseMatchingEngine` excludes soft-deleted users and applies a 90-day cutoff during recalculation                                             |

### 8.10.3 Designed but not implemented

Pending-booking auto-expiration is part of the schema design — `bookings.status` includes `expired` — but no job or
request-time logic transitions a stale `pending` booking to `expired`. If automatic expiry is required, the options are
a second Cron Trigger that batches the transition, or read-time evaluation; there is currently no `last_activity_at`
column, so true dormancy tracking would also require a schema change.

## 8.11 Testing Strategy

Tests run under Vitest with no Wrangler or remote database. `src/test/helpers/d1.ts` provides an in-memory D1 shim
backed by Node's `node:sqlite` (`DatabaseSync`, Node 22+) that implements the slice of the D1 API the code uses
(`prepare`, `bind`, `all`, `first`, `run`, `batch`, `exec`) and loads the real schema from
`migrations/0001_initial_schema.sql`, so tests exercise real SQL rather than mocks. Foreign keys are disabled in the
shim to allow unconstrained fixture insert order.

- **Unit tests** (`src/test/unit/`) cover services and the matching engines.
- **Integration tests** (`src/test/integration/`) drive routes through `app.request(...)` and exercise the event
  handlers.
- `vitest.config.ts` adds a small plugin that loads `.sql` imports as text, matching how Wrangler (default Text module
  rule) and the esbuild build (`--loader:.sql=text`) treat them.

## 8.12 Performance Considerations

- **Precomputed matches.** Recommendations are computed in the background and read straight from `user_match_cache`, so
  the request path is a single indexed query rather than a live scoring pass.
- **Batched writes.** Related writes use `env.DB.batch()` to commit atomically in one round trip; the seed generator
  caps multi-row inserts at 10 rows per statement to stay under D1's per-statement size limit.
- **Local verification.** The JWT is verified in-Worker with `jose`; there is no per-request call to an external auth
  service.

## 8.13 Security

- **Session tokens.** HS256 JWTs signed and verified with `JWT_SECRET`; no token is trusted unless its email still maps
  to a live `users` row.
- **Authorization.** Enforced entirely in middleware (`requireAuth` + `requireRole`) and service checks; D1 has no
  row-level security.
- **CORS.** Restricted to the known app origins plus `*.workers.dev` for staging.
- **Secrets.** Held as Worker secrets, never committed (see [8.14](#814-deployment-configuration)).
- **No external identity provider.** The demo login selects an allowlisted user by role; there is no signup or
  credential storage.

## 8.14 Deployment Configuration

Configuration is `apps/api/wrangler.jsonc` (JSONC). The Worker defines a development context plus `staging` and
`production` environments; each binds its own D1 database and sets environment-specific `vars`.

| Aspect        | Development               | Staging                       | Production                                |
| ------------- | ------------------------- | ----------------------------- | ----------------------------------------- |
| Worker name   | `cf-office-hours-api`     | `cf-office-hours-api-staging` | `cf-office-hours-api`                     |
| `DB` database | `cf-office-hours` (local) | `cf-office-hours-staging`     | `cf-office-hours`                         |
| Routing       | local (`:8787`)           | `workers.dev`                 | `api.officehours.youcanjustdothings.io/*` |
| Cron          | —                         | `0 9 * * 1`                   | `0 9 * * 1`                               |

Common settings: `main` is `src/index.ts`, `compatibility_date` `2026-06-01`, `compatibility_flags` `["nodejs_compat"]`.

**Secrets** (set per environment with `wrangler secret put`, read through the `Env` interface in `types/bindings.ts`):

| Secret           | Required | Purpose                                               |
| ---------------- | -------- | ----------------------------------------------------- |
| `JWT_SECRET`     | Yes      | Sign/verify session JWTs                              |
| `OPENAI_API_KEY` | No       | AI matching engine; absent → AI scoring degrades to 0 |
| `RESEND_API_KEY` | No       | Email delivery; absent → emails log to console        |
| `EMAIL_FROM`     | No       | Sender address for notification email                 |

`CACHE` and `RATE_LIMIT` KV namespaces are declared optional on `Env` for future use. There are no external
identity-provider, Google, Microsoft, or Airtable secrets.

**Scripts** (`package.json`): `dev` (`wrangler dev`), `build` (`esbuild … --loader:.sql=text`), `deploy:staging` /
`deploy:production` (`wrangler deploy --env …`), `test` (`vitest run`), `lint` (`eslint`), `tail` (`wrangler tail`).
Wrangler is pinned to `4.102.0`.

**Pipeline.** Deploys are run manually with the `deploy:*` scripts; there is no GitHub Actions deploy workflow. The only
repository workflow is `guard-main-docs.yml`, which keeps engineering-only docs off `main`. The weekly date bump runs
from the Worker Cron Trigger above rather than a scheduled workflow.
