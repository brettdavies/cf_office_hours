-- ============================================================================
-- Migration: Minimal Database Schema v2.4 (Epic 0 + v2.4 Data Model Updates)
-- Story: SKEL-DB-001 (Story 1.1 v2.0)
-- Created: 2025-10-03
-- Updated: 2025-10-05 (v2.4 data model enhancements)
-- ============================================================================
--
-- This migration creates the complete database schema supporting Epic 0 functionality
-- plus structural foundations for Epic 1+ features per PRD v2.4.
--
-- Major v2.4 Updates:
-- - Audit trail columns (created_by, updated_by, deleted_by) on all tables
-- - Taxonomy system (hierarchical tags with approval workflow)
-- - Portfolio companies (with company URLs)
-- - User URLs table (flexible user link management)
-- - Booking confirmation workflow (pending/confirmed/expired states)
--
-- Tables Created:
-- Core Tables:
-- - users: User authentication and role management with audit columns
-- - user_profiles: User profile information with portfolio_company_id
-- - portfolio_companies: Company master data with URLs
-- - user_urls: Flexible user URL management
--
-- Taxonomy System:
-- - taxonomy: Hierarchical tag definitions with approval workflow
-- - entity_tags: Polymorphic tag relationships (users + companies)
--
-- Booking System:
-- - availability: Mentor availability blocks with audit columns
-- - time_slots: Generated time slots with audit columns
-- - bookings: Meeting bookings with confirmation workflow
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
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

-- Indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_airtable_record_id ON users(airtable_record_id);

-- Trigger for auto-updating updated_at on users
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE users IS 'v2.4: User authentication and role management. Audit columns support compliance tracking. Nullable audit columns allow system-generated records.';
COMMENT ON COLUMN users.airtable_record_id IS 'Stable reference to Airtable record (source of truth for user data)';
COMMENT ON COLUMN users.created_by IS 'User who created this record (NULL for system-generated or Airtable sync)';
COMMENT ON COLUMN users.updated_by IS 'User who last updated this record (NULL for system updates)';
COMMENT ON COLUMN users.deleted_by IS 'User who soft-deleted this record (NULL if not deleted, used in Epic 1+)';

-- ============================================================================
-- TABLE: portfolio_companies
-- ============================================================================

CREATE TABLE portfolio_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  website text,
  pitch_vc_url text,
  linkedin_url text,
  location text,
  customer_segment text,
  product_type text,
  sales_model text,
  stage text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid,
  updated_by uuid
);

-- Trigger for auto-updating updated_at on portfolio_companies
CREATE TRIGGER set_timestamp_portfolio_companies
BEFORE UPDATE ON portfolio_companies
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE portfolio_companies IS 'v2.4: Capital Factory portfolio companies master data. Company URLs stored directly in this table (simple, fixed schema).';
COMMENT ON COLUMN portfolio_companies.name IS 'Company name (indexed for search)';
COMMENT ON COLUMN portfolio_companies.website IS 'Company website URL';
COMMENT ON COLUMN portfolio_companies.pitch_vc_url IS 'Pitch.vc profile URL';
COMMENT ON COLUMN portfolio_companies.linkedin_url IS 'LinkedIn company page URL';

-- ============================================================================
-- TABLE: user_profiles
-- ============================================================================

CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  company text,
  portfolio_company_id uuid REFERENCES portfolio_companies(id) ON DELETE SET NULL,
  phone text,
  bio text,
  avatar_source_type text CHECK (avatar_source_type IN ('upload', 'url')),
  avatar_metadata jsonb,
  reminder_preference text DEFAULT '1_hour' NOT NULL,
  metadata jsonb,
  expertise_description text,
  ideal_mentee_description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid,
  updated_by uuid
);

-- Index for user_profiles table
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_portfolio_company_id ON user_profiles(portfolio_company_id);

