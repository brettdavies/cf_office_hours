-- ============================================================================
-- Local Development: Create users directly (ETL disabled for users)
-- ============================================================================
-- In production, users are created via Supabase Auth on first login.
-- For local development, we manually insert users from raw_mentees.

INSERT INTO users (airtable_record_id, email, role)
SELECT record_id, email, role
FROM raw_mentees
WHERE email NOT LIKE '%@gmail.com'
    AND email NOT LIKE '%@capitalfactory.com'
ON CONFLICT (email) DO NOTHING;

SELECT 'Created ' || COUNT(*) || ' mentee users' as result FROM users WHERE role = 'mentee';

-- ============================================================================
-- Local Development: Create users directly (ETL disabled for users)
-- ============================================================================
-- In production, users are created via Supabase Auth on first login.
-- For local development, we manually insert users from raw_users.

INSERT INTO users (airtable_record_id, email, role)
SELECT 'coordinator-' || ROW_NUMBER() OVER()::text, email, role
FROM raw_users
WHERE email NOT LIKE '%@gmail.com'
    AND email NOT LIKE '%@capitalfactory.com'
ON CONFLICT (email) DO NOTHING;

SELECT 'Created ' || COUNT(*) || ' coordinator users' as result FROM users WHERE role = 'coordinator';

-- ============================================================================
-- Local Development: Create users directly (ETL disabled for users)
-- ============================================================================
-- In production, users are created via Supabase Auth on first login.
-- For local development, we manually insert users from raw_mentors.

INSERT INTO users (airtable_record_id, email, role)
SELECT 'mentor-' || ROW_NUMBER() OVER()::text, email, 'mentor'
FROM raw_mentors
WHERE email NOT LIKE '%@gmail.com'
    AND email NOT LIKE '%@capitalfactory.com'
ON CONFLICT (email) DO NOTHING;

SELECT 'Created ' || COUNT(*) || ' mentor users' as result FROM users WHERE role = 'mentor';
