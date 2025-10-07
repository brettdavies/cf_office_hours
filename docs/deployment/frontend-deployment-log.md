# Frontend Deployment Log

This log tracks all production deployments of the React frontend to Cloudflare Pages.

## Deployment Instructions

### Deployment 1 - Initial Production Release (Pending)

Follow these steps to complete the first production deployment:

1. **Prerequisites Checklist:**
   - [ ] Supabase production database operational (Story 0.17)
   - [ ] API deployed to production (Story 0.18)
   - [ ] Supabase credentials available (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
   - [ ] Domain `youcanjustdothings.io` DNS access available

2. **Phase 1: Cloudflare Pages Setup**
   - [ ] Login to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - [ ] Navigate to Workers & Pages > Create application > Pages > Connect to Git
   - [ ] Select GitHub repository: `cf-office-hours` (or actual repo name)
   - [ ] Authorize Cloudflare access to repository
   - [ ] Project name: `cf-office-hours`
   - [ ] Production branch: `main`
   - [ ] Click "Save and Deploy" (initial deployment will fail - expected until build config set)

3. **Phase 2: Configure Build Settings**
   - [ ] Pages project > Settings > Build & deployments
   - [ ] Build configuration:
     - Framework preset: `None` (custom monorepo)
     - Build command: `npm run build --workspace=apps/web`
     - Build output directory: `apps/web/dist`
     - Root directory: `/` (leave blank or `/`)
   - [ ] Environment variables > Add variable:
     - `NODE_VERSION=20`
   - [ ] Save settings

4. **Phase 3: Set Environment Variables**
   - [ ] Pages project > Settings > Environment variables
   - [ ] Add production variables (select "Production" environment):
     ```
     VITE_API_BASE_URL=https://api.officehours.youcanjustdothings.io/v1
     VITE_SUPABASE_URL=https://[project-ref].supabase.co
     VITE_SUPABASE_ANON_KEY=[anon-key-from-story-0.17]
     ```
   - [ ] Replace `[project-ref]` with actual Supabase project reference
   - [ ] Replace `[anon-key]` with actual anon key from Story 0.17
   - [ ] Save environment variables

5. **Phase 4: Configure Custom Domain**
   - [ ] Pages project > Custom domains > Set up a custom domain
   - [ ] Enter domain: `officehours.youcanjustdothings.io`
   - [ ] Cloudflare automatically creates DNS record (CNAME)
   - [ ] Activate domain (automatic SSL provisioning)
   - [ ] Wait for SSL certificate (~1-2 minutes)
   - [ ] Verify domain active with SSL: `https://officehours.youcanjustdothings.io`

6. **Phase 5: Trigger Production Deployment**
   - [ ] Method 1: Git push to main branch
     ```bash
     git add .
     git commit -m "feat(deploy): complete Story 0.19 - production frontend deployment"
     git push origin main
     ```
   - [ ] OR Method 2: Manual deployment via Pages dashboard > Deployments > Retry deployment
   - [ ] Watch build logs in Pages dashboard
   - [ ] Verify build succeeds (green checkmark, exit code 0)
   - [ ] Note deployment URL below

7. **Phase 6: Verification**
   - [ ] Open browser to `https://officehours.youcanjustdothings.io`
   - [ ] Verify homepage loads (Login page expected)
   - [ ] Open DevTools > Console - verify no errors (only expected logs)
   - [ ] Open DevTools > Network - verify static assets load from CDN
   - [ ] Test magic link login with whitelisted email
   - [ ] Verify API connection works (Network tab shows successful API calls)
   - [ ] Test full user flow: login → dashboard → create availability → book meeting
   - [ ] Verify no CORS errors in console

8. **Complete Deployment Record Below:**
   - Date: [YYYY-MM-DD]
   - Version: 1.0.0 (Epic 0 Walking Skeleton)
   - Deployment ID: [from Pages dashboard]
   - Frontend URL: https://officehours.youcanjustdothings.io
   - Deployed By: [name]
   - Git Commit: [commit hash]
   - Build Time: [Xs]
   - Status: [Success/Failed]
   - Notes: Initial production deployment. All Epic 0 features live.

---

## Deployment History

### Deployment 1 - Initial Production Release
- **Date:** TBD
- **Version:** 1.0.0 (Epic 0 Walking Skeleton)
- **Deployment ID:** TBD
- **Frontend URL:** https://officehours.youcanjustdothings.io
- **Deployed By:** TBD
- **Git Commit:** TBD
- **Build Time:** TBD
- **Status:** Pending
- **Notes:** Awaiting manual deployment through Cloudflare Pages dashboard

---

## Rollback Procedures

### Via Cloudflare Dashboard:
1. Pages > cf-office-hours > Deployments
2. Find previous working deployment
3. Click "..." > "Rollback to this deployment"
4. Wait for rollback deployment (1-2 minutes)
5. Verify previous version live

### Via Git:
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or checkout previous commit (use with caution!)
git checkout [previous-commit-hash]
git push origin main --force
```

### Full Stack Rollback:
If major issue requires full stack rollback:
1. Rollback frontend (above)
2. Rollback API: `wrangler rollback --env production`
3. If database issue: Create reverse migration, see Story 0.17
