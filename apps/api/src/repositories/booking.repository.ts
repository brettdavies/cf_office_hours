/**
 * Booking Repository - Data access layer for bookings table.
 *
 * Responsibilities:
 * - Execute database queries for bookings table
 * - Call create_booking_transaction database function
 * - Map database rows to TypeScript types
 * - Handle query errors
 * - NO business logic (that belongs in service layer)
 */

// Internal modules
import { createSupabaseClient } from '../lib/db';

// Types
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BookingResponse } from '@cf-office-hours/shared';
import type { Env } from '../types/bindings';

/**
 * Data structure for creating a booking.
 * Maps to create_booking_transaction function parameters.
 */
export interface CreateBookingData {
  time_slot_id: string;
  mentor_id: string;
  mentee_id: string;
  meeting_goal: string;
  meeting_start_time: string;
  meeting_end_time: string;
  location: string;
}

/**
 * Time slot data needed for booking validation.
 * Subset of time_slots table columns.
 */
export interface TimeSlotData {
  id: string;
  mentor_id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

export class BookingRepository {
  private supabase: SupabaseClient;

  constructor(env: Env) {
    this.supabase = createSupabaseClient(env);
  }

  /**
   * Fetches time slot details by ID.
   *
   * Used by service layer to validate slot exists and extract mentor_id.
   * Includes soft-deleted check (deleted_at IS NULL).
   *
   * @param slotId - UUID of the time slot
   * @returns Time slot data or null if not found
   */
  async getTimeSlot(slotId: string): Promise<TimeSlotData | null> {
    const { data, error } = await this.supabase
      .from('time_slots')
      .select('id, mentor_id, start_time, end_time, is_booked')
      .eq('id', slotId)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      console.error('Failed to fetch time slot:', { slotId, error });
      return null;
    }

    return data as TimeSlotData;
  }

  /**
   * Creates a new booking atomically using database transaction function.
   *
   * Calls create_booking_transaction which:
   * 1. Checks slot is available (not booked, not deleted)
   * 2. Inserts booking record with status='pending'
   * 3. Marks time slot as booked
   * 4. Returns complete booking record
   *
   * All operations happen in single transaction - no race conditions.
   *
   * @param data - Booking creation data
   * @returns Created booking with all fields
   * @throws Error with message 'SLOT_NOT_FOUND' or 'SLOT_UNAVAILABLE' if validation fails
   * @throws Error if database operation fails
   */
  async createBooking(data: CreateBookingData): Promise<BookingResponse> {
    const { data: result, error } = await this.supabase.rpc('create_booking_transaction', {
      p_time_slot_id: data.time_slot_id,
      p_mentor_id: data.mentor_id,
      p_mentee_id: data.mentee_id,
      p_meeting_goal: data.meeting_goal,
      p_meeting_start_time: data.meeting_start_time,
      p_meeting_end_time: data.meeting_end_time,
      p_location: data.location,
    });

    if (error) {
      console.error('Failed to create booking:', { data, error });
      // Re-throw with original error message for service layer to handle
      throw new Error(error.message);
    }

    if (!result) {
      console.error('Booking creation returned null:', { data });
      throw new Error('Database error: Booking creation returned null');
    }

    return result as BookingResponse;
  }
}
