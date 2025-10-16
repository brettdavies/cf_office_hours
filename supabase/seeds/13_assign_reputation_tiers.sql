-- Seed Script: Assign reputation tiers to existing users
-- Story: 0.31 - COORD-OVERRIDE-DASHBOARD-001
-- Description: Distributes reputation tiers evenly across all mentees and mentors
-- Idempotent: Only assigns if reputation_tier IS NULL

-- Assign tiers to ALL mentees (47 total) - evenly distributed across bronze, silver, gold
WITH ranked_mentees AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) as rn,
    COUNT(*) OVER () as total
  FROM users
  WHERE role = 'mentee'
    AND deleted_at IS NULL
    AND reputation_tier IS NULL
)
UPDATE users
SET reputation_tier =
  CASE
    WHEN rm.rn <= rm.total / 3 THEN 'bronze'       -- ~16 bronze
    WHEN rm.rn <= rm.total * 2 / 3 THEN 'silver'   -- ~16 silver
    ELSE 'gold'                                     -- ~15 gold
  END
FROM ranked_mentees rm
WHERE users.id = rm.id;

-- Assign tiers to ALL mentors (793 total) - evenly distributed across silver, gold, platinum
WITH ranked_mentors AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) as rn,
    COUNT(*) OVER () as total
  FROM users
  WHERE role = 'mentor'
    AND deleted_at IS NULL
    AND reputation_tier IS NULL
)
UPDATE users
SET reputation_tier =
  CASE
    WHEN rm.rn <= rm.total / 3 THEN 'silver'       -- ~264 silver
    WHEN rm.rn <= rm.total * 2 / 3 THEN 'gold'     -- ~264 gold
    ELSE 'platinum'                                 -- ~265 platinum
  END
FROM ranked_mentors rm
WHERE users.id = rm.id;
