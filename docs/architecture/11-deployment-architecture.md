# 11. Deployment Architecture

This section covers the production deployment strategy, infrastructure configuration, CI/CD pipelines, environment management, and operational procedures for the CF Office Hours platform.

## 11.1 Deployment Overview

**Platform Architecture:**
- **Frontend:** Cloudflare Pages (global edge network)
- **Backend:** Cloudflare Workers (serverless edge functions)
- **Database:** Supabase (hosted Postgres)
- **Storage:** Supabase Storage (S3-compatible)
- **Auth:** Supabase Auth (JWT-based)

**Deployment Strategy:**
- Zero-downtime deployments
- Automatic HTTPS with Cloudflare SSL
- Global edge deployment (300+ locations)
- Git-based deployments (push to deploy)

## 11.2 Environment Strategy

**Environments:**

| Environment | Purpose | Deployment | URL Pattern |
|------------|---------|------------|-------------|
| **Development** | Local development | Manual | localhost:3000, localhost:8787 |
| **Staging** | Pre-production testing | Automatic (develop branch) | staging.officehours.youcanjustdothings.io |
| **Production** | Live application | Manual (main branch) | officehours.youcanjustdothings.io |

**Environment Variables Management:**

```bash
# Development (local .env files)
apps/web/.env
apps/api/.env

# Staging
# Cloudflare Pages: Set in dashboard under "Environment variables"
# Cloudflare Workers: Use wrangler secrets

# Production
# Cloudflare Pages: Set in dashboard
# Cloudflare Workers: Use wrangler secrets for sensitive data
```

## 11.3 Frontend Deployment (Cloudflare Pages)

**Initial Setup:**

```bash
# 1. Login to Cloudflare
npx wrangler login

# 2. Create Cloudflare Pages project
# Via Cloudflare Dashboard:
# - Connect GitHub repository
# - Select "cf-office-hours" repo
# - Framework preset: Vite
# - Build command: npm run build:web
# - Build output directory: apps/web/dist
# - Root directory: /
```

**Build Configuration:**

```bash
# Cloudflare Pages build settings
Build command: npm run build --workspace=apps/web
Build output directory: apps/web/dist
Root directory: /
Node version: 20
```

**Environment Variables (Pages Dashboard):**

```
Production:
VITE_API_BASE_URL=https://api.officehours.youcanjustdothings.io/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_ENABLE_REALTIME=true
VITE_ENABLE_ANALYTICS=true

Preview (Staging):
VITE_API_BASE_URL=https://api-staging.officehours.youcanjustdothings.io/v1
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-anon-key
VITE_ENABLE_REALTIME=true
VITE_ENABLE_ANALYTICS=false
```

**Custom Domain Setup:**

```bash
# 1. Add custom domain in Cloudflare Pages dashboard
# - Production: officehours.youcanjustdothings.io
# - Staging: staging.officehours.youcanjustdothings.io

# 2. Configure DNS (automatically handled by Cloudflare)
# - CNAME record pointing to Cloudflare Pages

# 3. Enable automatic HTTPS (enabled by default)
```

**Deployment Process:**

```bash
# Automatic deployment on git push
git push origin main          # Deploys to production
git push origin develop       # Deploys to staging

# Manual deployment via CLI
npx wrangler pages deploy apps/web/dist --project-name=cf-office-hours

# View deployment logs
# Access via Cloudflare Dashboard > Pages > cf-office-hours > Deployments
```

## 11.4 Backend Deployment (Cloudflare Workers)

**wrangler.toml Configuration:**

