-- ============================================================================
-- Migration: Improve Whitelist Error Message
-- Story: 0.16.1 Manual Testing - Enhancement E1
-- Created: 2025-10-07
-- ============================================================================
--
-- PURPOSE:
-- Use error codes instead of hardcoded messages for whitelist validation.
-- Allows frontend to map error codes to localized, user-friendly messages
-- without requiring database migrations for content changes.
--
-- CHANGE:
-- Update handle_new_user() function to raise exception with error code
-- 'EMAIL_NOT_WHITELISTED' that frontend will map to appropriate message.
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

  -- If not found in whitelist, block signup with error code
  -- Frontend will map this error code to user-friendly message
  IF user_role IS NULL THEN
    RAISE EXCEPTION 'EMAIL_NOT_WHITELISTED'
      USING ERRCODE = 'P0001';
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

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates public.users with same UUID when user signs up via Supabase Auth. Role determined by email lookup in raw tables (mentees/mentors/users). BLOCKS signup if email not whitelisted with error code EMAIL_NOT_WHITELISTED.';

-- ============================================================================
-- Migration Complete
-- ============================================================================
