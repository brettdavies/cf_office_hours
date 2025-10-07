-- Migration: Update availability table schema to use timestamptz for start_time/end_time
-- Alters the availability table to use full ISO datetime strings (timestamptz) instead of separate date/time fields
-- This aligns the database schema with the API contract and frontend expectations

-- Step 1: Add new timestamptz columns
ALTER TABLE availability
  ADD COLUMN start_time_new timestamptz,
  ADD COLUMN end_time_new timestamptz;

-- Step 2: Migrate existing data (combine date + time into timestamptz)
-- For rows with data, combine start_date + start_time into start_time_new
UPDATE availability
SET
  start_time_new = (start_date + start_time)::timestamptz,
  end_time_new = (COALESCE(end_date, start_date) + end_time)::timestamptz
WHERE start_date IS NOT NULL AND start_time IS NOT NULL;

-- Step 3: Drop old columns
ALTER TABLE availability
  DROP COLUMN start_date,
  DROP COLUMN end_date,
  DROP COLUMN start_time,
  DROP COLUMN end_time;

-- Step 4: Rename new columns to replace old ones
ALTER TABLE availability
  RENAME COLUMN start_time_new TO start_time;
ALTER TABLE availability
  RENAME COLUMN end_time_new TO end_time;

-- Step 5: Add NOT NULL constraints
ALTER TABLE availability
  ALTER COLUMN start_time SET NOT NULL,
  ALTER COLUMN end_time SET NOT NULL;

-- Step 6: Re-add CHECK constraint for time range
ALTER TABLE availability
  DROP CONSTRAINT IF EXISTS chk_availability_time_range,
  ADD CONSTRAINT chk_availability_time_range CHECK (end_time > start_time);

-- Step 7: Drop the date range constraint (no longer needed)
ALTER TABLE availability
  DROP CONSTRAINT IF EXISTS chk_availability_date_range;

-- Update table comment
COMMENT ON TABLE availability IS 'v2.5: Mentor availability blocks using timestamptz for start/end times';
COMMENT ON COLUMN availability.start_time IS 'Start datetime (ISO 8601 format with timezone)';
COMMENT ON COLUMN availability.end_time IS 'End datetime (ISO 8601 format with timezone)';
