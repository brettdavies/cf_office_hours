-- ============================================================================
-- Supabase Seed File - Modifies email addresses for specific users
-- ============================================================================
-- This file modifies email addresses in raw_mentees, raw_mentors, and raw_users
-- to use email addresses from a dynamic array for testing purposes.
--
-- Usage: Run after 06_seed_raw_mentees.sql and 05_seed_raw_mentors.sql
-- but before 07_seed_availability.sql
-- ============================================================================

-- Define the base email addresses and names to use (can be modified as needed)
-- These will be formatted with +mentee@, +mentor@, +coordinator@ for each table
DO $$
DECLARE
  base_emails TEXT[] := ARRAY[
    'davies.brett@gmail.com',
    'fredoliveira@capitalfactory.com',
    'drewrice@capitalfactory.com',
    'jaketeskey@capitalfactory.com'
  ];
  base_names TEXT[] := ARRAY[
    'Brett Davies',
    'Fred Oliveira',
    'Drew Rice',
    'Jake Teskey'
  ];
BEGIN

-- ============================================================================
-- Truly Dynamic Updates - Uses CTEs to get actual record IDs/emails
-- ============================================================================

-- Update mentees using actual record_ids from the table
EXECUTE (
  WITH mentees_to_update AS (
    SELECT record_id,
           -- Add +mentee@ prefix and assign emails based on row position
           regexp_replace(base_emails[row_number], '@', '+mentee@', 'g') as new_email,
           base_names[row_number] || ' Mentee' as new_name
    FROM (
      SELECT record_id,
             row_number() OVER (ORDER BY record_id) as row_number
      FROM raw_mentees
      WHERE record_id IS NOT NULL
      LIMIT array_length(base_emails, 1)
    ) ranked_mentees
  )
  SELECT format('
    UPDATE raw_mentees
    SET email = CASE %s END,
        name = CASE %s END
    WHERE record_id IN (%s)',
    string_agg(format('WHEN record_id = ''%s'' THEN ''%s''', record_id, new_email), ' '),
    string_agg(format('WHEN record_id = ''%s'' THEN ''%s''', record_id, new_name), ' '),
    string_agg(format('''%s''', record_id), ', ')
  )
  FROM mentees_to_update
);

-- Update mentors using actual emails from the table
EXECUTE (
  WITH mentors_to_update AS (
    SELECT email,
           -- Add +mentor@ prefix and assign emails based on row position
           regexp_replace(base_emails[row_number], '@', '+mentor@', 'g') as new_email,
           base_names[row_number] || ' Mentor' as new_name
    FROM (
      SELECT email,
             row_number() OVER (ORDER BY email) as row_number
      FROM raw_mentors
      WHERE email LIKE '%@mentor.example.com%'
      LIMIT array_length(base_emails, 1)
    ) ranked_mentors
  )
  SELECT format('
    UPDATE raw_mentors
    SET email = CASE %s END,
        full_name = CASE %s END
    WHERE email IN (%s)',
    string_agg(format('WHEN email = ''%s'' THEN ''%s''', email, new_email), ' '),
    string_agg(format('WHEN email = ''%s'' THEN ''%s''', email, new_name), ' '),
    string_agg(format('''%s''', email), ', ')
  )
  FROM mentors_to_update
);

-- Update coordinators using actual emails from the table
EXECUTE (
  WITH coordinators_to_update AS (
    SELECT email,
           -- Add +coordinator@ prefix and assign emails based on row position
           regexp_replace(base_emails[row_number], '@', '+coordinator@', 'g') as new_email,
           base_names[row_number] || ' Coordinator' as new_name
    FROM (
      SELECT email,
             row_number() OVER (ORDER BY email) as row_number
      FROM raw_users
      WHERE email LIKE '%@example.com%'
      LIMIT array_length(base_emails, 1)
    ) ranked_coordinators
  )
  SELECT format('
    UPDATE raw_users
    SET email = CASE %s END,
        name = CASE %s END
    WHERE email IN (%s)',
    string_agg(format('WHEN email = ''%s'' THEN ''%s''', email, new_email), ' '),
    string_agg(format('WHEN email = ''%s'' THEN ''%s''', email, new_name), ' '),
    string_agg(format('''%s''', email), ', ')
  )
  FROM coordinators_to_update
);

-- ============================================================================
-- Optional Verification (commented out to avoid execution issues)
-- ============================================================================
-- To verify the changes, you can run these queries manually after execution:
--
-- Show updated records:
-- SELECT 'MENTEE' as type, record_id as id, email, name FROM raw_mentees WHERE email LIKE '%+%@%'
-- UNION ALL
-- SELECT 'MENTOR' as type, NULL as id, email, full_name as name FROM raw_mentors WHERE email LIKE '%+%@%'
-- UNION ALL
-- SELECT 'COORDINATOR' as type, NULL as id, email, name FROM raw_users WHERE email LIKE '%+%@%';
--
-- Count formatted emails:
-- SELECT
--   (SELECT COUNT(*) FROM raw_mentees WHERE email LIKE '%+%@%') as mentees,
--   (SELECT COUNT(*) FROM raw_mentors WHERE email LIKE '%+%@%') as mentors,
--   (SELECT COUNT(*) FROM raw_users WHERE email LIKE '%+%@%') as coordinators;

END $$;
