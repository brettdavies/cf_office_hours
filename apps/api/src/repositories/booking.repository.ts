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

/**
 * Expanded booking with mentor, mentee, and time_slot relations.
 * Used for GET /v1/bookings/my-bookings response.
 */
export interface MyBookingData {
  id: string;
  mentor_id: string;
  mentee_id: string;
  time_slot_id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'canceled' | 'expired';
  meeting_goal: string;
  materials_urls: string[];
  created_at: string;
  updated_at: string;
  time_slot: {
    start_time: string;
    end_time: string;
    mentor_id: string;
  };
  mentor: {
    id: string;
    profile: {
      name: string;
      avatar_url: string | null;
    };
  };
  mentee: {
    id: string;
    profile: {
      name: string;
      avatar_url: string | null;
    };
  };
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

  /**
   * Fetches user details for email notifications.
   *
   * Returns user email and profile name needed for sending notifications.
   *
   * @param userId - UUID of the user
   * @returns User with email and profile name or null if not found
   */
  async getUserForEmail(userId: string): Promise<{ email: string; name: string } | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select(
        `
        email,
        profile:profiles!inner (
          name
        )
      `
      )
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('Failed to fetch user for email:', { userId, error });
      return null;
    }

    // Extract profile name (Supabase may return as array or object)
    const profile = Array.isArray(data.profile) ? data.profile[0] : data.profile;

    return {
      email: data.email,
      name: profile.name,
    };
  }

  /**
   * Fetches all bookings for a user (as mentor or mentee) with expanded relations.
   *
   * Returns bookings with mentor, mentee, and time_slot data expanded.
   * Used by GET /v1/bookings/my-bookings endpoint.
   *
   * @param userId - UUID of the authenticated user
   * @returns Array of bookings with expanded relations
   * @throws Error if database operation fails
   */
  async getMyBookings(userId: string): Promise<MyBookingData[]> {
    const { data, error } = await this.supabase
      .from('bookings')
      .select(
        `
        id,
        mentor_id,
        mentee_id,
        time_slot_id,
        status,
        meeting_goal,
        materials_urls,
        created_at,
        updated_at,
        time_slot:time_slots!inner (
          start_time,
          end_time,
          mentor_id
        ),
        mentor:users!bookings_mentor_id_fkey (
          id,
          profile:profiles!inner (
            name,
            avatar_url
          )
        ),
        mentee:users!bookings_mentee_id_fkey (
          id,
          profile:profiles!inner (
            name,
            avatar_url
          )
        )
      `
      )
      .or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch user bookings:', { userId, error });
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    // Type assertion and data transformation
    return data.map(booking => ({
      id: booking.id,
      mentor_id: booking.mentor_id,
      mentee_id: booking.mentee_id,
      time_slot_id: booking.time_slot_id,
      status: booking.status as MyBookingData['status'],
      meeting_goal: booking.meeting_goal,
      materials_urls: booking.materials_urls || [],
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      time_slot: Array.isArray(booking.time_slot)
        ? booking.time_slot[0]
        : booking.time_slot,
      mentor: {
        id: (booking.mentor as any).id,
        profile: {
          name: Array.isArray((booking.mentor as any).profile)
            ? (booking.mentor as any).profile[0].name
            : (booking.mentor as any).profile.name,
          avatar_url: Array.isArray((booking.mentor as any).profile)
            ? (booking.mentor as any).profile[0].avatar_url
            : (booking.mentor as any).profile.avatar_url,
        },
      },
      mentee: {
        id: (booking.mentee as any).id,
        profile: {
          name: Array.isArray((booking.mentee as any).profile)
            ? (booking.mentee as any).profile[0].name
            : (booking.mentee as any).profile.name,
          avatar_url: Array.isArray((booking.mentee as any).profile)
            ? (booking.mentee as any).profile[0].avatar_url
            : (booking.mentee as any).profile.avatar_url,
        },
      },
    })) as MyBookingData[];
  }
}
