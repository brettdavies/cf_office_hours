# 12. Security and Performance

## 12.1 Security Model

Authorization is enforced entirely in the application layer. D1 has no row-level security, triggers, or stored
procedures, so every access rule lives in middleware and services.

### 12.1.1 Authentication

- Sessions are HS256 JWTs signed and verified in the Worker with `jose`, keyed by the `JWT_SECRET` secret
  (`apps/api/src/lib/jwt.ts`). Verification is local — no per-request call to an external identity provider.
- `requireAuth` (`middleware/auth.ts`) extracts the `Authorization: Bearer` token, verifies it, and confirms the token's
  email still maps to a non-deleted `users` row before setting the request user. Missing/invalid tokens → `401`.
- Sign-in is demo login only (`POST /v1/auth/demo-login`): no signup and no credential storage.

### 12.1.2 Authorization

- `requireRole('mentor' | 'coordinator' | …)` chains after `requireAuth` and rejects mismatched roles with `403`,
  including the required-vs-actual role in the error `details`.
- Services apply resource-level checks (for example, a mentor only manages their own availability).

### 12.1.3 Transport, CORS, and Secrets

- CORS is restricted to the known app origins plus `*.workers.dev` (for staging) in `apps/api/src/index.ts`.
- TLS is provided by Cloudflare for all Worker routes and custom domains.
- All secrets are Worker secrets (`wrangler secret put`), read through the `Env` interface; none are committed. The seed
  file is generated and gitignored because it contains demo PII.

### 12.1.4 Input Validation

Every request body, query, and path parameter is validated with Zod via `@hono/zod-openapi`; a validation failure is
rejected with `400 VALIDATION_ERROR` before any handler logic runs.

## 12.2 Performance

- **Precomputed matches.** Recommendations are computed in the background and read straight from `user_match_cache`, so
  the request path is a single indexed query rather than a live scoring pass — the basis for sub-100ms reads. See
  [matching-cache-architecture.md](./matching-cache-architecture.md).
- **Batched, atomic writes.** Related writes (for example, creating a booking and flipping `time_slots.is_booked`) run
  as one `env.DB.batch()`, committing atomically in a single round trip.
- **Indexed queries.** The schema indexes the hot read paths (per-user cache lookups ordered by score, slot lookups by
  mentor and time, bookings by participant and status).
- **Edge delivery.** Both Workers run at Cloudflare's edge; the SPA ships as cached static assets and talks to the API
  over `fetch`.
- **Local JWT verification.** Auth adds no network round trip.

## 12.3 Performance Monitoring

Request duration and status are emitted as structured logs and visible via `wrangler tail` and the Workers dashboard;
see [16. Monitoring and Observability](./16-monitoring-and-observability.md).
