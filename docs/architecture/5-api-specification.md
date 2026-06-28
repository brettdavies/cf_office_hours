# 5. API Specification

## 5.1 Source of Truth: the OpenAPI Document

The API is contract-first. Every route is declared with `createRoute()` and Zod schemas via `@hono/zod-openapi`, so the
request/response contract and the OpenAPI 3.1 document are generated from the same code. The generated spec — not this
page — is the authoritative API reference:

- **Spec:** `GET /api/openapi.json`
- **Interactive docs:** Swagger UI at `/api/docs`

The web app's TypeScript types are generated from this spec with `npm run generate:api-types` (root), keeping client and
server in lockstep. To add or change an endpoint, edit its route definition and Zod schemas; the spec and the generated
types follow.

## 5.2 Base Structure

- All resource routes are mounted under `/v1` (for example `POST /v1/auth/demo-login`).
- `GET /health` (no auth) returns `{ status, timestamp }`.
- Authentication is `Authorization: Bearer <jwt>`; protected routes return `401` without a valid token and `403` when
  the caller's role is insufficient. See [12. Security and Performance](./12-security-and-performance.md).

## 5.3 Endpoint Groups

The current route surface (see `apps/api/src/routes/`), grouped by resource:

| Group        | Endpoints                                                                                    | Access                      |
| ------------ | -------------------------------------------------------------------------------------------- | --------------------------- |
| Auth         | `POST /v1/auth/demo-login`                                                                   | Public                      |
| Users        | `GET /v1/users/me`, `PUT /v1/users/me`, `GET /v1/users`, `GET /v1/users/{id}`                | Authenticated               |
| Availability | `GET /v1/availability`, `POST /v1/availability`                                              | Mentor                      |
| Bookings     | `POST /v1/bookings`, `GET /v1/bookings/my-bookings`, `GET /v1/bookings/overrides/pending`    | Authenticated / Coordinator |
| Matching     | `GET /v1/matching/algorithms`, `POST /v1/matching/find-matches`, `POST /v1/matching/explain` | Coordinator                 |

`POST /v1/auth/demo-login` takes `{ role: 'mentee' | 'mentor' | 'coordinator' }` and returns a signed session JWT for a
random existing user of that role; there is no signup or other sign-in flow. See
[7.5 Authentication Flow](./7-frontend-architecture.md#75-authentication-flow).

## 5.4 Error Response Format

Every error uses one envelope, produced by the global handler (see
[15. Error Handling Strategy](./15-error-handling-strategy.md)):

```json
{
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "This time slot is no longer available",
    "details": {},
    "timestamp": "2026-06-27T12:34:56.789Z"
  }
}
```

## 5.5 Type Generation

`npm run generate:api-types` reads `GET /api/openapi.json` and writes the web app's API types via `openapi-typescript`.
Run it after changing any route or schema so the SPA's types match the live contract.