-- Trigger for auto-updating updated_at on user_profiles
CREATE TRIGGER set_timestamp_user_profiles
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE user_profiles IS 'v2.4: User profile information. portfolio_company_id for employees (mutually exclusive with company text field for mentors). URLs moved to separate user_urls table.';
COMMENT ON COLUMN user_profiles.company IS 'Free-text company name (for mentors, mutually exclusive with portfolio_company_id)';
COMMENT ON COLUMN user_profiles.portfolio_company_id IS 'FK to portfolio_companies (for employees, mutually exclusive with company text field)';
COMMENT ON COLUMN user_profiles.avatar_source_type IS 'Avatar source: upload (Supabase Storage) or url (external URL)';
COMMENT ON COLUMN user_profiles.avatar_metadata IS 'JSONB for avatar crop settings, dimensions, etc.';
COMMENT ON COLUMN user_profiles.reminder_preference IS 'Booking reminder preference (1_hour, 24_hours, none)';
COMMENT ON COLUMN user_profiles.metadata IS 'JSONB for experimentation and custom fields';
COMMENT ON COLUMN user_profiles.expertise_description IS 'Mentor-specific: What I can help with';
COMMENT ON COLUMN user_profiles.ideal_mentee_description IS 'Mentor-specific: Who I want to mentor';

-- ============================================================================
-- TABLE: user_urls
-- ============================================================================

CREATE TABLE user_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url text NOT NULL,
  url_type text NOT NULL CHECK (url_type IN ('website', 'pitch_vc', 'linkedin', 'other')),
  label text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid,
  updated_by uuid
);

-- Indexes for user_urls table
CREATE INDEX idx_user_urls_user_id ON user_urls(user_id);
CREATE UNIQUE INDEX uq_user_urls_user_type ON user_urls(user_id, url_type);

-- Trigger for auto-updating updated_at on user_urls
CREATE TRIGGER set_timestamp_user_urls
BEFORE UPDATE ON user_urls
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE user_urls IS 'v2.4: Flexible user URL management. Supports multiple custom URLs per user (FR7: Add link feature).';
COMMENT ON COLUMN user_urls.url_type IS 'URL type: website, pitch_vc, linkedin, or other (custom)';
COMMENT ON COLUMN user_urls.label IS 'Custom label for url_type=other (e.g., "GitHub", "Twitter")';

-- ============================================================================
-- TABLE: taxonomy
-- ============================================================================

CREATE TABLE taxonomy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_record_id text UNIQUE,
  category text NOT NULL CHECK (category IN ('industry', 'technology', 'stage')),
  value text NOT NULL,
  display_name text NOT NULL,
  parent_id uuid REFERENCES taxonomy(id) ON DELETE SET NULL,
  is_approved boolean DEFAULT false NOT NULL,
  source text NOT NULL CHECK (source IN ('airtable', 'user', 'auto_generated', 'admin', 'sample_data')),
  requested_by uuid,
  approved_by uuid,
  requested_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid,
  updated_by uuid,
  CONSTRAINT uq_taxonomy_category_value UNIQUE (category, value)
);

-- Indexes for taxonomy table
CREATE INDEX idx_taxonomy_category_approved_value ON taxonomy(category, is_approved, value);
CREATE INDEX idx_taxonomy_parent_id ON taxonomy(parent_id);

-- Trigger for auto-updating updated_at on taxonomy
CREATE TRIGGER set_timestamp_taxonomy
BEFORE UPDATE ON taxonomy
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE taxonomy IS 'v2.4: Hierarchical tag definitions with approval workflow. Supports industry, technology, and stage taxonomies.';
COMMENT ON COLUMN taxonomy.airtable_record_id IS 'Airtable record ID (nullable for user-submitted or sample data tags)';
COMMENT ON COLUMN taxonomy.value IS 'Normalized lowercase_snake_case value for matching (e.g., "cloud_software")';
COMMENT ON COLUMN taxonomy.display_name IS 'Original unprocessed display value (e.g., "Cloud Software & Infrastructure")';
COMMENT ON COLUMN taxonomy.parent_id IS 'Self-referential FK for hierarchical taxonomies (e.g., "Edge Computing" → parent: "Cloud Software")';
COMMENT ON COLUMN taxonomy.is_approved IS 'Approval flag for user-submitted tags (coordinator approval workflow)';
COMMENT ON COLUMN taxonomy.source IS 'Tag source: airtable (synced), user (user-submitted), auto_generated, admin, sample_data';
COMMENT ON COLUMN taxonomy.requested_by IS 'User who requested this tag (for user-submitted tags)';
COMMENT ON COLUMN taxonomy.approved_by IS 'Coordinator who approved this tag';