```toml
# apps/api/wrangler.toml

name = "cf-office-hours-api"
main = "src/index.ts"
compatibility_date = "2025-03-11"
compatibility_flags = ["nodejs_compat"]

# Production environment
[env.production]
vars = { ENVIRONMENT = "production" }
routes = [
  { pattern = "api.officehours.youcanjustdothings.io/*", zone_name = "officehours.youcanjustdothings.io" }
]

[[env.production.kv_namespaces]]
binding = "CACHE"
id = "production-cache-namespace-id"

[[env.production.kv_namespaces]]
binding = "RATE_LIMIT"
id = "production-ratelimit-namespace-id"

[[env.production.durable_objects.bindings]]
name = "SLOT_GENERATOR"
class_name = "SlotGenerator"
script_name = "cf-office-hours-api"

# Staging environment
[env.staging]
vars = { ENVIRONMENT = "staging" }
routes = [
  { pattern = "api-staging.officehours.youcanjustdothings.io/*", zone_name = "officehours.youcanjustdothings.io" }
]

[[env.staging.kv_namespaces]]
binding = "CACHE"
id = "staging-cache-namespace-id"

[[env.staging.kv_namespaces]]
binding = "RATE_LIMIT"
id = "staging-ratelimit-namespace-id"
```

**Setting Secrets:**

```bash
# Production secrets
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
npx wrangler secret put SUPABASE_JWT_SECRET --env production
npx wrangler secret put GOOGLE_CLIENT_SECRET --env production
npx wrangler secret put MICROSOFT_CLIENT_SECRET --env production
npx wrangler secret put AIRTABLE_API_KEY --env production
npx wrangler secret put JWT_SECRET --env production
npx wrangler secret put WEBHOOK_SECRET --env production

# Staging secrets
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env staging
# ... repeat for other secrets
```

**Deployment Process:**

```bash
# Deploy to production
npm run build:api
npx wrangler deploy --env production

# Deploy to staging
npm run build:api
npx wrangler deploy --env staging

# View deployment status
npx wrangler deployments list --env production

# Rollback to previous version
npx wrangler rollback --env production
```

## 11.5 Database Deployment (Supabase)

**Migration Strategy:**

```bash
# 1. Create migration locally
npx supabase migration new add_booking_table

# 2. Write migration SQL
# Edit supabase/migrations/XXX_add_booking_table.sql

# 3. Apply to local database
npx supabase db push

# 4. Test locally
npm run test:api

# 5. Apply to staging
# Via Supabase Dashboard > Database > Migrations
# Or using Supabase CLI:
npx supabase db push --project-ref staging-project-ref

# 6. Verify staging
curl https://api-staging.officehours.youcanjustdothings.io/health

# 7. Apply to production
npx supabase db push --project-ref production-project-ref
```

**Row Level Security (RLS) Deployment:**

```sql
-- Always deploy RLS policies with tables
-- Example: supabase/migrations/XXX_booking_rls.sql

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own bookings
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (mentor_id = auth.uid() OR mentee_id = auth.uid());

-- Policy: Mentees can create bookings
CREATE POLICY "Mentees can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    mentee_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'mentee'
    )
  );
```

**Backup Strategy:**

```bash
# Supabase provides automatic daily backups
# Point-in-Time Recovery (PITR) available

# Manual backup
npx supabase db dump -f backup.sql --project-ref production-project-ref

# Restore from backup
npx supabase db restore backup.sql --project-ref production-project-ref
```

## 11.6 CI/CD Pipeline

**GitHub Actions Workflow:**

**.github/workflows/deploy-production.yml:**

```yaml
name: Deploy Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Run tests
        run: npm run test
      
      - name: Build
        run: npm run build

  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Database Migrations
        run: |
          npx supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          npx supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: 'apps/api'
          command: deploy --env production
  
  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build frontend
        run: npm run build:web
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy apps/web/dist --project-name=cf-office-hours
```

**.github/workflows/deploy-staging.yml:**

```yaml
name: Deploy Staging

on:
  push:
    branches: [develop]
  workflow_dispatch:

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Deploy API to staging
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: 'apps/api'
          command: deploy --env staging
      
      - name: Build and deploy frontend to staging
        run: |
          npm run build:web
          npx wrangler pages deploy apps/web/dist --project-name=cf-office-hours --branch=staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          VITE_API_BASE_URL: ${{ secrets.STAGING_API_BASE_URL }}
```

**Required GitHub Secrets:**

```
CLOUDFLARE_API_TOKEN
VITE_API_BASE_URL
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
STAGING_API_BASE_URL
```

## 11.7 Monitoring & Health Checks

**Health Check Endpoint:**

```typescript
// apps/api/src/index.ts
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
    version: '1.0.0',
  });
});
```

