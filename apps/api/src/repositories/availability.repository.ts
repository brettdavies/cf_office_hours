/**
 * Availability Repository - Data access layer for availability table.
 *
 * Responsibilities:
 * - Execute database queries for availability table
 * - Map database rows to TypeScript types
 * - Handle query errors
 * - NO business logic (that belongs in service layer)
 */

// Internal modules
import { BaseRepository } from '../lib/base-repository';
import { newId, nowIso } from '../lib/d1-utils';

// Types
import type {
  AvailabilityBlockResponse,
  GetAvailableSlotsQuery,
  TimeSlotResponse,
} from '@cf-office-hours/shared';

/**
 * Data structure for creating availability blocks.
 * Maps to availability table columns.
 */
export interface CreateAvailabilityBlockData {
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  buffer_minutes?: number; // Optional - defaults to 0 if not provided
  meeting_type: 'online';
  description?: string;
}

interface AvailableSlotRow {
  id: string;
  availability_id: string;
  mentor_id: string;
  start_time: string;
  end_time: string;
  created_at: string;
  slot_duration_minutes: number;
  mentor_user_id: string;
  mentor_name: string;
}

export class AvailabilityRepository extends BaseRepository {
  /**
   * Creates a new one-time availability block for a mentor and generates its time slots.
   *
   * @param mentorId - UUID of the mentor creating the block
   * @param data - Availability block data from request
   * @returns Created availability block with all fields
   * @throws Error if database insert fails
   */
  async create(
    mentorId: string,
    data: CreateAvailabilityBlockData
  ): Promise<AvailabilityBlockResponse> {
    const id = newId();
    const now = nowIso();

    const block = await this.db
      .prepare(
        `INSERT INTO availability
           (id, mentor_id, start_time, end_time, slot_duration_minutes, location,
            created_by, updated_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'online', ?, ?, ?, ?)
         RETURNING *`
      )
      .bind(
        id,
        mentorId,
        data.start_time,
        data.end_time,
        data.slot_duration_minutes,
        mentorId,
        mentorId,
        now,
        now
      )
      .first<AvailabilityBlockResponse>();

    if (!block) {
      console.error('Failed to create availability block:', { mentorId });
      throw new Error('Database error: Failed to create availability block');
    }

    try {
      await this.generateTimeSlots(
        block.id,
        mentorId,
        data.start_time,
        data.end_time,
        data.slot_duration_minutes
      );
    } catch (slotError) {
      console.error('[ERROR] Failed to generate time slots', {
        blockId: block.id,
        mentorId,
        error: slotError instanceof Error ? slotError.message : 'Unknown error',
      });
      // The availability block was created; slots can be regenerated later.
    }

    return block;
  }

  /**
   * Generates individual time slots for an availability block.
   *
   * @param availabilityId - UUID of the availability block
   * @param mentorId - UUID of the mentor
   * @param startTime - Start time of the availability block (ISO 8601)
   * @param endTime - End time of the availability block (ISO 8601)
   * @param slotDurationMinutes - Duration of each slot in minutes
   */
  private async generateTimeSlots(
    availabilityId: string,
    mentorId: string,
    startTime: string,
    endTime: string,
    slotDurationMinutes: number
  ): Promise<void> {
    const end = new Date(endTime);
    let currentSlotStart = new Date(startTime);

    const insert = this.db.prepare(
      `INSERT INTO time_slots
         (id, availability_id, mentor_id, start_time, end_time, is_booked, created_by)
       VALUES (?, ?, ?, ?, ?, 0, ?)`
    );
    const statements = [];

    while (currentSlotStart < end) {
      const currentSlotEnd = new Date(currentSlotStart.getTime() + slotDurationMinutes * 60 * 1000);
      if (currentSlotEnd <= end) {
        statements.push(
          insert.bind(
            newId(),
            availabilityId,
            mentorId,
            currentSlotStart.toISOString(),
            currentSlotEnd.toISOString(),
            mentorId
          )
        );
      }
      currentSlotStart = currentSlotEnd;
    }

    if (statements.length === 0) {
      console.warn('[AVAILABILITY] No slots generated - duration too large for time range', {
        availabilityId,
        slotDurationMinutes,
      });
      return;
    }

    await this.db.batch(statements);
  }

  /**
   * Fetches all non-deleted availability blocks for a specific mentor.
   *
   * @param mentorId - UUID of the mentor
   * @returns Array of availability blocks (may be empty)
   */
  async findByMentor(mentorId: string): Promise<AvailabilityBlockResponse[]> {
    try {
      const { results } = await this.db
        .prepare(
          `SELECT * FROM availability
           WHERE mentor_id = ? AND deleted_at IS NULL
           ORDER BY start_time ASC`
        )
        .bind(mentorId)
        .all<AvailabilityBlockResponse>();
      return results ?? [];
    } catch (error) {
      console.error('Failed to fetch availability blocks:', { mentorId, error });
      return [];
    }
  }

  /**
   * Fetches a single non-deleted availability block by ID.
   *
   * @param id - UUID of the availability block
   * @returns Availability block or null if not found
   */
  async findById(id: string): Promise<AvailabilityBlockResponse | null> {
    try {
      return await this.db
        .prepare(`SELECT * FROM availability WHERE id = ? AND deleted_at IS NULL`)
        .bind(id)
        .first<AvailabilityBlockResponse>();
    } catch (error) {
      console.error('Failed to fetch availability block:', { id, error });
      return null;
    }
  }

  /**
   * Fetches available time slots with optional filtering, joined with mentor info.
   *
   * @param query - Query parameters for filtering slots
   * @returns Array of time slots with nested mentor information
   */
  async findAvailableSlots(query: GetAvailableSlotsQuery): Promise<TimeSlotResponse[]> {
    const conditions = ['ts.is_booked = 0', 'ts.deleted_at IS NULL'];
    const params: Array<string | number> = [];

    if (query.mentor_id) {
      conditions.push('ts.mentor_id = ?');
      params.push(query.mentor_id);
    }
    if (query.start_date) {
      conditions.push('ts.start_time >= ?');
      params.push(`${query.start_date}T00:00:00Z`);
    }
    if (query.end_date) {
      conditions.push('ts.start_time <= ?');
      params.push(`${query.end_date}T23:59:59Z`);
    }

    params.push(query.limit ?? 50);

    const sql = `
      SELECT
        ts.id, ts.availability_id, ts.mentor_id, ts.start_time, ts.end_time, ts.created_at,
        a.slot_duration_minutes AS slot_duration_minutes,
        mu.id AS mentor_user_id, mp.name AS mentor_name
      FROM time_slots ts
      JOIN availability a ON a.id = ts.availability_id
      JOIN users mu ON mu.id = ts.mentor_id
      JOIN user_profiles mp ON mp.user_id = mu.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ts.start_time ASC
      LIMIT ?`;

    try {
      const { results } = await this.db
        .prepare(sql)
        .bind(...params)
        .all<AvailableSlotRow>();

      return (results ?? []).map(row => ({
        id: row.id,
        availability_id: row.availability_id,
        mentor_id: row.mentor_id,
        start_time: row.start_time,
        end_time: row.end_time,
        slot_duration_minutes: row.slot_duration_minutes,
        is_booked: false,
        mentor: {
          id: row.mentor_user_id,
          name: row.mentor_name,
          avatar_url: null,
        },
        created_at: row.created_at,
      }));
    } catch (error) {
      console.error('[AVAILABILITY] Failed to fetch available slots', {
        query,
        error,
      });
      throw new Error(`Database error: ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }
}
