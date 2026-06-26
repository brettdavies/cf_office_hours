/**
 * Booking Repository - Data access layer for bookings table.
 *
 * Responsibilities:
 * - Execute database queries for bookings table
 * - Create bookings atomically (guarded slot claim + UNIQUE(time_slot_id) race guard)
 * - Map database rows to TypeScript types
 * - Handle query errors
 * - NO business logic (that belongs in service layer)
 */

// Internal modules
import { BaseRepository } from '../lib/base-repository';
import { newId, nowIso, toBool } from '../lib/d1-utils';

// Types
import type { BookingResponse } from '@cf-office-hours/shared';

/**
 * Data structure for creating a booking.
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

interface MyBookingRow {
  id: string;
  mentor_id: string;
  mentee_id: string;
  time_slot_id: string;
  status: MyBookingData['status'];
  meeting_goal: string;
  created_at: string;
  updated_at: string;
  ts_start: string;
  ts_end: string;
  ts_mentor: string;
  mentor_name: string;
  mentee_name: string;
}

export class BookingRepository extends BaseRepository {
  /**
   * Fetches time slot details by ID (excluding soft-deleted slots).
   *
   * @param slotId - UUID of the time slot
   * @returns Time slot data or null if not found
   */
  async getTimeSlot(slotId: string): Promise<TimeSlotData | null> {
    try {
      const row = await this.db
        .prepare(
          `SELECT id, mentor_id, start_time, end_time, is_booked
           FROM time_slots
           WHERE id = ? AND deleted_at IS NULL`
        )
        .bind(slotId)
        .first<{
          id: string;
          mentor_id: string;
          start_time: string;
          end_time: string;
          is_booked: number;
        }>();

      if (!row) return null;
      return { ...row, is_booked: toBool(row.is_booked) };
    } catch (error) {
      console.error('Failed to fetch time slot:', { slotId, error });
      return null;
    }
  }

  /**
   * Creates a booking atomically.
   *
   * Validates the slot is free, then inserts the booking and marks the slot booked
   * in a single D1 transaction. The UNIQUE(time_slot_id) constraint on bookings
   * makes concurrent bookings of the same slot fail, closing the check-then-act gap.
   *
   * @param data - Booking creation data
   * @returns Created booking with all fields
   * @throws Error 'SLOT_NOT_FOUND' or 'SLOT_UNAVAILABLE' on validation/race failure
   */
  async createBooking(data: CreateBookingData): Promise<BookingResponse> {
    const slot = await this.db
      .prepare(`SELECT is_booked, deleted_at FROM time_slots WHERE id = ?`)
      .bind(data.time_slot_id)
      .first<{ is_booked: number; deleted_at: string | null }>();

    if (!slot) {
      throw new Error('SLOT_NOT_FOUND');
    }
    if (toBool(slot.is_booked) || slot.deleted_at !== null) {
      throw new Error('SLOT_UNAVAILABLE');
    }

    const bookingId = newId();
    const now = nowIso();

    try {
      await this.db.batch([
        this.db
          .prepare(
            `INSERT INTO bookings
               (id, time_slot_id, mentor_id, mentee_id, meeting_goal, location, status,
                meeting_start_time, meeting_end_time, created_by, updated_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            bookingId,
            data.time_slot_id,
            data.mentor_id,
            data.mentee_id,
            data.meeting_goal,
            data.location,
            data.meeting_start_time,
            data.meeting_end_time,
            data.mentee_id,
            data.mentee_id,
            now,
            now
          ),
        this.db
          .prepare(
            `UPDATE time_slots
             SET is_booked = 1, booking_id = ?, updated_by = ?
             WHERE id = ? AND is_booked = 0 AND deleted_at IS NULL`
          )
          .bind(bookingId, data.mentee_id, data.time_slot_id),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/UNIQUE|constraint/i.test(message)) {
        throw new Error('SLOT_UNAVAILABLE');
      }
      console.error('Failed to create booking:', { data, error });
      throw new Error(`Database error: ${message}`);
    }

    const booking = await this.db
      .prepare(`SELECT * FROM bookings WHERE id = ?`)
      .bind(bookingId)
      .first<BookingResponse>();

    if (!booking) {
      throw new Error('Database error: Booking creation returned null');
    }
    return booking;
  }

  /**
   * Fetches user email and profile name for notifications.
   *
   * @param userId - UUID of the user
   * @returns User with email and profile name or null if not found
   */
  async getUserForEmail(userId: string): Promise<{ email: string; name: string } | null> {
    try {
      return await this.db
        .prepare(
          `SELECT u.email AS email, p.name AS name
           FROM users u
           JOIN user_profiles p ON p.user_id = u.id
           WHERE u.id = ?`
        )
        .bind(userId)
        .first<{ email: string; name: string }>();
    } catch (error) {
      console.error('Failed to fetch user for email:', { userId, error });
      return null;
    }
  }

  /**
   * Fetches all bookings for a user (as mentor or mentee) with expanded relations.
   *
   * @param userId - UUID of the authenticated user
   * @returns Array of bookings with expanded relations
   */
  async getMyBookings(userId: string): Promise<MyBookingData[]> {
    let results: MyBookingRow[];
    try {
      const res = await this.db
        .prepare(
          `SELECT
             b.id, b.mentor_id, b.mentee_id, b.time_slot_id, b.status, b.meeting_goal,
             b.created_at, b.updated_at,
             ts.start_time AS ts_start, ts.end_time AS ts_end, ts.mentor_id AS ts_mentor,
             mentor_p.name AS mentor_name,
             mentee_p.name AS mentee_name
           FROM bookings b
           JOIN time_slots ts ON ts.id = b.time_slot_id
           JOIN user_profiles mentor_p ON mentor_p.user_id = b.mentor_id
           JOIN user_profiles mentee_p ON mentee_p.user_id = b.mentee_id
           WHERE b.mentor_id = ? OR b.mentee_id = ?
           ORDER BY b.created_at DESC`
        )
        .bind(userId, userId)
        .all<MyBookingRow>();
      results = res.results ?? [];
    } catch (error) {
      console.error('[BOOKINGS] Failed to fetch user bookings', {
        userId,
        error,
      });
      throw new Error(`Database error: ${error instanceof Error ? error.message : 'unknown'}`);
    }

    return results.map(row => ({
      id: row.id,
      mentor_id: row.mentor_id,
      mentee_id: row.mentee_id,
      time_slot_id: row.time_slot_id,
      status: row.status,
      meeting_goal: row.meeting_goal,
      materials_urls: [],
      created_at: row.created_at,
      updated_at: row.updated_at,
      time_slot: {
        start_time: row.ts_start,
        end_time: row.ts_end,
        mentor_id: row.ts_mentor,
      },
      mentor: {
        id: row.mentor_id,
        profile: { name: row.mentor_name, avatar_url: null },
      },
      mentee: {
        id: row.mentee_id,
        profile: { name: row.mentee_name, avatar_url: null },
      },
    }));
  }
}