-- ============================================================================
-- TABLE: entity_tags
-- ============================================================================

CREATE TABLE entity_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('user', 'portfolio_company')),
  entity_id uuid NOT NULL,
  taxonomy_id uuid NOT NULL REFERENCES taxonomy(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);

-- Partial unique constraint to allow soft-deleted duplicates
CREATE UNIQUE INDEX uq_entity_tags_active ON entity_tags(entity_type, entity_id, taxonomy_id) WHERE deleted_at IS NULL;

-- Indexes for entity_tags table
CREATE INDEX idx_entity_tags_entity ON entity_tags(entity_type, entity_id);
CREATE INDEX idx_entity_tags_taxonomy_id ON entity_tags(taxonomy_id);

-- Trigger for auto-updating updated_at on entity_tags
CREATE TRIGGER set_timestamp_entity_tags
BEFORE UPDATE ON entity_tags
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE entity_tags IS 'v2.4: Polymorphic tag relationships. Supports tagging both users AND portfolio_companies. No FK to entity tables (polymorphic at application layer).';
COMMENT ON COLUMN entity_tags.entity_type IS 'Polymorphic entity type: user or portfolio_company';
COMMENT ON COLUMN entity_tags.entity_id IS 'UUID of the tagged entity (no FK constraint - polymorphic)';
COMMENT ON COLUMN entity_tags.taxonomy_id IS 'FK to taxonomy table';
COMMENT ON COLUMN entity_tags.deleted_at IS 'Soft delete timestamp (NULL if active)';
COMMENT ON COLUMN entity_tags.deleted_by IS 'User who soft-deleted this tag';

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
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
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

COMMENT ON TABLE availability IS 'v2.4: Mentor availability blocks with audit columns and soft delete support.';
COMMENT ON COLUMN availability.location IS 'Simple text field for location (meeting_type/location_preset_id/location_custom split in Epic 4)';
COMMENT ON COLUMN availability.deleted_at IS 'Soft delete timestamp (NULL if active)';
COMMENT ON COLUMN availability.deleted_by IS 'User who soft-deleted this availability block';

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
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  CONSTRAINT chk_time_slots_time_range CHECK (end_time > start_time)
);

-- Indexes for time_slots table
CREATE INDEX idx_time_slots_mentor_start ON time_slots(mentor_id, start_time);
CREATE INDEX idx_time_slots_is_booked ON time_slots(is_booked);

COMMENT ON TABLE time_slots IS 'v2.4: Generated time slots from availability blocks with audit columns and soft delete support.';
COMMENT ON COLUMN time_slots.is_booked IS 'Quick flag for filtering available slots';
COMMENT ON COLUMN time_slots.booking_id IS 'Set when slot is booked (references bookings.id)';
COMMENT ON COLUMN time_slots.deleted_at IS 'Soft delete timestamp (NULL if active)';
COMMENT ON COLUMN time_slots.deleted_by IS 'User who soft-deleted this time slot';

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
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'confirmed', 'completed', 'canceled', 'expired')),
  confirmed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  meeting_start_time timestamptz NOT NULL,
  meeting_end_time timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  CONSTRAINT chk_bookings_meeting_time_range CHECK (meeting_end_time > meeting_start_time)
);

