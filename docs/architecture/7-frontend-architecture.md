# 7. Frontend Architecture

The web app is a React 18 + Vite single-page app in `apps/web`, served as static assets from the web Worker. Setup and
scripts are documented in [`apps/web/README.md`](../../apps/web/README.md); this section covers the internal design.

## 7.1 Application Structure

```text
apps/web/
├── worker/             # Thin Worker entry that serves the built SPA (asset routing)
└── src/
    ├── components/     # UI components (see 6. Components)
    ├── pages/          # Route screens (auth, dashboard)
    ├── hooks/          # Custom hooks (e.g. useAuth, useMyBookings)
    ├── services/       # API client and auth/session helpers
    ├── stores/         # Zustand stores (auth/session, notifications)
    ├── lib/            # Utilities (api-client, error-messages)
    ├── contexts/       # React context providers
    ├── router.tsx      # React Router route table
    └── main.tsx        # Entry point
```

## 7.2 Routing Strategy

Client-side routing uses **React Router 6** (`src/router.tsx`). Protected routes are wrapped so an unauthenticated user
is redirected to `/auth/login`. Because the app is a SPA, the web Worker serves `index.html` for unknown paths
(`not_found_handling: single-page-application`), and React Router resolves the route on the client — so a hard refresh
on any in-app route works.

## 7.3 State Management

- **Zustand** holds client/UI state — the auth/session store and the notification (toast) store.
- **React Query** (`@tanstack/react-query`) owns all server state: fetching, caching, and background refetching.

## 7.4 Data Fetching and the API Client

`src/lib/api-client.ts` is a typed wrapper over `fetch` that centralizes base URL, auth header injection, error parsing,
and in-flight request deduplication. Hooks built on React Query call the client and expose typed data plus loading/error
state to components. Booking and dashboard data stay current through **React Query polling** — there is no realtime
socket or subscription layer.

## 7.5 Authentication Flow

Sign-in is a role-based demo login; there is no signup or other sign-in flow.

1. The login page (`/auth/login`) shows one "Login as …" button per role (mentee, mentor, coordinator).
2. Clicking a role calls `POST /v1/auth/demo-login`, which returns a signed session JWT for a random existing user of
   that role.
3. The token and user are stored in `localStorage` (`cf_oh_token` / `cf_oh_user`) and the session persists across
   refreshes until sign-out.
4. The API client attaches the token as `Authorization: Bearer <jwt>`; a `403` drives the client through logout back to
   the login page.

## 7.6 Freshness Strategy

Live booking and availability changes surface through React Query refetching (polling and invalidation on mutations),
not a push channel. Mutations invalidate the relevant queries so dependent screens refetch.

## 7.7 Forms and Validation

Forms are controlled and validated against the shared Zod schemas in `packages/shared`, so the client enforces the same
shapes the API validates. On submit, the typed API client surfaces validation failures (`VALIDATION_ERROR`) for display.

## 7.8 Error and Loading States

API failures throw a typed `ApiError`; components map the error `code` to user-facing copy via
`src/lib/error-messages.ts` and render explicit loading, empty, and error states. See
[15.6 Frontend Error Handling](./15-error-handling-strategy.md#156-frontend-error-handling).

## 7.9 Environment and Build Configuration

The web app reads a single variable, `VITE_API_BASE_URL`, at **build time** — the `build:staging` / `build:production`
scripts bake the correct API URL into the bundle, so deployed environments need no runtime configuration. Vite produces
hashed asset bundles served by the web Worker.

## 7.10 Testing

Unit and component tests run under Vitest with Testing Library; end-to-end flows run under Playwright. See
[13. Testing Strategy](./13-testing-strategy.md).
