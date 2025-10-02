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

**Database Rollback:**

```bash
# Supabase doesn't support automatic migration rollback
# Manual rollback process:

# 1. Create rollback migration
npx supabase migration new rollback_booking_changes

# 2. Write reverse SQL
# DROP TABLE IF EXISTS new_table;
# ALTER TABLE existing_table DROP COLUMN new_column;

# 3. Apply rollback
npx supabase db push --project-ref production-project-ref

# 4. Verify
curl https://api.officehours.youcanjustdothings.io/health
```

## 11.9 Disaster Recovery

**Backup Strategy:**

```bash
# Database backups (Supabase automatic)
# - Daily automatic backups
# - 7-day retention on free tier
# - Point-in-Time Recovery available on Pro tier

# Manual backup before major changes
npx supabase db dump -f backup-$(date +%Y%m%d).sql

# Store backups securely
# - S3 bucket
# - GitHub repository (private, for schema only)
# - Local encrypted storage
```

**Recovery Procedures:**

1. **Database Failure:**
   ```bash
   # Restore from latest backup
   npx supabase db restore backup-latest.sql --project-ref production-project-ref
   ```

2. **Worker Outage:**
   ```bash
   # Rollback to last working version
   npx wrangler rollback --env production
   
   # Or redeploy current version
   npx wrangler deploy --env production
   ```

3. **Pages Outage:**
   ```bash
   # Rollback to previous deployment
   npx wrangler pages deployment rollback <last-working-deployment-id>
   ```

4. **Complete Platform Failure:**
   - Cloudflare status: https://www.cloudflarestatus.com/
   - Supabase status: https://status.supabase.com/
   - Wait for platform recovery
   - Verify all services after recovery

## 11.10 Performance Optimization

**Cloudflare Settings:**

1. **Caching:**
   ```toml
   # wrangler.toml
   [env.production]
   # Cache static assets aggressively
   [env.production.cache]
   ttl = 3600  # 1 hour
   ```

2. **Compression:**
   - Brotli compression enabled by default on Cloudflare
   - Gzip fallback for older browsers

3. **HTTP/3:**
   - Enabled by default on Cloudflare
   - Improves performance over slow connections

**Database Optimization:**

```sql
-- Add indexes for common queries
CREATE INDEX idx_bookings_mentor_id ON bookings(mentor_id);
CREATE INDEX idx_bookings_mentee_id ON bookings(mentee_id);
CREATE INDEX idx_bookings_meeting_start ON bookings(meeting_start_time);
CREATE INDEX idx_time_slots_mentor ON time_slots(mentor_id, start_time) WHERE NOT is_booked;
CREATE INDEX idx_users_reputation_tier ON users(reputation_tier);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM bookings WHERE mentor_id = 'xxx';
```

## 11.11 Security Hardening

**HTTP Headers (Cloudflare Pages):**

```typescript
// apps/web/_headers (Cloudflare Pages Headers file)
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.officehours.youcanjustdothings.io;
```

**Rate Limiting:**

```typescript
// Already implemented in middleware (Section 8.4)
// Adjust limits per route:
app.use('/api/bookings', rateLimitMiddleware({ 
  windowMs: 60000, 
  maxRequests: 10 
}));
```

**DDoS Protection:**

- Cloudflare's DDoS protection enabled by default
- Workers rate limiting provides additional protection
- Supabase has built-in connection limits

## 11.12 Cost Management

**Cloudflare Free Tier Limits:**

| Service | Free Tier | Usage Estimate (500 users) |
|---------|-----------|---------------------------|
| Workers | 100,000 requests/day | ~5,000 requests/day ✅ |
| Pages | Unlimited bandwidth | Unlimited ✅ |
| KV Reads | 100,000/day | ~10,000/day ✅ |
| KV Writes | 1,000/day | ~500/day ✅ |
| Durable Objects | 1 million requests/month | ~50,000/month ✅ |

**Supabase Free Tier Limits:**

| Resource | Free Tier | Usage Estimate |
|----------|-----------|----------------|
| Database | 500 MB | ~100 MB ✅ |
| Storage | 1 GB | ~200 MB ✅ |
| Bandwidth | 2 GB | ~500 MB ✅ |
| Monthly Active Users | Unlimited | 500 ✅ |

**Cost Optimization Tips:**

1. **Use KV for Caching:**
   - Cache frequent queries
   - Reduce database load
   - Free tier sufficient for MVP

2. **Optimize Images:**
   - Use Cloudflare Image Resizing (paid)
   - Or compress before upload
   - Store in Supabase Storage

3. **Lazy Load Resources:**
   - Code splitting in frontend
   - Load features on-demand
   - Reduces bandwidth usage

## 11.13 Deployment Checklist

**Pre-Deployment:**
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Database migrations tested in staging
- [ ] Environment variables configured
- [ ] Performance testing completed
- [ ] Security scan passed
- [ ] Documentation updated

**Deployment:**
- [ ] Deploy to staging first
- [ ] Verify staging functionality
- [ ] Run smoke tests on staging
- [ ] Deploy to production
- [ ] Verify production health
- [ ] Monitor error rates
- [ ] Check analytics dashboard

**Post-Deployment:**
- [ ] Verify all critical paths working
- [ ] Monitor logs for errors
- [ ] Check database performance
- [ ] Verify email notifications
- [ ] Test calendar integrations
- [ ] Update status page
- [ ] Communicate to team

**Rollback Criteria:**
- Error rate >5%
- Response time >2s for 95th percentile
- Critical feature broken
- Security vulnerability discovered

---


**Section 11 Complete.** This deployment architecture provides:
- ✅ Complete deployment strategy for Cloudflare Pages and Workers
- ✅ Environment management (development, staging, production)
- ✅ CI/CD pipeline with GitHub Actions
- ✅ Database migration and RLS deployment procedures
- ✅ Monitoring, health checks, and alerting
- ✅ Rollback and disaster recovery procedures
- ✅ Performance optimization strategies
- ✅ Security hardening and rate limiting
- ✅ Cost management within free tier limits
- ✅ Comprehensive deployment checklists

