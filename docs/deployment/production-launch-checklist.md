# Production Launch Checklist

Complete this checklist before declaring the CF Office Hours platform production-ready. It complements the step-by-step
[Deployment Instructions](DEPLOYMENT_INSTRUCTIONS.md) — run those for the commands; use this to verify the result.

## Pre-Launch Verification

### Infrastructure

- [ ] Production D1 database created and its `database_id` set in `apps/api/wrangler.jsonc`.
- [ ] API Worker deployed and healthy at `https://api.officehours.youcanjustdothings.io`.
- [ ] Web Worker deployed and reachable at `https://officehours.youcanjustdothings.io`.
- [ ] Custom domains resolve and TLS certificates are active (provisioned by Wrangler).
- [ ] CORS allows the production web origin (no CORS errors in the browser console).

### Database

- [ ] All migrations applied to the production database (`wrangler d1 migrations apply … --env production --remote`).
- [ ] Seed data loaded if the demo data is wanted (the seed file is generated and gitignored).
- [ ] Weekly Cron Trigger (`0 9 * * 1`) registered for the production environment.

### Secrets

- [ ] `JWT_SECRET` set for production (`wrangler secret put`).
- [ ] Optional secrets set if used: `OPENAI_API_KEY` (AI matching), `RESEND_API_KEY` / `EMAIL_FROM` (email).
- [ ] No secrets committed to the repository.

## Smoke Tests

Run the [Verification steps in the deploy runbook](DEPLOYMENT_INSTRUCTIONS.md#verification) first, then confirm the full
flows:

### Authentication

- [ ] The web app loads and the login page shows the three "Login as …" role buttons.
- [ ] Clicking a role calls `POST /v1/auth/demo-login`, returns a JWT, and lands on `/dashboard`.
- [ ] The session persists across a page refresh.

### Mentor flow

- [ ] Log in as a mentor and create an availability block (`POST /v1/availability` → `201`).
- [ ] The new availability appears in the list.

### Mentee flow

- [ ] Log in as a mentee, browse mentors, and open available slots.
- [ ] Book a meeting (`POST /v1/bookings` → `201`); the booking shows on the dashboard.

### Dashboard

- [ ] `GET /v1/bookings/my-bookings` loads bookings as both mentor and mentee.
- [ ] Navigation works across all pages, including a hard refresh on an in-app route.

## Technical Verification

### Frontend

- [ ] Static assets load from the Cloudflare edge (Network tab).
- [ ] No unexpected console errors; no CORS errors.
- [ ] React Router navigation works, including refresh on any route (SPA fallback).

### API

- [ ] Endpoints return correct status codes and the structured error envelope on failure.
- [ ] CORS headers present for the production origin.

### Performance

- [ ] Time to First Byte (TTFB) is low at the edge.
- [ ] First/Largest Contentful Paint are within target (check Lighthouse).

## Post-Launch Monitoring

- [ ] API Worker metrics: Cloudflare Dashboard → Workers → `cf-office-hours-api` → Metrics (requests, error rate, CPU).
- [ ] Web Worker metrics: Cloudflare Dashboard → Workers → `cf-office-hours-web`.
- [ ] D1 usage: Cloudflare Dashboard → D1 → `cf-office-hours` (reads, writes, storage).
- [ ] Live logs available via `npm run tail --workspace=apps/api` (`wrangler tail`).
- [ ] Optional external uptime monitor on `https://api.officehours.youcanjustdothings.io/health`.

## Rollback

- [ ] API and web each roll back with `wrangler rollback --env production` (see
  [Rollback](DEPLOYMENT_INSTRUCTIONS.md#rollback)).
- [ ] D1 schema changes roll forward with a new migration (no automatic schema rollback).

## Known Limitations

- [ ] Booking-confirmation email is formatted and logged to console; live delivery via Resend is not yet enabled.
- [ ] Bookings are arranged in-app; there is no external calendar sync.
- [ ] Updates surface via React Query polling, not a real-time push channel.
- [ ] Sign-in is demo login only (no signup).

## Sign-off

- [ ] Pre-Launch Verification complete.
- [ ] Smoke Tests passing.
- [ ] Technical Verification complete.
- [ ] Post-Launch Monitoring active.
- [ ] Rollback procedure confirmed.

**Approved by:** ______________ **Date:** ______________
