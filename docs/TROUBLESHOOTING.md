# Troubleshooting Guide

Quick reference for common development issues and their solutions.

## Setup Issues

### API Not Accessible / CORS Errors

**Symptoms:**
- Browser console shows CORS errors
- Requests to API fail
- Profile page stuck loading

**Solutions:**

1. **Check API is running on correct port (8787)**
   ```bash
   lsof -ti:8787
   # Should show a process ID
   ```

2. **Verify wrangler.toml has fixed port**
   ```bash
   cat apps/api/wrangler.toml | grep -A2 "\[dev\]"
   # Should show:
   # [dev]
   # port = 8787
   ```

3. **Restart API server**
   ```bash
   pkill -f "wrangler dev"
   npm run dev:api
   ```

### Double `/v1` in API URLs

**Symptoms:**
- Browser DevTools shows requests to `http://localhost:8787/v1/v1/users/me`
- API returns 404 Not Found

**Solution:**
```bash
# Check apps/web/.env
cat apps/web/.env | grep VITE_API_BASE_URL

# Should be: VITE_API_BASE_URL=http://127.0.0.1:8787
# NOT: VITE_API_BASE_URL=http://127.0.0.1:8787/v1

# Fix if wrong
sed -i '' 's|8787/v1|8787|g' apps/web/.env

# Restart web app (Vite should hot reload)
```

## Authentication Issues

### User Not Found After Login

**Symptoms:**
- Magic link login succeeds
- User redirected to dashboard
- Profile page shows "Profile not found" error

**Root Cause:**
UUID mismatch between `auth.users` and `public.users` tables.

**Diagnosis:**
```bash
# Check if triggers exist
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
  "SELECT proname FROM pg_proc WHERE proname IN ('handle_new_user', 'hydrate_user_profile_from_raw');"

# Should show both functions

# Check UUID sync for logged-in user
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" <<EOF
SELECT
  au.email,
  au.id as auth_uuid,
  pu.id as public_uuid,
  CASE WHEN au.id = pu.id THEN '✅ MATCH' ELSE '❌ MISMATCH' END as status
FROM auth.users au
LEFT JOIN public.users pu ON pu.email = au.email;
EOF
```

**Solution:**
```bash
# If triggers missing or UUIDs mismatched, reset database
supabase db reset

# This will:
# 1. Drop all tables
# 2. Re-run all migrations (including trigger creation)
# 3. Seed sample data
```

### Cannot Request Magic Link

**Symptoms:**
- Error: "Database error finding user"
- Login form fails to send magic link

**Diagnosis:**
```bash
# Check Supabase auth logs
docker logs supabase_auth_cf_oh 2>&1 | tail -20
```

**Common causes:**
1. Manually created test users with NULL required fields
2. Missing confirmation_token, recovery_token columns

**Solution:**
```bash
# Delete manually created test users
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" <<EOF
DELETE FROM public.user_urls WHERE user_id IN (SELECT id FROM public.users WHERE airtable_record_id LIKE 'auth_%');
DELETE FROM public.user_profiles WHERE user_id IN (SELECT id FROM public.users WHERE airtable_record_id LIKE 'auth_%');
DELETE FROM public.users WHERE airtable_record_id LIKE 'auth_%';
DELETE FROM auth.users;
EOF

# Use the application UI to register users properly
```

## Database Issues

### Migrations Fail

**Symptoms:**
- `supabase db reset` fails
- Error: "constraint violation" or "column does not exist"

**Solution:**
```bash
# Check migration order
ls -la supabase/migrations/

# Ensure migrations are ordered by timestamp
# Format: YYYYMMDDHHMMSS_description.sql

# If corrupted, you may need to:
# 1. Backup any critical data
# 2. Delete problematic migration
# 3. Re-run reset
supabase db reset
```

### Seed Data Fails

**Symptoms:**
- Database reset succeeds but seed data fails
- Error: "violates check constraint"

**Common Issues:**
1. **Taxonomy source constraint**: ETL uses `'airtable_via_raw'` but constraint only allows `'airtable'`, `'user'`, etc.
2. **Missing parent references**: Seed data references entities that don't exist yet

**Solution:**
Check the specific constraint in the error message and update either:
- The migration that creates the constraint, OR
- The seed data to use valid values

## Development Workflow Issues

### Port Already in Use

```bash
# Find process using port
lsof -ti:8787  # API
lsof -ti:3000  # Web app
lsof -ti:5173  # Vite dev server

# Kill process
lsof -ti:8787 | xargs kill -9

# Or kill all node processes (nuclear option)
pkill -f node
```

### Type Errors After Schema Changes

```bash
# Regenerate API types
npm run generate:api-types

# Clear TypeScript cache
rm -rf apps/*/tsconfig.tsbuildinfo

# Run type check
npm run type-check
```

### Module Not Found Errors

```bash
# Clear all caches and reinstall
npm run clean
npm install

# Clear build artifacts
rm -rf apps/web/node_modules/.vite
rm -rf apps/api/.wrangler
rm -rf node_modules/.cache
```

## Performance Issues

### Slow Page Loads

1. **Check database query performance**
   ```bash
   # Enable query logging in Supabase Studio
   # Dashboard → Settings → Database → Query Performance
   ```

2. **Check API response times**
   ```bash
   # Use wrangler tail to see request durations
   npm run tail --workspace=apps/api
   ```

3. **Profile frontend bundle**
   ```bash
   npm run build:web
   # Check dist folder size
   du -sh apps/web/dist
   ```

## Getting Help

If these solutions don't resolve your issue:

1. **Check recent changes**
   ```bash
   git log --oneline -10
   git diff HEAD~5
   ```

2. **Search for similar issues**
   - GitHub Issues
   - Project documentation

3. **Provide context when asking for help**
   - Error messages (full stack trace)
   - Steps to reproduce
   - Environment (OS, Node version, etc.)
   - Recent changes made

## Related Documentation

- [Development Workflow](architecture/10-development-workflow.md) - Complete setup guide
- [Database Migrations](architecture/10-development-workflow.md#1016-database-migrations) - Migration best practices
- [ETL Workflow](etl-workflow-readme.md) - Raw data processing
