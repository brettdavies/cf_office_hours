-- ============================================================================
-- Migration: Minimal Database Schema for Epic 0 (Walking Skeleton)
-- Story: SKEL-DB-001 (Story 1.1)
-- Created: 2025-10-03
-- ============================================================================
--
-- This migration creates the minimal database schema required for the core
-- booking flow. It includes only basic fields needed for Epic 0 functionality.
-- Additional fields (soft deletes, reputation, calendar integrations, etc.)
-- will be added in Epic 1+ migrations.
--
-- Tables Created:
-- - users: Basic user authentication and role management
-- - user_profiles: User profile information (1:1 with users)
-- - availability: Mentor availability blocks
-- - time_slots: Generated time slots from availability blocks
-- - bookings: Meeting bookings
--
-- Naming Convention: <timestamp>_<descriptive_name>.sql
-- Migration applied via: supabase db push (local) or CI/CD (production)
--
-- ============================================================================

-- ============================================================================
-- TRIGGER FUNCTION: Auto-update updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLE: users
-- ============================================================================

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_record_id text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('mentee', 'mentor', 'coordinator')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_airtable_record_id ON users(airtable_record_id);

-- Trigger for auto-updating updated_at on users
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE users IS 'Epic 0: Minimal user table. Fields to add in Epic 1: is_active, reputation_score, reputation_tier, last_activity_at, deleted_at';
COMMENT ON COLUMN users.airtable_record_id IS 'Stable reference to Airtable record (source of truth for user data)';

-- ============================================================================
-- TABLE: user_profiles
-- ============================================================================

CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  company text,
  phone text,
  bio text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index for user_profiles table
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- Trigger for auto-updating updated_at on user_profiles
CREATE TRIGGER set_timestamp_user_profiles
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE user_profiles IS 'Epic 0: Minimal profile fields. Fields to add in Epic 2: linkedin_url, website_url, pitch_vc_url, avatar_url, reminder_preference, additional_links, expertise_description, ideal_mentee_description, metadata';

-- ============================================================================
-- TABLE: availability
-- ============================================================================

CREATE TABLE availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_duration_minutes integer NOT NULL CHECK (slot_duration_minutes IN (15, 20, 30, 60)),
  location text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT chk_availability_time_range CHECK (end_time > start_time),
  CONSTRAINT chk_availability_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Index for availability table
CREATE INDEX idx_availability_mentor_id ON availability(mentor_id);

-- Trigger for auto-updating updated_at on availability
CREATE TRIGGER set_timestamp_availability
BEFORE UPDATE ON availability
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE availability IS 'Epic 0: Simplified availability blocks. Fields to add in Epic 4: recurrence_pattern, buffer_minutes, description, meeting_type, location_preset_id, location_custom. Renamed from availability_blocks for simplicity.';
COMMENT ON COLUMN availability.location IS 'Simple text field for location. Will be split into meeting_type/location_preset_id/location_custom in Epic 4.';

-- ============================================================================
-- TABLE: time_slots
-- ============================================================================

CREATE TABLE time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  availability_id uuid NOT NULL REFERENCES availability(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_booked boolean DEFAULT false NOT NULL,
  booking_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT chk_time_slots_time_range CHECK (end_time > start_time)
);

-- Indexes for time_slots table
CREATE INDEX idx_time_slots_mentor_start ON time_slots(mentor_id, start_time);
CREATE INDEX idx_time_slots_is_booked ON time_slots(is_booked);

COMMENT ON TABLE time_slots IS 'Epic 0: Generated time slots from availability blocks. Field to add in Epic 1: deleted_at (soft deletes)';
COMMENT ON COLUMN time_slots.is_booked IS 'Quick flag for filtering available slots';
COMMENT ON COLUMN time_slots.booking_id IS 'Set when slot is booked (references bookings.id)';

-- ============================================================================
-- TABLE: bookings
-- ============================================================================

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_slot_id uuid UNIQUE NOT NULL REFERENCES time_slots(id) ON DELETE RESTRICT,
  mentor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meeting_goal text NOT NULL,
  location text NOT NULL,
  status text DEFAULT 'confirmed' NOT NULL CHECK (status IN ('confirmed', 'completed', 'canceled')),
  meeting_start_time timestamptz NOT NULL,
  meeting_end_time timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT chk_bookings_meeting_time_range CHECK (meeting_end_time > meeting_start_time)
);

