-- CF Office Hours - D1 (SQLite) schema
-- SQLite type affinities:
--   uuid -> TEXT (app generates via crypto.randomUUID; DB default is a fallback)
--   timestamp/date/time -> TEXT (ISO-8601, UTC)
--   json -> TEXT (JSON), boolean -> INTEGER (0/1), numeric -> REAL
-- Authorization lives in app middleware (no row-level security, no stored
-- procedures/triggers) and the app is a fixed-allowlist demo with no signup.
-- updated_at is maintained explicitly in app code.

-- A UUIDv4 generator used only as an INSERT fallback; repositories pass an explicit id.
-- Expression repeated per column because SQLite has no scalar UDFs.

CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  airtable_record_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('mentee', 'mentor', 'coordinator')),
  reputation_tier TEXT CHECK (reputation_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by TEXT,
  updated_by TEXT,
  deleted_at TEXT,
  deleted_by TEXT
);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_airtable_record_id ON users (airtable_record_id);
CREATE INDEX idx_users_reputation_tier ON users (reputation_tier);

CREATE TABLE portfolio_companies (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  website TEXT,
  pitch_vc_url TEXT,
  linkedin_url TEXT,
  location TEXT,
  customer_segment TEXT,
  product_type TEXT,
  sales_model TEXT,
  stage TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  user_id TEXT UNIQUE NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  company TEXT,
  portfolio_company_id TEXT REFERENCES portfolio_companies (id) ON DELETE SET NULL,
  phone TEXT,
  bio TEXT,
  avatar_source_type TEXT CHECK (avatar_source_type IN ('upload', 'url')),
  avatar_metadata TEXT,
  reminder_preference TEXT NOT NULL DEFAULT '1_hour',
  metadata TEXT,
  expertise_description TEXT,
  ideal_mentee_description TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX idx_user_profiles_user_id ON user_profiles (user_id);
CREATE INDEX idx_user_profiles_portfolio_company_id ON user_profiles (portfolio_company_id);

CREATE TABLE user_urls (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  url_type TEXT NOT NULL CHECK (url_type IN ('website', 'pitch_vc', 'linkedin', 'other')),
  label TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX idx_user_urls_user_id ON user_urls (user_id);
CREATE UNIQUE INDEX uq_user_urls_user_type ON user_urls (user_id, url_type);

CREATE TABLE taxonomy (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  airtable_record_id TEXT UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('industry', 'technology', 'stage')),
  value TEXT NOT NULL,
  display_name TEXT NOT NULL,
  parent_id TEXT REFERENCES taxonomy (id) ON DELETE SET NULL,
  is_approved INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL CHECK (source IN ('airtable', 'user', 'auto_generated', 'admin', 'sample_data')),
  requested_by TEXT,
  approved_by TEXT,
  requested_at TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by TEXT,
  updated_by TEXT,
  CONSTRAINT uq_taxonomy_category_value UNIQUE (category, value)
);
CREATE INDEX idx_taxonomy_category_approved_value ON taxonomy (category, is_approved, value);
CREATE INDEX idx_taxonomy_parent_id ON taxonomy (parent_id);

CREATE TABLE entity_tags (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'portfolio_company')),
  entity_id TEXT NOT NULL,
  taxonomy_id TEXT NOT NULL REFERENCES taxonomy (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by TEXT,
  updated_by TEXT,
  deleted_at TEXT,
  deleted_by TEXT
);
CREATE UNIQUE INDEX uq_entity_tags_active ON entity_tags (entity_type, entity_id, taxonomy_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_entity_tags_entity ON entity_tags (entity_type, entity_id);
CREATE INDEX idx_entity_tags_taxonomy_id ON entity_tags (taxonomy_id);

CREATE TABLE availability (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  mentor_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  slot_duration_minutes INTEGER NOT NULL CHECK (slot_duration_minutes IN (15, 20, 30, 60)),
  location TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by TEXT,
  updated_by TEXT,
  deleted_at TEXT,
  deleted_by TEXT,
  CONSTRAINT chk_availability_time_range CHECK (end_time > start_time)
);
CREATE INDEX idx_availability_mentor_id ON availability (mentor_id);

CREATE TABLE time_slots (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  availability_id TEXT NOT NULL REFERENCES availability (id) ON DELETE CASCADE,
  mentor_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_booked INTEGER NOT NULL DEFAULT 0,
  booking_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by TEXT,
  updated_by TEXT,
  deleted_at TEXT,
  deleted_by TEXT,
  CONSTRAINT chk_time_slots_time_range CHECK (end_time > start_time)
);
CREATE INDEX idx_time_slots_mentor_start ON time_slots (mentor_id, start_time);
CREATE INDEX idx_time_slots_is_booked ON time_slots (is_booked);

CREATE TABLE bookings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  time_slot_id TEXT UNIQUE NOT NULL REFERENCES time_slots (id) ON DELETE RESTRICT,
  mentor_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  mentee_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  meeting_goal TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'canceled', 'expired')),
  confirmed_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  confirmed_at TEXT,
  meeting_start_time TEXT NOT NULL,
  meeting_end_time TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by TEXT,
  updated_by TEXT,
  deleted_at TEXT,
  deleted_by TEXT,
  CONSTRAINT chk_bookings_meeting_time_range CHECK (meeting_end_time > meeting_start_time)
);
CREATE UNIQUE INDEX idx_bookings_time_slot_id ON bookings (time_slot_id);
CREATE INDEX idx_bookings_mentee_id ON bookings (mentee_id);
CREATE INDEX idx_bookings_mentor_id ON bookings (mentor_id);
CREATE INDEX idx_bookings_status ON bookings (status);

CREATE TABLE user_match_cache (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  recommended_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  match_score REAL NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_explanation TEXT NOT NULL,
  algorithm_version TEXT NOT NULL,
  calculated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, recommended_user_id, algorithm_version),
  CHECK (user_id != recommended_user_id)
);
CREATE INDEX idx_user_match_cache_user_id ON user_match_cache (user_id);
CREATE INDEX idx_user_match_cache_score ON user_match_cache (user_id, match_score DESC);
CREATE INDEX idx_user_match_cache_algorithm ON user_match_cache (algorithm_version);
CREATE INDEX idx_user_match_cache_calculated_at ON user_match_cache (calculated_at);
CREATE INDEX idx_user_match_cache_algorithm_user ON user_match_cache (algorithm_version, user_id);
CREATE INDEX idx_user_match_cache_algorithm_recommended ON user_match_cache (algorithm_version, recommended_user_id);

CREATE TABLE tier_override_requests (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))),
  mentee_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  mentor_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'rejected')),
  scope TEXT NOT NULL DEFAULT 'one_time' CHECK (scope IN ('one_time')),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  reviewed_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  reviewed_at TEXT,
  review_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by TEXT REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX idx_tier_override_requests_mentee_id ON tier_override_requests (mentee_id);
CREATE INDEX idx_tier_override_requests_mentor_id ON tier_override_requests (mentor_id);
CREATE INDEX idx_tier_override_requests_status ON tier_override_requests (status);
CREATE INDEX idx_tier_override_requests_expires_at ON tier_override_requests (expires_at);

CREATE VIEW algorithm_versions AS
SELECT DISTINCT algorithm_version FROM user_match_cache;

CREATE VIEW distinct_users_with_scores AS
SELECT DISTINCT algorithm_version, user_id AS id, 'user_id' AS column_source FROM user_match_cache
UNION
SELECT DISTINCT algorithm_version, recommended_user_id AS id, 'recommended_user_id' AS column_source FROM user_match_cache;
