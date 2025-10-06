/**
 * Availability Repository - Data access layer for availability_blocks table.
 *
 * Responsibilities:
 * - Execute database queries for availability_blocks table
 * - Map database rows to TypeScript types
 * - Handle query errors
 * - NO business logic (that belongs in service layer)
 */

// Internal modules
import { createSupabaseClient } from '../lib/db';

// Types
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AvailabilityBlockResponse,
  GetAvailableSlotsQuery,
  TimeSlotResponse,
} from '@cf-office-hours/shared';
import type { Env } from '../types/bindings';

/**
 * Data structure for creating availability blocks.
 * Maps to availability_blocks table columns.
 */
export interface CreateAvailabilityBlockData {
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  buffer_minutes?: number; // Optional - defaults to 0 if not provided
  meeting_type: 'online';
  description?: string;
}

export class AvailabilityRepository {
  private supabase: SupabaseClient;

  constructor(env: Env) {
    this.supabase = createSupabaseClient(env);
  }

  /**
   * Creates a new one-time availability block for a mentor.
   *
   * Automatically sets:
   * - recurrence_pattern to 'one_time'
   * - created_by/updated_by to mentorId
   * - created_at/updated_at to NOW() (database default)
   * - start_date/end_date to NULL (one-time blocks use start_time/end_time)
   * - location_preset_id/location_custom to NULL (online meetings)
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
    const { data: block, error } = await this.supabase
      .from('availability_blocks')
      .insert({
        mentor_id: mentorId,
        recurrence_pattern: 'one_time',
        start_date: null,
        end_date: null,
        start_time: data.start_time,
        end_time: data.end_time,
        slot_duration_minutes: data.slot_duration_minutes,
        buffer_minutes: data.buffer_minutes ?? 0,
        meeting_type: data.meeting_type,
        location_preset_id: null,
        location_custom: null,
        description: data.description ?? null,
        created_by: mentorId,
        updated_by: mentorId,
      })
      .select()
      .single();

    if (error || !block) {
      console.error('Failed to create availability block:', { mentorId, error });
      throw new Error(`Database error: ${error?.message || 'Failed to create availability block'}`);
    }

    return block as AvailabilityBlockResponse;
  }

  /**
   * Fetches all availability blocks for a specific mentor.
   *
   * Includes soft-deleted blocks (deleted_at IS NOT NULL) for audit purposes.
   * Filters by deleted_at in service layer if needed.
   *
   * @param mentorId - UUID of the mentor
   * @returns Array of availability blocks (may be empty)
   */
  async findByMentor(mentorId: string): Promise<AvailabilityBlockResponse[]> {
    const { data, error } = await this.supabase
      .from('availability_blocks')
      .select('*')
      .eq('mentor_id', mentorId)
      .is('deleted_at', null)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Failed to fetch availability blocks:', { mentorId, error });
      return [];
    }

    return (data || []) as AvailabilityBlockResponse[];
  }

  /**
   * Fetches a single availability block by ID.
   *
   * @param id - UUID of the availability block
   * @returns Availability block or null if not found
   */
  async findById(id: string): Promise<AvailabilityBlockResponse | null> {
    const { data, error } = await this.supabase
      .from('availability_blocks')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      console.error('Failed to fetch availability block:', { id, error });
      return null;
    }

    return data as AvailabilityBlockResponse;
  }

  /**
   * Fetches available time slots with optional filtering.
   *
   * Joins time_slots with users and profiles tables to include mentor information.
   * Filters out booked slots and applies optional query parameters.
   *
   * @param query - Query parameters for filtering slots
   * @returns Array of time slots with nested mentor information
   */
  async findAvailableSlots(query: GetAvailableSlotsQuery): Promise<TimeSlotResponse[]> {
    let queryBuilder = this.supabase
      .from('time_slots')
      .select(
        `
        id,
        availability_id,
        mentor_id,
        start_time,
        end_time,
        created_at,
        availability:availability_blocks!inner(slot_duration_minutes, meeting_type),
        mentor:users!inner(
          id,
          profiles!inner(name, avatar_url)
        )
      `
      )
      .eq('is_booked', false)
      .is('deleted_at', null)
      .order('start_time', { ascending: true });

    // Apply filters
    if (query.mentor_id) {
      queryBuilder = queryBuilder.eq('mentor_id', query.mentor_id);
    }

    if (query.start_date) {
      queryBuilder = queryBuilder.gte('start_time', `${query.start_date}T00:00:00Z`);
    }

    if (query.end_date) {
      queryBuilder = queryBuilder.lte('start_time', `${query.end_date}T23:59:59Z`);
    }

    if (query.meeting_type) {
      queryBuilder = queryBuilder.eq('availability.meeting_type', query.meeting_type);
    }

    // Apply limit
    const limit = query.limit ?? 50;
    queryBuilder = queryBuilder.limit(limit);

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Failed to fetch available slots:', { query, error });
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    // Transform nested data into flat TimeSlotResponse structure
    return data.map((row: any) => ({
      id: row.id,
      availability_id: row.availability_id,
      mentor_id: row.mentor_id,
      start_time: row.start_time,
      end_time: row.end_time,
      slot_duration_minutes: row.availability.slot_duration_minutes,
      is_booked: false, // Already filtered by is_booked = false
      mentor: {
        id: row.mentor.id,
        name: row.mentor.profiles.name,
        avatar_url: row.mentor.profiles.avatar_url,
      },
      created_at: row.created_at,
    }));
  }
}
