-- ============================================================================
-- Production Seed Script - CF Office Hours
-- ============================================================================
-- This script loads all production seed data into the raw tables.
-- ETL triggers will automatically process the data into public schema tables.
--
-- Usage:
--   psql "$SUPABASE_DB_URL" < supabase/seeds/production/seed_all_production.sql
--
-- DATA HANDLING:
--   - Taxonomy tables (industries, technologies, portfolio_companies): TRUNCATE and reload
--   - User tables (users, mentors, mentees): Idempotent upsert (safe for production reloads)
--   - Availability and bookings: DELETE and reload (dynamic dates)
-- ============================================================================

\echo '============================================================================'
\echo 'CF Office Hours - Production Seed Data'
\echo '============================================================================'
\echo ''

-- ============================================================================
-- 1. Industries Taxonomy
-- ============================================================================
\echo '→ Loading industries taxonomy...'
\i supabase/seeds/production/01_seed_raw_industries.sql
\echo '✓ Industries loaded'
\echo ''

-- ============================================================================
-- 2. Technologies Taxonomy
-- ============================================================================
\echo '→ Loading technologies taxonomy...'
\i supabase/seeds/production/02_seed_raw_technologies.sql
\echo '✓ Technologies loaded'
\echo ''

-- ============================================================================
-- 3. Portfolio Companies
-- ============================================================================
\echo '→ Loading portfolio companies...'
\i supabase/seeds/production/03_seed_raw_portfolio_companies.sql
\echo '✓ Portfolio companies loaded'
\echo ''

-- ============================================================================
-- 4. Coordinator Users
-- ============================================================================
\echo '→ Loading coordinator users...'
\i supabase/seeds/production/04_seed_raw_users.sql
\echo '✓ Coordinator users loaded'
\echo ''

-- ============================================================================
-- 5. Mentors
-- ============================================================================
\echo '→ Loading mentors...'
\i supabase/seeds/production/05_seed_raw_mentors.sql
\echo '✓ Mentors loaded'
\echo ''

-- ============================================================================
-- 6. Mentees
-- ============================================================================
\echo '→ Loading mentees...'
\i supabase/seeds/production/06_seed_raw_mentees.sql
\echo '✓ Mentees loaded'
\echo ''

-- ============================================================================
-- 6.5. Modify Emails
-- ============================================================================
\echo '→ Modifying emails...'
\i supabase/seeds/production/06.5_seed_modify_emails.sql
\echo '✓ Emails modified'
\echo ''

-- ============================================================================
-- 7. Availability and Time Slots
-- ============================================================================
\echo '→ Loading availability and time slots...'
\i supabase/seeds/production/07_seed_raw_availability.sql
\echo '✓ Availability and time slots loaded'
\echo ''

-- ============================================================================
-- 8. Bookings
-- ============================================================================
\echo '→ Loading bookings...'
\i supabase/seeds/production/08_seed_raw_bookings.sql
\echo '✓ Bookings loaded'
\echo ''

-- ============================================================================
-- Verification
-- ============================================================================
\echo '============================================================================'
\echo 'Seed Data Verification'
\echo '============================================================================'
\echo ''

SELECT 'Raw Data Counts:' AS status;
SELECT 'raw_industries' AS table_name, COUNT(*) AS count FROM raw_industries
UNION ALL
SELECT 'raw_technologies', COUNT(*) FROM raw_technologies
UNION ALL
SELECT 'raw_portfolio_companies', COUNT(*) FROM raw_portfolio_companies
UNION ALL
SELECT 'raw_users', COUNT(*) FROM raw_users
UNION ALL
SELECT 'raw_mentors', COUNT(*) FROM raw_mentors
UNION ALL
SELECT 'raw_mentees', COUNT(*) FROM raw_mentees
ORDER BY table_name;

\echo ''

SELECT 'Booking Data Counts:' AS status;
SELECT 'availability' AS table_name, COUNT(*) AS count FROM availability WHERE deleted_at IS NULL
UNION ALL
SELECT 'time_slots', COUNT(*) FROM time_slots WHERE deleted_at IS NULL
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings WHERE deleted_at IS NULL
ORDER BY table_name;

\echo ''

SELECT 'Booking Status Distribution:' AS status;
SELECT status, COUNT(*) AS count
FROM bookings
WHERE deleted_at IS NULL
GROUP BY status
ORDER BY status;

\echo ''
\echo '============================================================================'
\echo 'Production seeding complete!'
\echo ''
\echo 'Next steps:'
\echo '  1. Verify ETL processing created taxonomy: SELECT COUNT(*) FROM industries;'
\echo '  2. Users will be created on first auth login (ETL disabled for users)'
\echo '  3. Verify availability and bookings created (see counts above)'
\echo '  4. Add stakeholder emails to email whitelist for auth access'
\echo '  5. Test coordinator/mentor/mentee login and booking flows'
\echo '============================================================================'
