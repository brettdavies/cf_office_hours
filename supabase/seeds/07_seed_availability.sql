-- ============================================================================
-- Supabase Seed File - Loads availability and time slot sample data
-- ============================================================================
-- This file creates realistic availability blocks and time slots for local
-- development and testing.
--
-- Data Generated:
-- - Availability blocks for ALL mentors (400 mentors × 3 weeks = 1200 blocks)
-- - Dynamic time slots based on availability duration
-- - Random times between 8am-8pm, random durations (15, 30, or 60 minutes)
--
-- Usage: Run individually as needed: \i supabase/seeds/07_seed_availability.sql
-- Note: Uses dynamic date calculation (NOW() + intervals) for always-upcoming data
-- ============================================================================

-- Clear existing data (for idempotency)
DELETE FROM bookings WHERE created_at IS NOT NULL;
DELETE FROM time_slots WHERE created_at IS NOT NULL;
DELETE FROM availability WHERE created_at IS NOT NULL;

-- ============================================================================
-- Step 1: Create Availability Blocks for All Mentors
-- ============================================================================
-- Each mentor gets 3 availability blocks (one per week)
-- Week 1: 1-7 days out, Week 2: 8-14 days out, Week 3: 15-21 days out
-- Random times between 8am-8pm, random durations (15/30/60 min)

DO $$
DECLARE
  mentor_record RECORD;
  location_options TEXT[] := ARRAY[
    'CF San Francisco Office - 123 Main St',
    'CF New York Office - 456 Park Ave',
    'Online - Google Meet',
    'Online - Zoom',
    'Coffee shop near Union Square'
  ];
  week_offset INT;
  random_day_offset INT;
  random_hour_offset INT;
  start_datetime TIMESTAMPTZ;
  slot_duration_mins INT;
  random_block_hours INT;
BEGIN
  -- Loop through ALL mentors
  FOR mentor_record IN
    SELECT u.id as mentor_id
    FROM users u
    WHERE u.role = 'mentor' AND u.deleted_by IS NULL
  LOOP
    -- Create 3 availability blocks (one per week)
    FOR week_offset IN 1..3 LOOP
      -- Random day within the week range
      random_day_offset := CASE week_offset
        WHEN 1 THEN 1 + floor(random() * 7)::int  -- Days 1-7
        WHEN 2 THEN 8 + floor(random() * 7)::int  -- Days 8-14
        WHEN 3 THEN 15 + floor(random() * 7)::int -- Days 15-21
      END;

      -- Random hour between 8am (8) and 8pm (20)
      random_hour_offset := 8 + floor(random() * 12)::int;

      -- Random duration: 15, 30, or 60 minutes (must match schema constraint)
      slot_duration_mins := CASE floor(random() * 3)::int
        WHEN 0 THEN 15
        WHEN 1 THEN 30
        ELSE 60
      END;

      -- Calculate start datetime
      start_datetime := NOW() +
        (INTERVAL '1 day' * random_day_offset) +
        (INTERVAL '1 hour' * random_hour_offset);

      -- Random block duration: 1-3 hours for realistic availability windows
      random_block_hours := 1 + floor(random() * 3)::int;

      -- Insert availability block
      INSERT INTO availability (
        mentor_id,
        start_time,
        end_time,
        slot_duration_minutes,
        location
      ) VALUES (
        mentor_record.mentor_id,
        start_datetime,
        start_datetime + (INTERVAL '1 hour' * random_block_hours),
        slot_duration_mins,
        location_options[1 + floor(random() * array_length(location_options, 1))::int]
      );
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- Step 2: Generate Time Slots from Availability Blocks
-- ============================================================================
-- For each availability block, create individual time slots based on duration

DO $$
DECLARE
  avail_record RECORD;
  slot_start TIMESTAMPTZ;
  slot_end TIMESTAMPTZ;
BEGIN
  FOR avail_record IN
    SELECT id, mentor_id, start_time, end_time, slot_duration_minutes
    FROM availability
    WHERE deleted_at IS NULL
  LOOP
    slot_start := avail_record.start_time;

    -- Generate slots for the availability duration
    WHILE slot_start + (INTERVAL '1 minute' * avail_record.slot_duration_minutes) <= avail_record.end_time LOOP
      slot_end := slot_start + (INTERVAL '1 minute' * avail_record.slot_duration_minutes);

      INSERT INTO time_slots (
        availability_id,
        mentor_id,
        start_time,
        end_time,
        is_booked
      ) VALUES (
        avail_record.id,
        avail_record.mentor_id,
        slot_start,
        slot_end,
        false
      );

      slot_start := slot_end;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- Verification Queries (for manual testing)
-- ============================================================================

-- Count availability blocks (should be 1200 for 400 mentors × 3 weeks)
SELECT 'Availability blocks created: ' || COUNT(*) as result
FROM availability WHERE deleted_at IS NULL;

-- Count time slots (should be 4800-7200 slots with 1-3 hour blocks)
SELECT 'Time slots created: ' || COUNT(*) as result
FROM time_slots WHERE deleted_at IS NULL;
