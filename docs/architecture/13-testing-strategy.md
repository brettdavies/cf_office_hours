# 13. Testing Strategy

Tests run with **Vitest** (API and web unit/integration) and **Playwright** (web end-to-end). Nothing in the test suite
requires Wrangler, a remote database, or any external service.

## 13.1 API Tests

API tests live under `apps/api/src/test/` and run against an **in-memory D1 shim** backed by Node's `node:sqlite`
(`DatabaseSync`, Node 22+). The shim (`src/test/helpers/d1.ts`) implements the slice of the D1 API the code uses
(`prepare`, `bind`, `all`, `first`, `run`, `batch`, `exec`) and loads the **real schema** from
`migrations/0001_initial_schema.sql`, so tests exercise real SQL rather than mocks. Foreign keys are disabled in the
shim so fixtures can be inserted in any order.

- **Unit tests** (`src/test/unit/`) cover services and the matching engines (including the tag-based engine's scoring
  and bulk processing).
- **Integration tests** (`src/test/integration/`) drive routes through `app.request(...)` against the shim and exercise
  the fire-and-forget event handlers.
- `vitest.config.ts` loads `.sql` files as text modules, matching how Wrangler and the esbuild build treat them.

## 13.2 Web Tests

Web unit and component tests use **Vitest** with **Testing Library** (`apps/web/src/test/`), covering hooks, the API
client, and component behavior. They mock the API at the `fetch`/client boundary rather than standing up a backend.

## 13.3 End-to-End Tests

**Playwright** covers the critical flows end to end (demo login per role, browsing, booking, dashboard). Run them with
`npm run test:e2e` (`test:e2e:ui` for the inspector).

## 13.4 What to Test

- **Services** — business invariants (slot availability, double-booking guard, tier-override expiry filtering).
- **Repositories / SQL** — real queries against the shim, including the atomic booking write.
- **Matching engines** — score ranges, explanations, and bulk recalculation behavior.
- **Routes** — auth/role gating, validation errors, and the response envelope.
- **Web** — auth/session handling, query/polling behavior, and error rendering.

## 13.5 Running Tests

```bash
npm run test         # everything
npm run test:api     # API (Vitest)
npm run test:web     # web (Vitest)
npm run test:e2e     # Playwright E2E
```
