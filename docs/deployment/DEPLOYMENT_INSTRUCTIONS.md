# Story 0.19: Frontend Deployment Instructions

## Status: Ready for Manual Deployment

All code preparation is complete. This document provides step-by-step instructions to deploy the React frontend to Cloudflare Pages.

---

## Quick Start

**What's Ready:**
- ✅ CORS configured for production frontend
- ✅ `_redirects` file created for SPA routing
- ✅ Build configuration verified
- ✅ Comprehensive deployment documentation created

**What You Need:**
1. Cloudflare account with Pages access
2. GitHub repository access
3. Supabase production credentials (from Story 0.17)
4. DNS access for `youcanjustdothings.io` domain

---

## Step-by-Step Deployment

### Step 1: Commit Code Changes

```bash
# Review changes
git status

# Add all deployment preparation files
git add .

# Commit changes
git commit -m "feat(deploy): prepare Story 0.19 - Cloudflare Pages frontend deployment

- Add _redirects file for SPA routing
- Create comprehensive deployment documentation
- Verify CORS configuration for production frontend
- Update Supabase runbook with frontend URL

Ready for manual deployment via Cloudflare Dashboard.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to main (this will trigger automatic deployment once Pages is configured)
git push origin main
```

### Step 2: Create Cloudflare Pages Project

1. **Login to Cloudflare Dashboard**
   - Navigate to: https://dash.cloudflare.com
   - Go to: Workers & Pages > Create application > Pages > Connect to Git

2. **Connect GitHub Repository**
   - Select your GitHub account
   - Choose repository: `cf-office-hours` (or your actual repo name)
   - Authorize Cloudflare access to repository

3. **Initial Project Setup**
   - Project name: `cf-office-hours`
   - Production branch: `main`
   - Click "Save and Deploy"
   - ⚠️ **Note:** Initial deployment will fail - this is expected until build settings are configured

### Step 3: Configure Build Settings

1. **Navigate to Settings**
   - Pages project > Settings > Build & deployments

2. **Set Build Configuration**
   - Framework preset: `None` (custom monorepo)
   - Build command: `npm run build --workspace=apps/web`
   - Build output directory: `apps/web/dist`
   - Root directory: `/` (leave blank or enter `/`)

3. **Set Node Version**
   - Environment variables > Add variable
   - Variable name: `NODE_VERSION`
   - Value: `20`
   - Save

### Step 4: Set Environment Variables

1. **Navigate to Environment Variables**
   - Pages project > Settings > Environment variables

2. **Add Production Variables**
   - Select "Production" environment for each variable:

   ```
   VITE_API_BASE_URL=https://api.officehours.youcanjustdothings.io/v1
   VITE_SUPABASE_URL=https://mwkptgdsoxlvxyeexwbf.supabase.co
   VITE_SUPABASE_ANON_KEY=[your-anon-key-from-story-0.17]
   ```

3. **Get Supabase Credentials**
   - Supabase Dashboard: https://app.supabase.com/project/mwkptgdsoxlvxyeexwbf
   - Settings > API > Project URL (already shown above)
   - Settings > API > anon/public key (copy and paste)

4. **Save Environment Variables**

### Step 5: Configure Custom Domain

1. **Add Custom Domain**
   - Pages project > Custom domains > Set up a custom domain
   - Enter domain: `officehours.youcanjustdothings.io`
   - Cloudflare will automatically create DNS record (CNAME)

2. **Activate Domain**
   - Click "Activate domain"
   - SSL certificate will be automatically provisioned (~1-2 minutes)
   - Wait for SSL status to show "Active"

3. **Verify Domain**
   - Visit: https://officehours.youcanjustdothings.io
   - Should see Cloudflare "Deploy in progress" page initially

### Step 6: Trigger Production Deployment

1. **Retry Deployment**
   - Pages project > Deployments
   - Click "Retry deployment" on the failed deployment
   - OR push a new commit to main branch (already done in Step 1)

2. **Watch Build Logs**
   - Click on the deployment to view live build logs
   - Wait for build to complete (~2-3 minutes)
   - Look for green checkmark and "Success" status

3. **Note Deployment Details**
   - Deployment ID: [copy from dashboard]
   - Deployment URL: `https://[deployment-id].cf-office-hours.pages.dev`
   - Production URL: `https://officehours.youcanjustdothings.io`

### Step 7: Verify Deployment

1. **Open Production URL**
   - Navigate to: https://officehours.youcanjustdothings.io
   - Expected: Login page loads without errors

2. **Check DevTools Console**
   - Open DevTools (F12) > Console tab
   - Expected: Only expected logs, no errors
   - Look for: `[AUTH] Initializing auth hook`

3. **Check Network Tab**
   - DevTools > Network tab
   - Verify static assets load from Cloudflare CDN
   - Check: `index.html`, `assets/index-*.js`, `assets/index-*.css` (all 200 OK)

