-- Migration: create_user_match_cache
-- Story: 0.22 - MATCH-INTERFACE-001
-- Description: Creates user_match_cache table with indexes and RLS for matching algorithm results

-- Create user_match_cache table
CREATE TABLE user_match_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who is this recommendation FOR
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Who is being recommended
  recommended_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Match score (0-100)
  match_score numeric(5,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 100),

  -- Detailed explanation (JSON)
  match_explanation jsonb NOT NULL,

  -- Which algorithm calculated this
  algorithm_version text NOT NULL,

  -- When was this calculated
  calculated_at timestamptz NOT NULL DEFAULT now(),

  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(user_id, recommended_user_id, algorithm_version),
  CHECK (user_id != recommended_user_id)
);

-- Indexes for fast retrieval
CREATE INDEX idx_user_match_cache_user_id ON user_match_cache(user_id);
CREATE INDEX idx_user_match_cache_score ON user_match_cache(user_id, match_score DESC);
CREATE INDEX idx_user_match_cache_algorithm ON user_match_cache(algorithm_version);
CREATE INDEX idx_user_match_cache_calculated_at ON user_match_cache(calculated_at);

-- Composite indexes for view performance (distinct_users_with_scores)
CREATE INDEX IF NOT EXISTS idx_user_match_cache_algorithm_user
  ON user_match_cache(algorithm_version, user_id);

CREATE INDEX IF NOT EXISTS idx_user_match_cache_algorithm_recommended
  ON user_match_cache(algorithm_version, recommended_user_id);

-- RLS Policy: Coordinators only
ALTER TABLE user_match_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinators can view all match cache"
  ON user_match_cache
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'coordinator'
    )
  );

-- View: distinct_users_with_scores
-- Description: Efficiently returns distinct user IDs with match scores for filtering
-- This view combines both user_id (mentees) and recommended_user_id (mentors) columns
CREATE OR REPLACE VIEW distinct_users_with_scores AS
SELECT DISTINCT
  algorithm_version,
  user_id AS id,
  'user_id' AS column_source
FROM user_match_cache
WHERE user_id IS NOT NULL

UNION

SELECT DISTINCT
  algorithm_version,
  recommended_user_id AS id,
  'recommended_user_id' AS column_source
FROM user_match_cache
WHERE recommended_user_id IS NOT NULL;

-- Grant access to authenticated users
GRANT SELECT ON distinct_users_with_scores TO authenticated;
GRANT SELECT ON distinct_users_with_scores TO anon;

-- View: algorithm_versions
-- Description: Efficiently returns distinct algorithm versions sorted alphabetically
-- Used by the algorithms endpoint to populate the dropdown
CREATE OR REPLACE VIEW algorithm_versions AS
SELECT DISTINCT algorithm_version
FROM user_match_cache
ORDER BY algorithm_version ASC;

-- Grant access to authenticated users
GRANT SELECT ON algorithm_versions TO authenticated;
GRANT SELECT ON algorithm_versions TO anon;
