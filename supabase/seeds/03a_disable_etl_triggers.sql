-- ============================================================================
-- Supabase Seed File - Disable ETL Triggers for Seeding
-- ============================================================================
-- This file disables ETL triggers during local seeding to prevent creating
-- test user accounts with real email addresses (gmail.com, capitalfactory.com).
--
-- In production, these triggers process Airtable data automatically.
-- For local seeding, we disable them temporarily and re-enable after user
-- filtering is complete.
--
-- Usage: Run before loading raw data (before 04_seed_mentees.sql)
-- ============================================================================

-- Disable ETL triggers on raw tables
ALTER TABLE raw_mentees DISABLE TRIGGER etl_raw_mentees;
ALTER TABLE raw_mentors DISABLE TRIGGER etl_raw_mentors;
ALTER TABLE raw_users DISABLE TRIGGER etl_raw_users;

-- Log the action
DO $$
BEGIN
  RAISE NOTICE '🔇 ETL triggers disabled for seeding';
END $$;
