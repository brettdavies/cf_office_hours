-- Migration: Create tier_override_requests table
-- Story: 0.31 - COORD-OVERRIDE-DASHBOARD-001
-- Description: Creates table for managing mentee requests to book mentors above tier restrictions

-- Create tier_override_requests table
CREATE TABLE tier_override_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'rejected')),
  scope text NOT NULL DEFAULT 'one_time' CHECK (scope IN ('one_time')),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL
);

-- Add indexes for query performance
CREATE INDEX idx_tier_override_requests_mentee_id ON tier_override_requests(mentee_id);
CREATE INDEX idx_tier_override_requests_mentor_id ON tier_override_requests(mentor_id);
CREATE INDEX idx_tier_override_requests_status ON tier_override_requests(status);
CREATE INDEX idx_tier_override_requests_expires_at ON tier_override_requests(expires_at);

-- Enable Row Level Security
ALTER TABLE tier_override_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Coordinators can view all tier override requests
CREATE POLICY "coordinator_view_tier_overrides"
  ON tier_override_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'coordinator'
    )
  );

-- Auto-update trigger for updated_at
CREATE TRIGGER set_timestamp_tier_override_requests
BEFORE UPDATE ON tier_override_requests
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