-- Indexes for bookings table
CREATE UNIQUE INDEX idx_bookings_time_slot_id ON bookings(time_slot_id);
CREATE INDEX idx_bookings_mentee_id ON bookings(mentee_id);
CREATE INDEX idx_bookings_mentor_id ON bookings(mentor_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Trigger for auto-updating updated_at on bookings
CREATE TRIGGER set_timestamp_bookings
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE bookings IS 'v2.4: Meeting bookings with confirmation workflow (pending → confirmed/expired) and audit columns.';
COMMENT ON COLUMN bookings.time_slot_id IS 'UNIQUE constraint ensures one booking per slot';
COMMENT ON COLUMN bookings.meeting_start_time IS 'Denormalized from time_slot for quick queries';
COMMENT ON COLUMN bookings.status IS 'Booking state: pending (initial), confirmed (accepted), completed, canceled, expired (auto-rejected after 7 days)';
COMMENT ON COLUMN bookings.confirmed_by IS 'User who confirmed this booking (mentor or coordinator)';
COMMENT ON COLUMN bookings.confirmed_at IS 'Timestamp when booking was confirmed (for responsiveness tracking)';
COMMENT ON COLUMN bookings.deleted_at IS 'Soft delete timestamp (NULL if active)';
COMMENT ON COLUMN bookings.deleted_by IS 'User who soft-deleted this booking';

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS (Added After Table Creation)
-- ============================================================================

-- Foreign key constraint for time_slots.booking_id (forward reference)
ALTER TABLE time_slots
ADD CONSTRAINT fk_time_slots_booking
FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT fk_time_slots_booking ON time_slots IS 'FK constraint ensures data integrity, SET NULL on booking deletion';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS Policies: users table
-- ----------------------------------------------------------------------------

CREATE POLICY users_select_own ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY users_update_own ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

COMMENT ON POLICY users_select_own ON users IS 'Users can read their own record';
COMMENT ON POLICY users_update_own ON users IS 'Users can update their own record';

-- ----------------------------------------------------------------------------
-- RLS Policies: portfolio_companies table
-- ----------------------------------------------------------------------------

CREATE POLICY portfolio_companies_select_all ON portfolio_companies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY portfolio_companies_coordinator_all ON portfolio_companies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'coordinator'
    )
  );

COMMENT ON POLICY portfolio_companies_select_all ON portfolio_companies IS 'Public read access for company directory and employee profiles';
COMMENT ON POLICY portfolio_companies_coordinator_all ON portfolio_companies IS 'Coordinators can manage all portfolio companies';

-- ----------------------------------------------------------------------------
-- RLS Policies: user_profiles table
-- ----------------------------------------------------------------------------

CREATE POLICY user_profiles_select_all ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY user_profiles_update_own ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_profiles_insert_own ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_profiles_update_coordinator ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'coordinator'
    )
  );

CREATE POLICY user_profiles_insert_coordinator ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'coordinator'
    )
  );

COMMENT ON POLICY user_profiles_select_all ON user_profiles IS 'Public read access for mentor discovery and browsing';
COMMENT ON POLICY user_profiles_update_coordinator ON user_profiles IS 'Coordinators can update any user profile';
COMMENT ON POLICY user_profiles_insert_coordinator ON user_profiles IS 'Coordinators can create profiles for users';

-- ----------------------------------------------------------------------------
-- RLS Policies: user_urls table
-- ----------------------------------------------------------------------------

CREATE POLICY user_urls_select_all ON user_urls
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY user_urls_user_all ON user_urls
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY user_urls_select_all ON user_urls IS 'Public read access (URLs displayed on user profiles)';
COMMENT ON POLICY user_urls_user_all ON user_urls IS 'Users can CRUD their own URLs';

-- ----------------------------------------------------------------------------
-- RLS Policies: taxonomy table
-- ----------------------------------------------------------------------------

CREATE POLICY taxonomy_select_approved ON taxonomy
  FOR SELECT
  TO authenticated
  USING (is_approved = true);

