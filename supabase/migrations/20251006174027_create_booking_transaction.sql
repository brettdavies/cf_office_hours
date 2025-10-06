-- ============================================================================
-- Migration: Create Booking Transaction Function
-- Story: 0.11 (Booking Creation API)
-- Created: 2025-10-06
-- ============================================================================
--
-- Creates atomic database function for booking creation.
-- Ensures slot is not double-booked by checking and updating in single transaction.
--
-- Function: create_booking_transaction
-- Purpose: Atomically create booking and mark time slot as booked
-- Returns: Complete booking record as JSONB
--
-- ============================================================================

CREATE OR REPLACE FUNCTION create_booking_transaction(
  p_time_slot_id uuid,
  p_mentor_id uuid,
  p_mentee_id uuid,
  p_meeting_goal text,
  p_meeting_start_time timestamptz,
  p_meeting_end_time timestamptz,
  p_location text
) RETURNS jsonb AS $$
DECLARE
  v_booking_id uuid;
  v_booking_record bookings;
BEGIN
  -- Check if slot exists and is not already booked
  IF NOT EXISTS (
    SELECT 1 FROM time_slots
    WHERE id = p_time_slot_id
    AND is_booked = false
    AND deleted_at IS NULL
  ) THEN
    -- Check if slot exists at all
    IF NOT EXISTS (SELECT 1 FROM time_slots WHERE id = p_time_slot_id) THEN
      RAISE EXCEPTION 'SLOT_NOT_FOUND';
    ELSE
      RAISE EXCEPTION 'SLOT_UNAVAILABLE';
    END IF;
  END IF;

  -- Insert booking record
  INSERT INTO bookings (
    time_slot_id,
    mentor_id,
    mentee_id,
    meeting_goal,
    location,
    status,
    meeting_start_time,
    meeting_end_time,
    created_by,
    updated_by
  ) VALUES (
    p_time_slot_id,
    p_mentor_id,
    p_mentee_id,
    p_meeting_goal,
    p_location,
    'pending',
    p_meeting_start_time,
    p_meeting_end_time,
    p_mentee_id,
    p_mentee_id
  )
  RETURNING id INTO v_booking_id;

  -- Mark time slot as booked and link to booking
  UPDATE time_slots
  SET
    is_booked = true,
    booking_id = v_booking_id,
    updated_by = p_mentee_id
  WHERE id = p_time_slot_id;

  -- Fetch and return complete booking record
  SELECT * INTO v_booking_record
  FROM bookings
  WHERE id = v_booking_id;

  RETURN jsonb_build_object(
    'id', v_booking_record.id,
    'time_slot_id', v_booking_record.time_slot_id,
    'mentor_id', v_booking_record.mentor_id,
    'mentee_id', v_booking_record.mentee_id,
    'meeting_goal', v_booking_record.meeting_goal,
    'status', v_booking_record.status,
    'meeting_start_time', v_booking_record.meeting_start_time,
    'meeting_end_time', v_booking_record.meeting_end_time,
    'created_at', v_booking_record.created_at,
    'updated_at', v_booking_record.updated_at
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_booking_transaction IS 'Story 0.11: Atomically creates booking and marks time slot as booked. Throws SLOT_NOT_FOUND or SLOT_UNAVAILABLE on error.';
