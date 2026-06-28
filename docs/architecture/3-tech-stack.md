# 3. Tech Stack

## 3.1 Technology Stack Table

Versions track the workspace `package.json` files; treat those and the lockfile as authoritative.

| Category           | Technology                                              | Notes                                                                  |
| ------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------- |
| Language           | TypeScript 5.7.x                                        | Strict mode across all workspaces                                      |
| Frontend framework | React 18.3.x                                            | SPA                                                                    |
| Build tool         | Vite 5.x                                                | Dev server and production bundle                                       |
| Routing (web)      | React Router 6.x                                        | Client-side routing                                                    |
| Client state       | Zustand 5.x                                             | Auth/session and UI stores                                             |
| Server state       | `@tanstack/react-query` 5.x                             | Data fetching and polling                                              |
| UI                 | Shadcn/ui + Tailwind CSS 3.4.x                          | Component library and styling                                          |
| API framework      | Hono 4.x + `@hono/zod-openapi`                          | OpenAPI 3.1 routing and validation                                     |
| Validation         | Zod 3.23.x                                              | Request/response schemas, shared with the web app                      |
| Runtime            | Cloudflare Workers (`nodejs_compat`)                    | API Worker and web static-assets Worker                                |
| Database           | Cloudflare D1 (SQLite)                                  | Raw prepared statements; no ORM                                        |
| Auth               | `jose` 6.x                                              | HS256 session JWTs signed/verified in the Worker                       |
| AI                 | OpenAI 6.x (optional)                                   | Powers the AI-based matching engine                                    |
| Email              | Resend (optional)                                       | Booking-confirmation email; see [3.3](#33-email-notification-strategy) |
| Dates              | `date-fns`                                              | Formatting in services and UI                                          |
| Testing            | Vitest 3.x, Playwright 1.50.x                           | Unit/integration (API + web) and E2E                                   |
| Tooling            | npm workspaces, Wrangler 4.x, esbuild, ESLint, Prettier | Monorepo orchestration, deploys, build, lint, format                   |

There is no ORM, no Postgres, and no hosted backend-as-a-service: the API talks to D1 directly and issues its own JWTs.

## 3.2 Cloudflare Compatibility Date

Both Workers pin `compatibility_date` to `2026-06-01` with `compatibility_flags: ["nodejs_compat"]`
(`apps/api/wrangler.jsonc`, `apps/web/wrangler.jsonc`). `nodejs_compat` enables the Node-compatible APIs the API depends
on. Change the date deliberately and verify against the
[Workers compatibility docs](https://developers.cloudflare.com/workers/configuration/compatibility-dates/); it is not a
value to bump casually.

## 3.3 Email Notification Strategy

Booking-confirmation email is handled by `apps/api/src/services/notification.service.ts`. The service formats one
message per participant and currently writes the formatted email to the console; the Resend provider is wired through
the optional `RESEND_API_KEY` and `EMAIL_FROM` Worker secrets declared in `apps/api/src/types/bindings.ts`. When those
secrets are unset, email content logs to the console, and a send failure never blocks the booking that triggered it (see
[15.4 External Service Error Handling](./15-error-handling-strategy.md#154-external-service-error-handling)).
