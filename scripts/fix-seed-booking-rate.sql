-- Correct the seed's booking rate from supply-driven to demand-driven.
--
-- The seed books ~50% of *all* time slots and assigns each booking a random
-- mentee (story 0.20). With an alumni-heavy mentor pool (hundreds of mentors,
-- three availability blocks each) and a small current-cohort mentee pool, that
-- rule produces ~100+ bookings per mentee -- nobody books that many meetings in
-- three weeks. The realistic shape is the reverse: each mentee books a handful
-- of meetings, and most mentor slots stay open.
--
-- This keeps a random 3-8 bookings per mentee (a per-mentee target), deletes the
-- rest, frees the slots they held (is_booked = 0, booking_id = NULL), and sets a
-- realistic status mix of ~20% confirmed / ~80% pending (most requests await
-- mentor action). Run once against a freshly seeded D1; run it BEFORE
-- reanchor-seed-dates.sql so that script derives confirmed_at from the final
-- status:
--   cd apps/api && wrangler d1 execute <db-name> --env <env> --remote \
--     --file=../../scripts/fix-seed-booking-rate.sql
--   cd apps/api && wrangler d1 execute <db-name> --env <env> --remote \
--     --file=../../scripts/fix-seed-booking-rate.sql

DROP TABLE IF EXISTS _keep_count;
-- Per-mentee target: 3 + 0..5 = 3..8 bookings to keep.
CREATE TABLE _keep_count AS
  SELECT mentee_id, 3 + abs(random() % 6) AS k FROM bookings GROUP BY mentee_id;

-- Delete each mentee's bookings beyond their target (ranked arbitrarily by id).
DELETE FROM bookings WHERE id IN (
  SELECT id FROM (
    SELECT b.id AS id,
           ROW_NUMBER() OVER (PARTITION BY b.mentee_id ORDER BY b.id) AS rn,
           kc.k AS k
    FROM bookings b
    JOIN _keep_count kc ON kc.mentee_id = b.mentee_id
  )
  WHERE rn > k
);

-- Free every slot whose booking was removed.
UPDATE time_slots
  SET is_booked = 0, booking_id = NULL
  WHERE booking_id IS NOT NULL
    AND booking_id NOT IN (SELECT id FROM bookings);

-- Status mix: ~20% confirmed, ~80% pending (most requests await mentor action).
UPDATE bookings SET status = CASE WHEN abs(random() % 100) < 20 THEN 'confirmed' ELSE 'pending' END;

DROP TABLE _keep_count;
