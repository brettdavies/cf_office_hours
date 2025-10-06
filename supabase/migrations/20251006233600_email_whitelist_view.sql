-- ============================================================================
-- Migration: Email Whitelist View
-- Story: 0.16.1 Manual Testing - Security Enhancement
-- Created: 2025-10-06
-- ============================================================================
--
-- PURPOSE:
-- Simplify email whitelist lookups by combining all three raw tables
-- (raw_mentees, raw_mentors, raw_users) into a single view.
--
-- BENEFITS:
-- - Simpler queries: SELECT FROM email_whitelist WHERE email = ?
-- - Better performance: Single query instead of 3 sequential checks
-- - Easier maintenance: Centralized whitelist logic
--
-- ============================================================================

CREATE OR REPLACE VIEW public.email_whitelist AS
  -- Mentees
  SELECT
    email,
    'mentee' AS role
  FROM raw_mentees

  UNION ALL

  -- Mentors
  SELECT
    email,
    'mentor' AS role
  FROM raw_mentors

  UNION ALL

  -- Coordinators
  SELECT
    email,
    'coordinator' AS role
  FROM raw_users;

COMMENT ON VIEW public.email_whitelist IS 'Combined view of all whitelisted emails from raw_mentees, raw_mentors, and raw_users tables. Used for authentication and authorization checks.';

-- ============================================================================
-- Migration Complete
-- ============================================================================
