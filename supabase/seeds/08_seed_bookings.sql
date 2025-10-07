-- ============================================================================
-- Supabase Seed File - Loads booking sample data
-- ============================================================================
-- This file creates realistic booking data for local development and testing.
-- Must be run AFTER 07_seed_availability.sql which creates availability blocks
-- and time slots.
--
-- Data Generated:
-- - ~50% of available time slots have bookings
-- - 50/50 split between pending and confirmed bookings
-- - Random mentee assignments
-- - Random meeting goals from predefined templates
--
-- Usage: Run individually as needed: \i supabase/seeds/08_seed_bookings.sql
-- ============================================================================

-- Clear existing bookings (for idempotency)
DELETE FROM bookings WHERE created_at IS NOT NULL;

-- Reset is_booked flag and booking_id on all time slots
UPDATE time_slots SET is_booked = false, booking_id = NULL WHERE is_booked = true;

-- ============================================================================
-- Create Bookings for ~50% of Time Slots
-- ============================================================================
-- Random selection of slots, random mentees, random meeting goals
-- 50/50 split between pending and confirmed status

DO $$
DECLARE
  slot_record RECORD;
  mentee_ids UUID[];
  selected_mentee_id UUID;
  meeting_goals TEXT[] := ARRAY[
    'Discuss fundraising strategy',
    'Get feedback on product roadmap',
    'Review pitch deck',
    'Explore partnership opportunities',
    'Career mentorship session',
    'Technical architecture review',
    'Go-to-market strategy discussion'
  ];
  selected_goal TEXT;
  booking_status TEXT;
  new_booking_id UUID;
BEGIN
  -- Get mentee IDs (excluding those with @gmail.com or @capitalfactory.com domains)
  SELECT ARRAY_AGG(id) INTO mentee_ids
  FROM users
  WHERE role = 'mentee'
  AND deleted_by IS NULL
  AND email NOT LIKE '%@gmail.com'
  AND email NOT LIKE '%@capitalfactory.com';

  -- Select random 50% of slots for bookings (from mentors without target domains)
  FOR slot_record IN
    SELECT ts.id, ts.start_time, ts.end_time, a.mentor_id
    FROM time_slots ts
    INNER JOIN availability a ON ts.availability_id = a.id
    INNER JOIN users u ON a.mentor_id = u.id
    WHERE ts.deleted_at IS NULL
    AND u.email NOT LIKE '%@gmail.com'
    AND u.email NOT LIKE '%@capitalfactory.com'
    ORDER BY RANDOM()
    LIMIT (SELECT FLOOR(COUNT(*) * 0.5) FROM time_slots ts
           INNER JOIN availability a ON ts.availability_id = a.id
           INNER JOIN users u ON a.mentor_id = u.id
           WHERE ts.deleted_at IS NULL
           AND u.email NOT LIKE '%@gmail.com'
           AND u.email NOT LIKE '%@capitalfactory.com')
  LOOP
    -- Random mentee (from mentees without target domains)
    selected_mentee_id := mentee_ids[1 + floor(random() * array_length(mentee_ids, 1))::int];

    -- Random meeting goal
    selected_goal := meeting_goals[1 + floor(random() * array_length(meeting_goals, 1))::int];

    -- Random status: 50% pending, 50% confirmed
    booking_status := CASE WHEN random() < 0.5 THEN 'pending' ELSE 'confirmed' END;

    -- Create booking (get location from availability, times from slot)
    INSERT INTO bookings (
      time_slot_id,
      mentee_id,
      mentor_id,
      meeting_goal,
      location,
      meeting_start_time,
      meeting_end_time,
      status
    ) VALUES (
      slot_record.id,
      selected_mentee_id,
      slot_record.mentor_id,
      selected_goal,
      (SELECT location FROM availability WHERE id = (SELECT availability_id FROM time_slots WHERE id = slot_record.id)),
      slot_record.start_time,
      slot_record.end_time,
      booking_status
    )
    RETURNING id INTO new_booking_id;

    -- Mark slot as booked and link to booking
    UPDATE time_slots
    SET is_booked = true,
        booking_id = new_booking_id
    WHERE id = slot_record.id;
  END LOOP;
END $$;

-- ============================================================================
-- Verification Queries (for manual testing)
-- ============================================================================

-- Count bookings
SELECT 'Bookings created: ' || COUNT(*) as result
FROM bookings WHERE deleted_at IS NULL;

-- Booking percentage
SELECT 'Booking percentage: ' ||
  COALESCE(
    ROUND((SELECT COUNT(*)::numeric FROM bookings WHERE deleted_at IS NULL) /
          NULLIF((SELECT COUNT(*)::numeric FROM time_slots WHERE deleted_at IS NULL), 0) * 100, 2),
    0
  ) || '%' as result;

-- Status distribution
SELECT
  'Status distribution - ' || status || ': ' || COUNT(*) as result
FROM bookings
WHERE deleted_at IS NULL
GROUP BY status;
