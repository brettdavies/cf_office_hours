# Supabase Production Runbook

**Project:** CF Office Hours
**Production Project ID:** `mwkptgdsoxlvxyeexwbf`
**Production URL:** `https://mwkptgdsoxlvxyeexwbf.supabase.co`
**Production API URL:** `https://api.officehours.youcanjustdothings.io`
**Last Updated:** 2025-10-07 (Story 0.18)

---

## Table of Contents

1. [Access & Credentials](#access--credentials)
2. [Database Migrations](#database-migrations)
3. [Seed Data Management](#seed-data-management)
4. [RLS Policy Verification](#rls-policy-verification)
5. [Monitoring & Health Checks](#monitoring--health-checks)
6. [Rollback Procedures](#rollback-procedures)
7. [Emergency Procedures](#emergency-procedures)
8. [Common Operations](#common-operations)

---

## 1. Access & Credentials

### Dashboard Access

**Supabase Dashboard:** https://app.supabase.com/project/mwkptgdsoxlvxyeexwbf

**Required Access:**
- Supabase account with project access
- Database password (stored in password manager)
- Service role key (stored securely, never committed to git)

### Credential Locations

**Password Manager Entry:** `CF Office Hours - Production Supabase`

**Local Environment Files (git-ignored):**
- `apps/api/.env.production` - API production credentials
- `apps/web/.env.production` - Frontend production credentials

**Required Credentials:**
- Project URL
- Anon Key (public)
- Service Role Key (SECRET)
- JWT Secret
- Database Password

### Database Connection

**Direct Connection (port 5432):**
```bash
export SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@db.mwkptgdsoxlvxyeexwbf.supabase.co:5432/postgres"
psql "$SUPABASE_DB_URL"
```

**Note:** Connection pooler (port 6543) may have intermittent issues. Use direct connection (port 5432) for reliability.

---

## 2. Database Migrations

### Applying New Migrations

**Prerequisites:**
- Local migrations tested and working
- Production backup created (if available)
- Migrations committed to git

**Steps:**

1. **Link to Production Project:**
   ```bash
   cd /path/to/cf_oh
   supabase link --project-ref mwkptgdsoxlvxyeexwbf
   ```

2. **Dry-Run (Review Changes):**
   ```bash
   supabase db push --dry-run --linked --db-url "$SUPABASE_DB_URL"
   ```

3. **Apply Migrations:**
   ```bash
   supabase db push --linked --db-url "$SUPABASE_DB_URL"
   ```

4. **Verify Success:**
   ```bash
   # Check migrations applied
   psql "$SUPABASE_DB_URL" -c "SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 10;"

   # Check tables exist
   psql "$SUPABASE_DB_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
   ```

### Migration History

**Current Migrations (as of Story 0.17):**
- `20251003041821_minimal_database_schema.sql`
- `20251005130800_raw_tables_schema.sql`
- `20251006000000_etl_workflow_triggers.sql`
- `20251006000001_etl_workflow_triggers.sql`
- `20251006000002_etl_workflow_triggers.sql`
- `20251006000003_auth_user_sync_trigger.sql`
- `20251006174027_create_booking_transaction.sql`
- `20251006230100_fix_role_detection_from_raw_tables.sql`
- `20251006233600_email_whitelist_view.sql`
- `20251007012200_update_availability_schema.sql`
- `20251007030000_improve_whitelist_error_message.sql`

**Total:** 11 migrations

---

## 3. Seed Data Management

### Initial Production Seeding (Story 0.17)

**Seed Scripts Location:** `supabase/seeds/production/`

**Files:**
- `seed_all_production.sql` - Master script (runs all)
- `01_seed_raw_industries.sql` - 55 industries
- `02_seed_raw_technologies.sql` - 45 technologies
- `03_seed_raw_portfolio_companies.sql` - 830 companies
- `04_seed_raw_users.sql` - 2 coordinators
- `05_seed_raw_mentors.sql` - 400 mentors
- `06_seed_raw_mentees.sql` - 50 mentees

**Seeding Procedure:**

1. **Run Master Script:**
   ```bash
   psql "$SUPABASE_DB_URL" < supabase/seeds/production/seed_all_production.sql
   ```

2. **Or Run Individual Scripts:**
   ```bash
   psql "$SUPABASE_DB_URL" < supabase/seeds/production/01_seed_raw_industries.sql
   psql "$SUPABASE_DB_URL" < supabase/seeds/production/02_seed_raw_technologies.sql
   psql "$SUPABASE_DB_URL" < supabase/seeds/production/03_seed_raw_portfolio_companies.sql
   psql "$SUPABASE_DB_URL" < supabase/seeds/production/04_seed_raw_users.sql
   psql "$SUPABASE_DB_URL" < supabase/seeds/production/05_seed_raw_mentors.sql
   psql "$SUPABASE_DB_URL" < supabase/seeds/production/06_seed_raw_mentees.sql
   ```

3. **Verify Seed Data:**
   ```bash
   psql "$SUPABASE_DB_URL" -c "
   SELECT 'raw_industries' AS table_name, COUNT(*) AS count FROM raw_industries
   UNION ALL SELECT 'raw_technologies', COUNT(*) FROM raw_technologies
   UNION ALL SELECT 'raw_portfolio_companies', COUNT(*) FROM raw_portfolio_companies
   UNION ALL SELECT 'raw_users', COUNT(*) FROM raw_users
   UNION ALL SELECT 'raw_mentors', COUNT(*) FROM raw_mentors
   UNION ALL SELECT 'raw_mentees', COUNT(*) FROM raw_mentees
   UNION ALL SELECT 'email_whitelist', COUNT(*) FROM email_whitelist
   ORDER BY table_name;
   "
   ```

**Expected Counts:**
- raw_industries: 55
- raw_mentees: 50
- raw_mentors: 400
- raw_portfolio_companies: 830
- raw_technologies: 45
- raw_users: 2
- email_whitelist: 452

**Idempotency:**
All seed scripts use `TRUNCATE TABLE` so they can be re-run safely without creating duplicates.

### Adding New Users

**For Coordinators:**
Edit `supabase/seeds/production/04_seed_raw_users.sql` and add new rows, then re-run:
```bash
psql "$SUPABASE_DB_URL" < supabase/seeds/production/04_seed_raw_users.sql
```

**For Mentors/Mentees:**
Update from Airtable exports, then re-run respective seed files.

---

## 4. RLS Policy Verification

### Check RLS is Enabled

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected:** All user-facing tables have `rowsecurity = true`

### List All Policies

```sql
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected:** 26 policies across users, user_profiles, bookings, availability, etc.

### Test Anonymous Access (Should Be Blocked)

```sql
SET ROLE anon;
SELECT * FROM users; -- Should return 0 rows
SELECT * FROM user_profiles; -- Should return 0 rows
RESET ROLE;
```

### Verify Email Whitelist

```sql
SELECT COUNT(*) FROM email_whitelist;
SELECT email, role FROM email_whitelist LIMIT 10;
```

---

## 5. Monitoring & Health Checks

### Quick Health Check

```bash
# Tables exist
psql "$SUPABASE_DB_URL" -c "\dt"

# Data counts
psql "$SUPABASE_DB_URL" -c "SELECT COUNT(*) FROM email_whitelist;"

# Recent users (if any have signed up)
psql "$SUPABASE_DB_URL" -c "SELECT COUNT(*) FROM auth.users;"
```

### Supabase Dashboard

**Navigate to:**
- **Database > Tables** - Verify tables exist
- **Database > Migrations** - Verify all migrations applied
- **Authentication > Policies** - Verify RLS policies active
- **Logs** - Check for errors

### Connection Test

```bash
# Test direct connection
psql "$SUPABASE_DB_URL" -c "SELECT version();"

# Test from API (local)
# Temporarily set production credentials in apps/api/.env
# curl http://localhost:8787/health
```

---

## 6. Rollback Procedures

### Migration Rollback

⚠️ **Supabase does not auto-rollback migrations.**

**If a migration fails:**

1. **Create a reverse migration:**
   ```bash
   supabase migration new rollback_[description]
   ```

2. **Write reverse SQL:**
   ```sql
   -- Example: If migration created a table
   DROP TABLE IF EXISTS new_table CASCADE;

   -- Example: If migration added a column
   ALTER TABLE users DROP COLUMN IF EXISTS new_column;
   ```

3. **Test locally first:**
   ```bash
   supabase db reset
   # Verify rollback works
   ```

4. **Apply to production:**
   ```bash
   supabase db push --linked --db-url "$SUPABASE_DB_URL"
   ```

### Seed Data Rollback

**To revert seed data:**
```bash
# Truncate specific table
psql "$SUPABASE_DB_URL" -c "TRUNCATE TABLE raw_mentors CASCADE;"

# Re-run original seed
psql "$SUPABASE_DB_URL" < supabase/seeds/production/05_seed_raw_mentors.sql
```

---

## 7. Emergency Procedures

### Database Connection Failure

**Symptoms:** Cannot connect via psql or Supabase Studio

**Steps:**
1. Check Supabase Dashboard status page
2. Verify database password is correct
3. Try connection pooler instead of direct connection (or vice versa)
4. Check firewall/network settings
5. Contact Supabase support if issue persists

### Auth Failures (Users Can't Login)

**Symptoms:** Magic link emails not sending, login errors

**Steps:**
1. Check Supabase Dashboard > Authentication > Logs
2. Verify email whitelist: `SELECT COUNT(*) FROM email_whitelist;`
3. Check user exists in raw tables: `SELECT * FROM raw_users WHERE email = 'user@example.com';`
4. Verify RLS policies not blocking access
5. Check Supabase Auth configuration (Settings > Authentication)

### Data Loss Prevention

**Before major changes:**
1. Supabase provides automatic backups (check Dashboard > Database > Backups)
2. For critical operations, consider exporting data:
   ```bash
   pg_dump "$SUPABASE_DB_URL" > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

---

## 8. Common Operations

### Add a New Coordinator

1. Edit `supabase/seeds/production/04_seed_raw_users.sql`
2. Add new row with real email
3. Re-run seed: `psql "$SUPABASE_DB_URL" < supabase/seeds/production/04_seed_raw_users.sql`
4. Verify: `psql "$SUPABASE_DB_URL" -c "SELECT * FROM raw_users;"`
5. New coordinator can now login via magic link

### Check User's Role

```sql
SELECT email, role FROM users WHERE email = 'user@example.com';
```

### View Recent Bookings

```sql
SELECT
  b.id,
  m.email as mentor_email,
  me.email as mentee_email,
  ts.start_time,
  b.status
FROM bookings b
JOIN users m ON b.mentor_id = m.id
JOIN users me ON b.mentee_id = me.id
JOIN time_slots ts ON b.time_slot_id = ts.id
ORDER BY ts.start_time DESC
LIMIT 10;
```

### Manually Trigger ETL (if needed)

ETL triggers fire automatically on INSERT to raw tables. If you need to manually process:

```sql
-- Check ETL logs
SELECT * FROM etl_log ORDER BY created_at DESC LIMIT 10;

-- Re-insert to trigger ETL (not recommended, use with caution)
-- Better to fix source data and re-run seed scripts
```

---

## Troubleshooting

### Issue: Migration fails with "relation already exists"

**Cause:** Migration already applied or duplicate migration file
**Fix:** Check `supabase_migrations.schema_migrations` table, remove duplicates

### Issue: RLS policy blocks legitimate access

**Cause:** Policy logic error or missing auth context
**Fix:** Test policy with `SET ROLE authenticated; SET request.jwt.claims.sub TO '[user-id]';`

### Issue: Seed data not appearing

**Cause:** RLS policies hiding data or incorrect table name
**Fix:** Verify policies allow SELECT for target role, check table names match schema

### Issue: Connection pooler refused (port 6543)

**Cause:** Temporary Supabase infrastructure issue or network/firewall
**Fix:** Use direct database connection (port 5432) instead

---

## Support & Escalation

**Supabase Support:** https://supabase.com/support
**Project Dashboard:** https://app.supabase.com/project/mwkptgdsoxlvxyeexwbf
**GitHub Issues:** [CF Office Hours Repository]

---

## Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-07 | 1.0 | Initial runbook created for Story 0.17 | Dev Agent (James) |
