-- ============================================================================
-- Migration: Fix Role Detection from Raw Tables + Email Whitelist Validation
-- Story: 0.16.1 Manual Testing - Bug Fix + Security Enhancement
-- Created: 2025-10-06
-- ============================================================================
--
-- PROBLEM 1: Incorrect Role Assignment
-- - handle_new_user() always defaults role to 'mentee'
-- - Doesn't check which raw table (mentees/mentors/users) contains the email
-- - robert.johnson@mentor.example.com in raw_mentors but gets role='mentee'
--
-- PROBLEM 2: No Email Whitelist Validation
-- - Any email can create auth.users record via magic link
-- - No server-side validation before signup completion
--
-- SOLUTION:
-- - Look up email in raw tables FIRST before creating user
-- - Set role based on which table contains the email:
--   - raw_mentees → role = 'mentee'
--   - raw_mentors → role = 'mentor'
--   - raw_users → role = 'coordinator'
-- - RAISE EXCEPTION if email not found in any raw table (whitelist validation)
-- - This blocks signup completion even if magic link was sent
--
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role TEXT;
  user_airtable_id TEXT;
BEGIN
  -- Generate airtable_record_id (auth_ prefix for auth-created users)
  user_airtable_id := 'auth_' || NEW.id::TEXT;

  -- Check email_whitelist view for role (single query instead of 3)
  SELECT role INTO user_role
  FROM email_whitelist
  WHERE email = NEW.email
  LIMIT 1;

  -- If not found in whitelist, block signup
  IF user_role IS NULL THEN
    RAISE EXCEPTION 'Access denied. Email % is not registered in the system.', NEW.email
      USING HINT = 'Please contact an administrator for access.',
            ERRCODE = 'P0001';
  END IF;

  -- Insert into public.users with same UUID as auth.users
  INSERT INTO public.users (
    id,
    airtable_record_id,
    email,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    user_airtable_id,
    NEW.email,
    user_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Note: Profile hydration happens via hydrate_user_profile_from_raw() trigger

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates public.users with same UUID when user signs up via Supabase Auth. Role determined by email lookup in raw tables (mentees/mentors/users). BLOCKS signup if email not whitelisted in any raw table.';

-- ============================================================================
-- Data Fix: Update existing user with correct role
-- ============================================================================

-- Fix robert.johnson@mentor.example.com role
UPDATE public.users
SET role = 'mentor', updated_at = NOW()
WHERE email = 'robert.johnson@mentor.example.com'
  AND role = 'mentee';

-- ============================================================================
-- Migration Complete
-- ============================================================================
