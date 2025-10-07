# Production Launch Checklist

This checklist must be completed before declaring the CF Office Hours platform production-ready.

## Pre-Launch Verification

### Infrastructure
- [ ] Supabase production database operational (Story 0.17)
- [ ] API deployed and healthy at https://api.officehours.youcanjustdothings.io (Story 0.18)
- [ ] Frontend deployed and accessible at https://officehours.youcanjustdothings.io (Story 0.19)
- [ ] All environment variables set correctly in Cloudflare Pages
- [ ] CORS configured for frontend origin (no errors in browser console)
- [ ] SSL certificates active (automatic via Cloudflare)

### Database
- [ ] All migrations applied successfully
- [ ] Row Level Security (RLS) policies active
- [ ] Seed data loaded (test users, whitelist entries)
- [ ] Database backups configured (automatic via Supabase)

### API
- [ ] Health endpoint responds: `https://api.officehours.youcanjustdothings.io/health`
- [ ] OpenAPI documentation accessible: `https://api.officehours.youcanjustdothings.io/api/docs`
- [ ] All API endpoints protected by authentication
- [ ] Environment variables secured (no secrets exposed)

---

## Smoke Tests

Execute these manual tests in production environment:

### Authentication Flow
- [ ] Homepage loads without errors at https://officehours.youcanjustdothings.io
- [ ] Magic link authentication works:
  - [ ] Enter whitelisted email
  - [ ] Receive magic link email (check Supabase Inbucket or actual inbox)
  - [ ] Click magic link
  - [ ] Redirects to `/dashboard` successfully
  - [ ] User session persists on page refresh

### Mentor Flow
- [ ] Login as mentor user
- [ ] Navigate to `/availability`
- [ ] Create availability block:
  - [ ] API request succeeds: `POST /v1/availability` - 201 Created
  - [ ] Availability appears in list
  - [ ] Data persisted to production database
- [ ] View availability calendar
- [ ] Delete availability block (if needed for testing)

### Mentee Flow
- [ ] Login as mentee user
- [ ] Navigate to `/mentors`
- [ ] Browse mentor list:
  - [ ] Mentor cards display correctly
  - [ ] Profile data loads from API
- [ ] Select mentor, view available slots
- [ ] Book meeting:
  - [ ] API request succeeds: `POST /v1/bookings` - 201 Created
  - [ ] Booking confirmation displays
  - [ ] Booking appears in dashboard
  - [ ] Data persisted to production database

### Dashboard
- [ ] Dashboard displays user data correctly
- [ ] Bookings list loads (both as mentor and mentee)
- [ ] User profile displays correctly
- [ ] Navigation works between all pages

### Console Logging (Story 0.16.1)
- [ ] Open DevTools > Console
- [ ] Verify expected logs present:
  - [ ] `[AUTH] Initializing auth hook`
  - [ ] `[AUTH] Magic link sent { email, redirectUrl }`
  - [ ] `[API] Fetching user profile`
  - [ ] Other critical path logs as implemented
- [ ] Verify NO unexpected errors or warnings

---

## Technical Verification

### Frontend
- [ ] Static assets load from Cloudflare CDN (check Network tab)
- [ ] No console errors (only expected logs)
- [ ] No CORS errors
- [ ] All pages render correctly (Login, Dashboard, Mentors, Availability, Profile)
- [ ] React Router navigation works (including page refresh on any route)

### API
- [ ] All API endpoints return correct status codes
- [ ] Error responses include proper error codes and messages
- [ ] CORS headers present in all responses:
  - [ ] `Access-Control-Allow-Origin: https://officehours.youcanjustdothings.io`
- [ ] Rate limiting configured (if implemented)

### Performance
- [ ] Time to First Byte (TTFB) < 200ms (Cloudflare edge)
- [ ] First Contentful Paint (FCP) < 1s (check Lighthouse)
- [ ] Largest Contentful Paint (LCP) < 2.5s (check Lighthouse)
- [ ] No JavaScript errors blocking rendering

---

## Post-Launch Monitoring