CREATE POLICY taxonomy_select_own_requests ON taxonomy
  FOR SELECT
  TO authenticated
  USING (requested_by = auth.uid());

CREATE POLICY taxonomy_insert_user_request ON taxonomy
  FOR INSERT
  TO authenticated
  WITH CHECK (source = 'user' AND requested_by = auth.uid() AND is_approved = false);

CREATE POLICY taxonomy_coordinator_all ON taxonomy
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'coordinator'
    )
  );

COMMENT ON POLICY taxonomy_select_approved ON taxonomy IS 'Public read access for approved taxonomies';
COMMENT ON POLICY taxonomy_select_own_requests ON taxonomy IS 'Users can read their own pending tag requests';
COMMENT ON POLICY taxonomy_insert_user_request ON taxonomy IS 'Users can request new tags (pending approval)';
COMMENT ON POLICY taxonomy_coordinator_all ON taxonomy IS 'Coordinators can manage all taxonomy entries (approve, edit, delete)';

-- ----------------------------------------------------------------------------
-- RLS Policies: entity_tags table
-- ----------------------------------------------------------------------------

CREATE POLICY entity_tags_select_all ON entity_tags
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY entity_tags_user_all ON entity_tags
  FOR ALL
  TO authenticated
  USING (entity_type = 'user' AND entity_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (entity_type = 'user' AND entity_id = auth.uid());

CREATE POLICY entity_tags_coordinator_all ON entity_tags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'coordinator'
    )
  );

COMMENT ON POLICY entity_tags_select_all ON entity_tags IS 'Public read access (tags displayed on profiles and companies)';
COMMENT ON POLICY entity_tags_user_all ON entity_tags IS 'Users can manage their own tags';
COMMENT ON POLICY entity_tags_coordinator_all ON entity_tags IS 'Coordinators can manage all entity tags (users and companies)';

-- ----------------------------------------------------------------------------
-- RLS Policies: availability table
-- ----------------------------------------------------------------------------

CREATE POLICY availability_mentor_all ON availability
  FOR ALL
  TO authenticated
  USING (auth.uid() = mentor_id)
  WITH CHECK (auth.uid() = mentor_id);

CREATE POLICY availability_select_all ON availability
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY availability_coordinator_all ON availability
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'coordinator'
    )
  );

COMMENT ON POLICY availability_select_all ON availability IS 'Public read access for mentees to browse available slots';
COMMENT ON POLICY availability_coordinator_all ON availability IS 'Coordinators can manage all availability blocks';

-- ----------------------------------------------------------------------------
-- RLS Policies: time_slots table
-- ----------------------------------------------------------------------------

CREATE POLICY time_slots_select_all ON time_slots
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY time_slots_coordinator_all ON time_slots
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'coordinator'
    )
  );

COMMENT ON POLICY time_slots_select_all ON time_slots IS 'Public read access for slot browsing';
COMMENT ON POLICY time_slots_coordinator_all ON time_slots IS 'Coordinators can manage all time slots';

-- ----------------------------------------------------------------------------
-- RLS Policies: bookings table
-- ----------------------------------------------------------------------------

CREATE POLICY bookings_select_own ON bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);

CREATE POLICY bookings_insert_mentee ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = mentee_id);

CREATE POLICY bookings_update_own ON bookings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = mentor_id OR auth.uid() = mentee_id)
  WITH CHECK (auth.uid() = mentor_id OR auth.uid() = mentee_id);

CREATE POLICY bookings_coordinator_all ON bookings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'coordinator'
    )
  );

COMMENT ON POLICY bookings_select_own ON bookings IS 'Users can only see bookings they are involved in';
COMMENT ON POLICY bookings_insert_mentee ON bookings IS 'Only mentees can create bookings for themselves';
COMMENT ON POLICY bookings_coordinator_all ON bookings IS 'Coordinators can view and manage all bookings';

-- ============================================================================
-- Migration Complete
-- ============================================================================
