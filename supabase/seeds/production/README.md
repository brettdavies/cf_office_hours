# Production Seed Data

This directory contains production-ready seed scripts for initializing the CF Office Hours database in production.

## ⚠️ Security Warning

**DO NOT commit actual production data to this repository if it contains PII (Personally Identifiable Information).**

- Use `.gitignore` to exclude files with real user data
- Store actual production seeds securely (password manager, encrypted storage)
- The files in this directory are **templates** showing structure only

## Files

### `seed_all_production.sql`
Master script that runs all production seed files in the correct order.

### `01_seed_raw_industries.sql`
Loads industry taxonomy data into `raw_industries` table.

### `02_seed_raw_technologies.sql`
Loads technology taxonomy data into `raw_technologies` table.

### `03_seed_raw_portfolio_companies.sql`
Loads Capital Factory portfolio company data into `raw_portfolio_companies` table.

### `04_seed_raw_users.sql`
Loads coordinator/admin users into `raw_users` table (CF team members).

### `05_seed_raw_mentors.sql`
Loads mentor data from Airtable export into `raw_mentors` table.

### `06_seed_raw_mentees.sql`
Loads mentee data from Airtable export into `raw_mentees` table.

## Usage

### Option 1: Run Master Script (Recommended)

```bash
psql "$SUPABASE_DB_URL" < supabase/seeds/production/seed_all_production.sql
```

### Option 2: Run Individual Scripts

```bash
psql "$SUPABASE_DB_URL" < supabase/seeds/production/01_seed_raw_industries.sql
psql "$SUPABASE_DB_URL" < supabase/seeds/production/02_seed_raw_technologies.sql
# ... etc
```

### Option 3: Use Supabase CLI

```bash
# Set database URL
export SUPABASE_DB_URL="postgresql://postgres:[password]@db.mwkptgdsoxlvxyeexwbf.supabase.co:5432/postgres"

# Run all seeds
psql "$SUPABASE_DB_URL" < supabase/seeds/production/seed_all_production.sql
```

## Idempotency & Data Safety

Seed scripts use different strategies based on data type:

**Taxonomy Tables (Reference Data):**
- `01_seed_raw_industries.sql` - Uses `TRUNCATE` (static reference data)
- `02_seed_raw_technologies.sql` - Uses `TRUNCATE` (static reference data)
- `03_seed_raw_portfolio_companies.sql` - Uses `TRUNCATE` (relatively static data)

**User Tables (Production Data):**
- `04_seed_raw_users.sql` - Uses `INSERT...ON CONFLICT DO UPDATE` (safe upsert, preserves existing data)
- `05_seed_raw_mentors.sql` - Uses `INSERT...ON CONFLICT DO UPDATE` (safe upsert, preserves existing data)
- `06_seed_raw_mentees.sql` - Uses `INSERT...ON CONFLICT DO UPDATE` (safe upsert, preserves existing data)

⚠️ **Production Safety Note:** User table seeds are safe to re-run after production launch. They will update existing records and add new ones without data loss. Taxonomy seeds will completely replace reference data.

## Data Flow

```
Raw Tables (Seed Data)
  ↓
ETL Triggers (Automatic)
  ↓
Public Tables (Application Data)
```

1. **Seed scripts populate raw tables** (`raw_mentors`, `raw_mentees`, etc.)
2. **ETL triggers automatically process** the raw data
3. **Data flows to public tables** (`users`, `user_profiles`, etc.)
4. **Email whitelist view** automatically shows all valid emails

## Verification Queries

After seeding, verify data was loaded:

```sql
-- Check raw table counts
SELECT 'raw_industries' AS table_name, COUNT(*) FROM raw_industries
UNION ALL
SELECT 'raw_technologies', COUNT(*) FROM raw_technologies
UNION ALL
SELECT 'raw_portfolio_companies', COUNT(*) FROM raw_portfolio_companies
UNION ALL
SELECT 'raw_users', COUNT(*) FROM raw_users
UNION ALL
SELECT 'raw_mentors', COUNT(*) FROM raw_mentors
UNION ALL
SELECT 'raw_mentees', COUNT(*) FROM raw_mentees;

-- Check email whitelist (should equal total users)
SELECT COUNT(*) AS whitelist_count FROM email_whitelist;

-- Check processed users (ETL should have created these)
SELECT COUNT(*) AS users_count FROM users;
```

## Production Deployment Checklist

- [ ] Production database migrations applied
- [ ] RLS policies verified
- [ ] Seed scripts prepared with actual data
- [ ] Seed scripts tested on staging/copy of production
- [ ] Backup created before running seeds
- [ ] Seeds executed successfully
- [ ] Data verification queries run
- [ ] ETL processing confirmed
- [ ] Email whitelist verified
- [ ] Test login with real coordinator email

## Data Sources

- **Industries/Technologies:** Hard-coded taxonomy (same as dev)
- **Portfolio Companies:** Export from Capital Factory Airtable base
- **Coordinators:** CF team member list (3-5 users)
- **Mentors:** Export from CF Mentor Airtable base (~100-400 records)
- **Mentees:** Export from CF Mentee Airtable base (~50-200 records)

## Notes

- Production seeds should use **real email addresses** for auth to work
- Development seeds use **fake `.example` emails** that won't receive magic links
- Coordinators need real emails to receive admin notifications
- All users will be able to login via magic link after seeding
