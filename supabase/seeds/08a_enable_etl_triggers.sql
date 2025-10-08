-- ============================================================================
-- Supabase Seed File - Re-enable ETL Triggers After Seeding
-- ============================================================================
-- This file re-enables ETL triggers after local seeding is complete.
-- The triggers were disabled in 03a_disable_etl_triggers.sql to prevent
-- creating test users with real email addresses during seeding.
--
-- Usage: Run after 08_seed_create_users.sql completes user filtering
-- ============================================================================

-- Re-enable ETL triggers on raw tables
ALTER TABLE raw_mentees ENABLE TRIGGER etl_raw_mentees;
ALTER TABLE raw_mentors ENABLE TRIGGER etl_raw_mentors;
ALTER TABLE raw_users ENABLE TRIGGER etl_raw_users;

-- Log the action
DO $$
BEGIN
  RAISE NOTICE '🔊 ETL triggers re-enabled after seeding';
END $$;

-- ============================================================================
-- Trigger ETL processing for mentor tags
-- ============================================================================
-- Update raw_mentors to trigger the ETL process for tag creation.
-- Only update mentors that have corresponding user records (excludes gmail/cf emails).
-- We set email = email (a no-op) just to fire the UPDATE trigger.
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE raw_mentors
  SET email = email
  WHERE email IN (
    SELECT email FROM users WHERE role = 'mentor'
  );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Triggered ETL for % mentor users to create entity_tags', updated_count;
END $$;