**Uptime Monitoring:**

```bash
# Use Cloudflare's built-in monitoring
# Access: Cloudflare Dashboard > Analytics > Workers

# External monitoring options:
# - UptimeRobot (free for 50 monitors)
# - Pingdom
# - StatusCake

# Example health check configuration:
# URL: https://api.officehours.youcanjustdothings.io/health
# Interval: 5 minutes
# Alert on: 3 consecutive failures
```

**Analytics:**

```javascript
// Cloudflare Pages automatically tracks:
// - Page views
// - Request counts
// - Error rates
// - Geographic distribution

// Access via Cloudflare Dashboard > Pages > Analytics
```

## 11.8 Rollback Procedures

**Frontend Rollback:**

```bash
# Via Cloudflare Dashboard:
# 1. Go to Pages > cf-office-hours > Deployments
# 2. Find previous working deployment
# 3. Click "..." > "Rollback to this deployment"

# Via CLI:
npx wrangler pages deployment list --project-name=cf-office-hours
npx wrangler pages deployment rollback <deployment-id>
```

**Backend Rollback:**

```bash
# List recent deployments
npx wrangler deployments list --env production

# Rollback to specific version
npx wrangler rollback --env production

# Or deploy previous version from git
git checkout <previous-commit>
npx wrangler deploy --env production
git checkout main
```

**Database Migration Rollback:**

Supabase doesn't support automatic migration rollback. Follow this manual rollback process:

**Emergency Rollback Process:**

```bash
# 1. Identify Failed Migration
npx supabase migration list
# Look for the last applied migration

# 2. Create Rollback Migration
npx supabase migration new rollback_booking_changes

# 3. Write Reverse SQL (in the new migration file)
# Example: If original migration added a column, remove it:
# ALTER TABLE bookings DROP COLUMN IF EXISTS new_column CASCADE;
# 
# Example: If original migration created a table, drop it:
# DROP TABLE IF EXISTS new_table CASCADE;

# 4. Test Rollback Locally First
npx supabase db push  # Apply to local database
npm run test          # Verify application still works

# 5. Apply Rollback to Production
npx supabase link --project-ref production-project-ref
npx supabase db push

# 6. Verify Application Health
curl https://api.officehours.youcanjustdothings.io/health
npm run test:e2e  # Run critical path tests
```

**Restore from Backup (if rollback fails):**

```bash
# Access Supabase Dashboard → Database → Backups
# 1. Identify last known good backup (before failed migration)
# 2. Click "Restore" on the backup
# 3. Confirm restoration (creates new database instance)
# 4. Update connection strings in application
# 5. Verify data integrity
```

**Migration Rollback Safety Checklist:**

Before rolling back a migration:
- [ ] Database backup created (automatic daily backup confirmed)
- [ ] Rollback migration script tested locally
- [ ] Data validation queries prepared
- [ ] Rollback window communicated to users (if downtime expected)
- [ ] Application code compatible with rolled-back schema
- [ ] All dependent services notified (frontend, workers)
- [ ] Post-rollback verification plan documented

After rollback:
- [ ] Application health check passed
- [ ] Critical user flows tested (booking, authentication)
- [ ] No data loss confirmed via validation queries
- [ ] Error logs reviewed for post-rollback issues
- [ ] Incident postmortem documented

**Common Rollback Scenarios:**

1. **Column Addition Gone Wrong:**
   ```sql
   -- Rollback migration:
   ALTER TABLE users DROP COLUMN IF EXISTS problematic_column CASCADE;
   ```

2. **Index Creation Causing Performance Issues:**
   ```sql
   -- Rollback migration:
   DROP INDEX IF EXISTS idx_problematic_index;
   ```

3. **RLS Policy Breaking Access:**
   ```sql
   -- Rollback migration:
   DROP POLICY IF EXISTS "problematic_policy" ON tablename;
   -- Recreate original policy
   ```

**Related Documentation:**
- Section 10.1.6: Database Migration workflow
- INFRA-DB-003: Migration Tooling Setup
- Section 11.5: CI/CD Pipeline (includes migration automation)
```

## 11.9 Disaster Recovery

**Backup Strategy:**

```bash