### Immediate (First 2 Hours)
- [ ] Cloudflare Workers metrics (API):
  - [ ] Navigate to: Cloudflare Dashboard > Workers & Pages > cf-office-hours-api > Metrics
  - [ ] Verify requests being served
  - [ ] Check error rate (should be near 0%)
  - [ ] Monitor CPU time (should be under 50ms per request)
- [ ] Cloudflare Pages analytics (Frontend):
  - [ ] Navigate to: Cloudflare Dashboard > Workers & Pages > cf-office-hours > Analytics
  - [ ] Verify page views incrementing
  - [ ] Check bandwidth usage
  - [ ] Monitor requests per second
- [ ] Supabase dashboard (Database):
  - [ ] Navigate to: Supabase Dashboard > Project > Database
  - [ ] Verify connections active
  - [ ] Check query performance
  - [ ] Monitor database size

### Short-term (First 24 Hours)
- [ ] Check Cloudflare metrics every 2 hours
- [ ] Monitor error logs in Workers dashboard
- [ ] Watch for CORS errors or API failures
- [ ] Respond to user feedback/bug reports
- [ ] Verify email delivery (magic links arriving)

### Ongoing
- [ ] Set up external uptime monitor (optional):
  - [ ] Service: UptimeRobot / Pingdom / StatusCake
  - [ ] URL: `https://officehours.youcanjustdothings.io`
  - [ ] Check interval: 5 minutes
  - [ ] Alert on: 3 consecutive failures
- [ ] Weekly review of Cloudflare analytics
- [ ] Monthly security audit: `npm audit`
- [ ] Quarterly dependency updates

---

## Rollback Plan

### Frontend Rollback
- [ ] Documented in `frontend-deployment-log.md`
- [ ] Via Cloudflare Dashboard: Pages > Deployments > Rollback
- [ ] Via Git: `git revert HEAD && git push origin main`

### API Rollback
- [ ] Documented in Story 0.18
- [ ] Via Wrangler: `wrangler rollback --env production`
- [ ] Verify previous version deployed successfully

### Database Rollback
- [ ] Create reverse migration with `supabase migration new rollback_[name]`
- [ ] Test migration locally first
- [ ] Apply to production: `supabase db push`
- [ ] See Story 0.17 for detailed procedures

---

## Known Limitations (Epic 0)

Document any known limitations to communicate to early users:

- [ ] No email notifications (magic link only)
- [ ] No calendar integration (manual booking only)
- [ ] No real-time updates (refresh to see changes)
- [ ] No file uploads (profile avatars not supported)
- [ ] No advanced search/filtering
- [ ] No mobile optimization (desktop-first)

---

## Launch Communication

### Internal Team
- [ ] Announce in Slack/email with production URL
- [ ] Share login instructions and test accounts
- [ ] Document known limitations
- [ ] Provide feedback channels

### Early Users
- [ ] Send invitation email with:
  - [ ] Production URL: https://officehours.youcanjustdothings.io
  - [ ] Login instructions (magic link)
  - [ ] Brief user guide
  - [ ] Feedback contact
- [ ] Monitor initial user activity
- [ ] Respond promptly to questions/issues

### Public (If Applicable)
- [ ] Update marketing website with launch announcement
- [ ] Social media announcement
- [ ] Press release (if applicable)

---

## Post-Launch Actions

### Immediate
- [ ] Tag release in Git: `git tag v1.0.0 && git push origin v1.0.0`
- [ ] Update documentation with production URLs
- [ ] Close Epic 0 stories in project management tool
- [ ] Celebrate successful launch! 🎉

### Short-term
- [ ] Gather user feedback
- [ ] Triage bug reports
- [ ] Plan Epic 1 features based on feedback
- [ ] Schedule retrospective meeting

---

## Sign-off

Before marking production ready, confirm all sections above are complete:

- [ ] Pre-Launch Verification: Complete
- [ ] Smoke Tests: All Passing
- [ ] Technical Verification: Complete
- [ ] Post-Launch Monitoring: Active
- [ ] Rollback Plan: Documented and Tested
- [ ] Known Limitations: Documented
- [ ] Launch Communication: Prepared

**Deployment Approved By:** [Name]
**Date:** [YYYY-MM-DD]
**Epic 0 Status:** ✅ Complete - Walking Skeleton Live in Production