-- Indexes for bookings table
CREATE UNIQUE INDEX idx_bookings_time_slot_id ON bookings(time_slot_id);
CREATE INDEX idx_bookings_mentee_id ON bookings(mentee_id);
CREATE INDEX idx_bookings_mentor_id ON bookings(mentor_id);

-- Trigger for auto-updating updated_at on bookings
CREATE TRIGGER set_timestamp_bookings
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE bookings IS 'Epic 0: Minimal booking fields. Fields to add in Epic 3: materials_urls, google_meet_link. Fields to add in Epic 4: canceled_by, canceled_at, cancellation_reason, cancellation_notes. Field to add in Epic 1: deleted_at';
COMMENT ON COLUMN bookings.time_slot_id IS 'UNIQUE constraint ensures one booking per slot';
COMMENT ON COLUMN bookings.meeting_start_time IS 'Denormalized from time_slot for quick queries';

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS (Added After Table Creation)
-- ============================================================================

-- Foreign key constraint for time_slots.booking_id (QA Fix: DATA-001)
-- Added after bookings table creation due to forward reference requirement
ALTER TABLE time_slots 
ADD CONSTRAINT fk_time_slots_booking 
FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT fk_time_slots_booking ON time_slots IS 'QA Fix DATA-001: FK constraint ensures data integrity, SET NULL on booking deletion';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS Policies: users table
-- ----------------------------------------------------------------------------

-- Allow authenticated users to read their own row
CREATE POLICY users_select_own ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow authenticated users to update their own row
CREATE POLICY users_update_own ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

COMMENT ON POLICY users_select_own ON users IS 'Epic 0: Basic self-read. Coordinator override policies added in Epic 1.';
COMMENT ON POLICY users_update_own ON users IS 'Epic 0: Basic self-update. Coordinator override policies added in Epic 1.';

-- ----------------------------------------------------------------------------
-- RLS Policies: user_profiles table
-- ----------------------------------------------------------------------------

-- Allow all authenticated users to read all profiles (needed for mentor discovery)
CREATE POLICY user_profiles_select_all ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update their own profile
CREATE POLICY user_profiles_update_own ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to insert their own profile
CREATE POLICY user_profiles_insert_own ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY user_profiles_select_all ON user_profiles IS 'Public read access needed for mentor discovery and browsing';

-- ----------------------------------------------------------------------------
-- RLS Policies: availability table
-- ----------------------------------------------------------------------------

-- Allow mentors to manage their own availability (all operations)
CREATE POLICY availability_mentor_all ON availability
  FOR ALL
  TO authenticated
  USING (auth.uid() = mentor_id)
  WITH CHECK (auth.uid() = mentor_id);

-- Allow all authenticated users to read availability (needed for slot browsing)
CREATE POLICY availability_select_all ON availability
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON POLICY availability_select_all ON availability IS 'Public read access needed for mentees to browse available slots';

-- ----------------------------------------------------------------------------
-- RLS Policies: time_slots table
-- ----------------------------------------------------------------------------

-- Allow all authenticated users to read time slots (needed for slot browsing)
CREATE POLICY time_slots_select_all ON time_slots
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON POLICY time_slots_select_all ON time_slots IS 'Public read access needed for slot browsing. Write access controlled via application logic.';

-- ----------------------------------------------------------------------------
-- RLS Policies: bookings table
-- ----------------------------------------------------------------------------

-- Allow users to read bookings where they are mentor OR mentee
CREATE POLICY bookings_select_own ON bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);

-- Allow authenticated users to create bookings as mentee
CREATE POLICY bookings_insert_mentee ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = mentee_id);

-- Allow users to update bookings where they are mentor OR mentee
CREATE POLICY bookings_update_own ON bookings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = mentor_id OR auth.uid() = mentee_id)
  WITH CHECK (auth.uid() = mentor_id OR auth.uid() = mentee_id);

COMMENT ON POLICY bookings_select_own ON bookings IS 'Users can only see bookings they are involved in';
COMMENT ON POLICY bookings_insert_mentee ON bookings IS 'Only mentees can create bookings for themselves';

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================
--
-- To rollback this migration, execute the following commands:
--
-- DROP TABLE IF EXISTS bookings CASCADE;
-- DROP TABLE IF EXISTS time_slots CASCADE;
-- DROP TABLE IF EXISTS availability CASCADE;
-- DROP TABLE IF EXISTS user_profiles CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP FUNCTION IF EXISTS trigger_set_timestamp() CASCADE;
--
-- ============================================================================

-- Migration Complete

