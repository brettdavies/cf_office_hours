-- ============================================================================
-- Migration: Auth User Sync & Profile Hydration Triggers
-- Story: 0.8 Profile View/Edit Screen - UUID Sync Fix
-- Created: 2025-10-06
-- ============================================================================
--
-- PROBLEM:
-- - ETL creates users with generated UUIDs
-- - Magic link creates different UUID in auth.users
-- - Auth middleware uses auth.users.id → public.users UUID mismatch → NOT FOUND
--
-- SOLUTION:
-- 1. auth.users INSERT → creates public.users with SAME UUID
-- 2. public.users INSERT → hydrates profile from raw_mentees/raw_mentors/raw_users by email
--
-- FLOW:
-- Magic link → auth.users created → handle_new_user trigger → public.users created (same UUID) →
-- hydrate_user_profile trigger → looks up raw tables by email → populates user_profiles + user_urls
--
-- ============================================================================

-- ============================================================================
-- FUNCTION: handle_new_user
-- Triggered by auth.users INSERT to create public.users with same UUID
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
  -- Extract role from user_metadata (default to 'mentee' if not set)
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'mentee');

  -- Generate airtable_record_id (auth_ prefix for auth-created users)
  user_airtable_id := 'auth_' || NEW.id::TEXT;

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

-- ============================================================================
-- FUNCTION: hydrate_user_profile_from_raw
-- Triggered by public.users INSERT to hydrate profile from raw tables
-- ============================================================================

CREATE OR REPLACE FUNCTION public.hydrate_user_profile_from_raw()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_name TEXT;
  user_title TEXT;
  user_company TEXT;
  user_phone TEXT;
  user_linkedin TEXT;
  user_bio TEXT;
  portfolio_company_uuid UUID;
BEGIN
  -- Look up user data from raw tables by email (priority: mentees → mentors → users)

  -- Check raw_mentees first
  SELECT name, title, company, phone, linkedin_url
    INTO user_name, user_title, user_company, user_phone, user_linkedin
    FROM raw_mentees
    WHERE email = NEW.email
    LIMIT 1;

  IF FOUND THEN
    -- Look up portfolio company UUID if company name provided
    IF user_company IS NOT NULL THEN
      SELECT id INTO portfolio_company_uuid
      FROM portfolio_companies
      WHERE name = user_company
      LIMIT 1;
    END IF;
  ELSE
    -- Check raw_mentors
    SELECT full_name, bio
      INTO user_name, user_bio
      FROM raw_mentors
      WHERE email = NEW.email
      LIMIT 1;

    IF NOT FOUND THEN
      -- Check raw_users (coordinators)
      SELECT name, title, company, phone, linkedin_url
        INTO user_name, user_title, user_company, user_phone, user_linkedin
        FROM raw_users
        WHERE email = NEW.email
        LIMIT 1;

      IF NOT FOUND THEN
        -- No raw data - use email prefix as name
        user_name := SPLIT_PART(NEW.email, '@', 1);
      END IF;
    END IF;
  END IF;

  -- Create user profile with hydrated data
  INSERT INTO public.user_profiles (
    user_id,
    name,
    title,
    company,
    portfolio_company_id,
    phone,
    bio,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    user_name,
    user_title,
    user_company,
    portfolio_company_uuid,
    user_phone,
    user_bio,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Create user_urls if linkedin exists
  IF user_linkedin IS NOT NULL AND user_linkedin != '' THEN
    INSERT INTO public.user_urls (
      user_id,
      url,
      url_type,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      user_linkedin,
      'linkedin',
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, url_type) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGER CREATION
-- ============================================================================

-- Drop triggers if they exist (for migration reruns)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_created_hydrate_profile ON public.users;

-- Trigger 1: Create public.users when auth.users created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger 2: Hydrate profile when public.users created
CREATE TRIGGER on_user_created_hydrate_profile
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.hydrate_user_profile_from_raw();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates public.users with same UUID when user signs up via Supabase Auth';
COMMENT ON FUNCTION public.hydrate_user_profile_from_raw() IS 'Hydrates user_profiles and user_urls from raw_mentees/raw_mentors/raw_users by email lookup';

-- ============================================================================
-- Migration Complete
-- ============================================================================
--
-- IMPORTANT NOTES:
-- - Users in raw tables do NOT automatically get public.users records
-- - public.users records are created ONLY when user logs in (auth.users INSERT)
-- - Profile data is hydrated from raw tables by email matching on first login
-- - If no raw data exists, minimal profile created from email
-- ============================================================================
