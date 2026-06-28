# 6. Components

This section is an overview of the web app's UI component organization. The components themselves are the source of
truth; see `apps/web/src/components/` and `apps/web/src/pages/`.

## 6.1 Component Library Strategy

The UI is built on **Shadcn/ui** primitives (Radix under the hood) styled with **Tailwind CSS**. Shadcn components are
copied into the repo under `apps/web/src/components/ui/` and owned as source, so they can be customized directly rather
than imported from a versioned package.

## 6.2 Component Organization

```text
apps/web/src/components/
├── ui/            # Shadcn/ui primitives (Button, Input, Toast, ...)
├── common/        # Shared app components (e.g. ProtectedRoute)
├── layouts/       # Page shells (e.g. AuthLayout)
└── coordinator/   # Coordinator-facing widgets (e.g. UserSelector)
```

Route-level screens live in `apps/web/src/pages/` (auth and dashboard areas); reusable building blocks live in
`components/`.

## 6.3 Feature Areas

- **Discovery** — browsing mentors and viewing match recommendations (coordinator-facing matching screens).
- **Booking** — selecting a slot and creating a booking, plus the "my bookings" dashboard.
- **Profile** — viewing and editing the current user's profile and links.
- **Availability** — mentor-only availability management.
- **Coordinator** — user selection, tier-override review, and metrics dashboards.

## 6.4 Design Patterns

- **Composition over prop-drilling.** Compose primitives rather than threading deep prop chains.
- **Controlled forms.** Form inputs are controlled and validated against the shared Zod schemas in `packages/shared`.
- **Loading and error states.** Components consume React Query state and render explicit loading/empty/error UI; API
  errors are surfaced from the typed `ApiError` (see
  [15.6 Frontend Error Handling](./15-error-handling-strategy.md#156-frontend-error-handling)).

## 6.5 Accessibility and Performance

- Shadcn/Radix primitives provide keyboard interaction and ARIA semantics out of the box; keep custom components
  labelled and focus-manageable.
- Vite code-splits per route; heavy screens load lazily. Keep bundle additions deliberate and prefer the shared
  primitives over new dependencies.

## 6.6 Testing

Component and hook behavior is covered by Vitest with Testing Library, and critical flows by Playwright E2E. See
[13. Testing Strategy](./13-testing-strategy.md).