4. **Test Magic Link Login**
   - Enter whitelisted email (from Story 0.17 seed data)
   - Click "Send Magic Link"
   - Check Network tab: `POST /v1/auth/magic-link` should be 200 OK
   - Check email for magic link (Supabase Inbucket or actual inbox)

5. **Test Full User Flow**
   - Click magic link to authenticate
   - Should redirect to `/dashboard`
   - Navigate to `/availability` (mentor) or `/mentors` (mentee)
   - Verify data loads from production API
   - Test creating availability or booking meeting

6. **Verify CORS**
   - Check Console tab during API calls
   - Expected: NO CORS errors
   - CORS already configured in API (apps/api/src/index.ts:32)

### Step 8: Update Deployment Log

1. **Open Deployment Log**
   - File: `docs/deployment/frontend-deployment-log.md`

2. **Fill in Deployment Record**
   - Update "Deployment 1" section with actual values:
     - Date
     - Deployment ID
     - Git commit hash
     - Build time
     - Your name
     - Status (Success/Failed)
     - Any notes

3. **Commit Documentation Update**
   ```bash
   git add docs/deployment/frontend-deployment-log.md
   git commit -m "docs: record successful frontend deployment"
   git push origin main
   ```

---

## Verification Checklist

Use the comprehensive checklist: `docs/deployment/production-launch-checklist.md`

**Quick Verification:**
- [ ] Frontend loads at https://officehours.youcanjustdothings.io
- [ ] No console errors (only expected logs)
- [ ] Static assets load from CDN
- [ ] Magic link login works
- [ ] Dashboard displays data
- [ ] API calls succeed (check Network tab)
- [ ] No CORS errors
- [ ] Full user flow works (auth → availability → booking)

---

## Troubleshooting

### Build Fails: "npm ERR! missing script: build"
**Cause:** Incorrect build command
**Fix:** Verify build command is exactly: `npm run build --workspace=apps/web`

### Build Fails: "Environment variable VITE_API_BASE_URL is undefined"
**Cause:** Environment variable not set in Pages dashboard
**Fix:** Add variable in Settings > Environment variables (Production)

### CORS Error: "Origin not allowed"
**Cause:** Should not occur - CORS already configured
**Fix:** Verify `apps/api/src/index.ts` line 32 includes `https://officehours.youcanjustdothings.io`

### 404 on Page Refresh
**Cause:** SPA routing not configured
**Fix:** Should not occur - `_redirects` file already created in `apps/web/public/_redirects`

### Assets Fail to Load (404)
**Cause:** Incorrect build output directory
**Fix:** Verify "Build output directory" is exactly: `apps/web/dist`

---

## Rollback Procedures

### Quick Rollback (via Dashboard)
1. Pages > cf-office-hours > Deployments
2. Find previous working deployment
3. Click "..." > "Rollback to this deployment"
4. Wait 1-2 minutes
5. Verify at production URL

### Full Rollback Documentation
See: `docs/deployment/frontend-deployment-log.md` (Rollback Procedures section)

---

## Success Criteria

**Story 0.19 is complete when:**
- [ ] Frontend deployed to Cloudflare Pages
- [ ] Production URL accessible: https://officehours.youcanjustdothings.io
- [ ] SSL certificate active (automatic)
- [ ] All smoke tests pass
- [ ] Full user flow verified (auth → booking)
- [ ] No CORS errors
- [ ] Deployment documented

**Epic 0 is complete when:**
- [ ] Story 0.19 complete (this story)
- [ ] All Epic 0 features working end-to-end in production
- [ ] Walking Skeleton live and accessible to users
- [ ] Production launch checklist fully verified

---

## Next Steps After Deployment

1. **Mark Story Complete**
   - Update story status to "Ready for Review"
   - Complete production launch checklist

2. **Announce Launch**
   - Internal team notification
   - Early user invitations
   - Prepare feedback channels

3. **Monitor Production**
   - Cloudflare Workers metrics (API)
   - Cloudflare Pages analytics (Frontend)
   - Supabase dashboard (Database)
   - Watch for errors/issues first 24 hours

4. **Plan Epic 1**
   - Gather user feedback
   - Triage issues
   - Prioritize next features

---

## Need Help?

**Documentation:**
- Deployment Log: [docs/deployment/frontend-deployment-log.md](docs/deployment/frontend-deployment-log.md)
- Launch Checklist: [docs/deployment/production-launch-checklist.md](docs/deployment/production-launch-checklist.md)
- Supabase Runbook: [docs/deployment/supabase-production-runbook.md](docs/deployment/supabase-production-runbook.md)

**Cloudflare Resources:**
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Pages Build Configuration](https://developers.cloudflare.com/pages/platform/build-configuration/)
- [Pages Custom Domains](https://developers.cloudflare.com/pages/platform/custom-domains/)

**Support:**
- Cloudflare Discord: https://discord.cloudflare.com
- Supabase Discord: https://discord.supabase.com

---

**Good luck with the deployment! 🚀**
