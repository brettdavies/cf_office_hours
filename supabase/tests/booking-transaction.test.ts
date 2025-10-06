/**
 * Database Function Tests: create_booking_transaction
 *
 * Tests the atomic booking creation database function that:
 * - Validates slot availability (not booked, not deleted)
 * - Inserts booking record with status='pending'
 * - Marks time slot as booked
 * - Returns complete booking record
 *
 * Story: 0.11 (Booking Creation API)
 * Migration: 20251006120000_create_booking_transaction.sql
 *
 * TODO: Fix test data setup to match v2.4 minimal schema
 * The availability table schema in the migration differs from availability_blocks
 * used in Story 0.9. Tests need to be updated to use the correct columns:
 * - start_date/end_date (date) instead of start_time/end_time (timestamptz)
 * - start_time/end_time (time) for time-of-day
 * - location (text) instead of meeting_type/buffer_minutes
 *
 * For now, booking transaction function is tested via:
 * - Service layer unit tests (BookingService.test.ts)
 * - Route integration tests (bookings.test.ts)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { supabase } from './test-client';

describe('Database Function: create_booking_transaction', () => {
  // Test data UUIDs
  const mentorId = '00000000-0000-0000-0000-000000000001';
  const menteeId = '00000000-0000-0000-0000-000000000002';
  let availabilityId: string;
  let timeSlotId: string;

  beforeEach(async () => {
    // Clean up any existing test data
    await supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('time_slots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase
      .from('availability')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert test users
    await supabase.from('users').insert([
      {
        id: mentorId,
        airtable_record_id: 'test-mentor-airtable-id',
        email: 'mentor@test.com',
        role: 'mentor',
      },
      {
        id: menteeId,
        airtable_record_id: 'test-mentee-airtable-id',
        email: 'mentee@test.com',
        role: 'mentee',
      },
    ]);

    // Insert availability block
    const { data: availability, error: availError } = await supabase
      .from('availability')
      .insert({
        mentor_id: mentorId,
        recurrence_pattern: 'one_time',
        start_time: '2025-10-15T19:00:00Z',
        end_time: '2025-10-15T20:00:00Z',
        slot_duration_minutes: 30,
        buffer_minutes: 0,
        meeting_type: 'online',
        created_by: mentorId,
        updated_by: mentorId,
      })
      .select('id')
      .single();

    if (availError || !availability) {
      throw new Error(`Failed to insert availability: ${availError?.message}`);
    }

    availabilityId = availability.id;

    // Insert time slot
    const { data: slot } = await supabase
      .from('time_slots')
      .insert({
        availability_id: availabilityId,
        mentor_id: mentorId,
        start_time: '2025-10-15T19:00:00Z',
        end_time: '2025-10-15T19:30:00Z',
        is_booked: false,
        created_by: mentorId,
      })
      .select('id')
      .single();

    timeSlotId = slot!.id;
  });

  afterEach(async () => {
    // Clean up test data
    await supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('time_slots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase
      .from('availability')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  });

  it('should create booking and mark slot as booked atomically', async () => {
    const { data, error } = await supabase.rpc('create_booking_transaction', {
      p_time_slot_id: timeSlotId,
      p_mentor_id: mentorId,
      p_mentee_id: menteeId,
      p_meeting_goal: 'Discuss product-market fit strategy for early-stage SaaS startup',
      p_meeting_start_time: '2025-10-15T19:00:00Z',
      p_meeting_end_time: '2025-10-15T19:30:00Z',
      p_location: 'online',
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.id).toBeDefined();
    expect(data.time_slot_id).toBe(timeSlotId);
    expect(data.mentor_id).toBe(mentorId);
    expect(data.mentee_id).toBe(menteeId);
    expect(data.status).toBe('pending');
    expect(data.meeting_goal).toBe(
      'Discuss product-market fit strategy for early-stage SaaS startup'
    );
  });

  it('should mark time slot as booked after booking creation', async () => {
    // Create booking
    const { data: bookingData } = await supabase.rpc('create_booking_transaction', {
      p_time_slot_id: timeSlotId,
      p_mentor_id: mentorId,
      p_mentee_id: menteeId,
      p_meeting_goal: 'Discuss product strategy',
      p_meeting_start_time: '2025-10-15T19:00:00Z',
      p_meeting_end_time: '2025-10-15T19:30:00Z',
      p_location: 'online',
    });

    // Verify time slot is marked as booked
    const { data: slot, error: slotError } = await supabase
      .from('time_slots')
      .select('is_booked, booking_id')
      .eq('id', timeSlotId)
      .single();

    expect(slotError).toBeNull();
    expect(slot?.is_booked).toBe(true);
    expect(slot?.booking_id).toBe(bookingData.id);
  });

  it('should reject booking when slot does not exist', async () => {
    const nonexistentSlotId = '00000000-0000-0000-0000-999999999999';

    const { error } = await supabase.rpc('create_booking_transaction', {
      p_time_slot_id: nonexistentSlotId,
      p_mentor_id: mentorId,
      p_mentee_id: menteeId,
      p_meeting_goal: 'Discuss product strategy',
      p_meeting_start_time: '2025-10-15T19:00:00Z',
      p_meeting_end_time: '2025-10-15T19:30:00Z',
      p_location: 'online',
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain('SLOT_NOT_FOUND');
  });

  it('should reject booking when slot is already booked', async () => {
    // Create first booking
    await supabase.rpc('create_booking_transaction', {
      p_time_slot_id: timeSlotId,
      p_mentor_id: mentorId,
      p_mentee_id: menteeId,
      p_meeting_goal: 'First booking',
      p_meeting_start_time: '2025-10-15T19:00:00Z',
      p_meeting_end_time: '2025-10-15T19:30:00Z',
      p_location: 'online',
    });

    // Attempt second booking on same slot
    const { error } = await supabase.rpc('create_booking_transaction', {
      p_time_slot_id: timeSlotId,
      p_mentor_id: mentorId,
      p_mentee_id: menteeId,
      p_meeting_goal: 'Second booking',
      p_meeting_start_time: '2025-10-15T19:00:00Z',
      p_meeting_end_time: '2025-10-15T19:30:00Z',
      p_location: 'online',
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain('SLOT_UNAVAILABLE');
  });

  it('should reject booking when slot is soft-deleted', async () => {
    // Soft-delete the time slot
    await supabase
      .from('time_slots')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', timeSlotId);

    const { error } = await supabase.rpc('create_booking_transaction', {
      p_time_slot_id: timeSlotId,
      p_mentor_id: mentorId,
      p_mentee_id: menteeId,
      p_meeting_goal: 'Discuss product strategy',
      p_meeting_start_time: '2025-10-15T19:00:00Z',
      p_meeting_end_time: '2025-10-15T19:30:00Z',
      p_location: 'online',
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain('SLOT_NOT_FOUND');
  });

  it('should set booking status to pending (Epic 0)', async () => {
    const { data } = await supabase.rpc('create_booking_transaction', {
      p_time_slot_id: timeSlotId,
      p_mentor_id: mentorId,
      p_mentee_id: menteeId,
      p_meeting_goal: 'Discuss product strategy',
      p_meeting_start_time: '2025-10-15T19:00:00Z',
      p_meeting_end_time: '2025-10-15T19:30:00Z',
      p_location: 'online',
    });

    expect(data.status).toBe('pending');
  });

  it('should set created_by and updated_by to mentee_id', async () => {
    const { data } = await supabase.rpc('create_booking_transaction', {
      p_time_slot_id: timeSlotId,
      p_mentor_id: mentorId,
      p_mentee_id: menteeId,
      p_meeting_goal: 'Discuss product strategy',
      p_meeting_start_time: '2025-10-15T19:00:00Z',
      p_meeting_end_time: '2025-10-15T19:30:00Z',
      p_location: 'online',
    });

    // Verify audit columns via direct query
    const { data: booking } = await supabase
      .from('bookings')
      .select('created_by, updated_by')
      .eq('id', data.id)
      .single();

    expect(booking?.created_by).toBe(menteeId);
    expect(booking?.updated_by).toBe(menteeId);
  });

  it('should return complete booking record with timestamps', async () => {
    const { data } = await supabase.rpc('create_booking_transaction', {
      p_time_slot_id: timeSlotId,
      p_mentor_id: mentorId,
      p_mentee_id: menteeId,
      p_meeting_goal: 'Discuss product strategy',
      p_meeting_start_time: '2025-10-15T19:00:00Z',
      p_meeting_end_time: '2025-10-15T19:30:00Z',
      p_location: 'online',
    });

    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('time_slot_id');
    expect(data).toHaveProperty('mentor_id');
    expect(data).toHaveProperty('mentee_id');
    expect(data).toHaveProperty('meeting_goal');
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('meeting_start_time');
    expect(data).toHaveProperty('meeting_end_time');
    expect(data).toHaveProperty('created_at');
    expect(data).toHaveProperty('updated_at');
  });
});
