-- Seed Script: Generate 40 tier override requests with realistic data
-- Story: 0.31 - COORD-OVERRIDE-DASHBOARD-001
-- Description: Creates sample tier override requests for coordinator dashboard
-- Idempotent: Deletes existing seed data before inserting

-- Delete existing seed data (idempotent)
DELETE FROM tier_override_requests WHERE created_by IS NOT NULL;

-- Insert 40 tier override requests with realistic data
WITH tier_values AS (
  SELECT 'bronze' as tier, 1 as value
  UNION ALL SELECT 'silver', 2
  UNION ALL SELECT 'gold', 3
  UNION ALL SELECT 'platinum', 4
),
mentee_mentor_pairs AS (
  SELECT
    m1.id as mentee_id,
    m2.id as mentor_id,
    ROW_NUMBER() OVER (ORDER BY RANDOM()) as rn
  FROM users m1
  JOIN tier_values tv1 ON m1.reputation_tier = tv1.tier
  CROSS JOIN users m2
  JOIN tier_values tv2 ON m2.reputation_tier = tv2.tier
  WHERE m1.role = 'mentee'
    AND m2.role = 'mentor'
    AND m1.reputation_tier IS NOT NULL
    AND m2.reputation_tier IS NOT NULL
    AND tv2.value - tv1.value >= 2  -- Mentor tier must be ≥ 2 above mentee
),
reason_pool AS (
  SELECT unnest(ARRAY[
    'I would greatly benefit from this mentor''s expertise in my current stage of growth.',
    'This mentor''s experience aligns perfectly with my business challenges.',
    'I need guidance from someone at this tier level for a critical decision.',
    'This mentor has specific industry knowledge I require urgently.',
    'My company is at an inflection point where higher-tier mentorship is essential.',
    'I''ve been recommended to speak with this mentor by other founders.',
    'This mentor''s background matches my strategic priorities exactly.',
    'I need help navigating a complex situation that requires senior expertise.',
    'Time-sensitive opportunity requires guidance from this specific mentor.',
    'This mentor has offered to help but tier restrictions prevent booking.',
    'Critical fundraising round requires advice from experienced mentor.',
    'Product launch deadline approaching, need specialized guidance.',
    'Facing regulatory challenges that need expert navigation.',
    'Expanding into new market and need mentor with relevant experience.',
    'Technical architecture decision requires senior engineering perspective.'
  ]) as reason
)
INSERT INTO tier_override_requests (
  mentee_id,
  mentor_id,
  reason,
  created_at,
  expires_at,
  created_by
)
SELECT
  p.mentee_id,
  p.mentor_id,
  (SELECT reason FROM reason_pool ORDER BY RANDOM() LIMIT 1),
  created_time,
  created_time + INTERVAL '7 days',
  p.mentee_id
FROM (
  SELECT
    mentee_id,
    mentor_id,
    NOW() - (RANDOM() * INTERVAL '7 days')::interval as created_time
  FROM mentee_mentor_pairs
  WHERE rn <= 40
) p;
