-- Migration: Add reputation_tier column to users table
-- Story: 0.31 - COORD-OVERRIDE-DASHBOARD-001
-- Description: Adds reputation tier system for tier-based booking restrictions

-- Add reputation_tier column with check constraint
ALTER TABLE users ADD COLUMN reputation_tier TEXT
  CHECK (reputation_tier IN ('bronze', 'silver', 'gold', 'platinum'));

-- Add index for query performance
CREATE INDEX idx_users_reputation_tier ON users(reputation_tier);

-- Add column comment for documentation
COMMENT ON COLUMN users.reputation_tier IS 'User reputation tier based on rating history (bronze: 0-3.0, silver: 3.0-4.0, gold: 4.0-4.5, platinum: 4.5+)';
