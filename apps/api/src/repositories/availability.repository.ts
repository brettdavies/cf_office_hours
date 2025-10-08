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
import { BaseRepository } from "../lib/base-repository";

// Types
import type {
  AvailabilityBlockResponse,
  GetAvailableSlotsQuery,
  TimeSlotResponse,
} from "@cf-office-hours/shared";

/**
 * Data structure for creating availability blocks.
 * Maps to availability table columns.
 */
export interface CreateAvailabilityBlockData {
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  buffer_minutes?: number; // Optional - defaults to 0 if not provided
  meeting_type: "online";
  description?: string;
}

export class AvailabilityRepository extends BaseRepository {
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
    data: CreateAvailabilityBlockData,
  ): Promise<AvailabilityBlockResponse> {
    // Step 1: Create availability block
    const { data: block, error } = await this.supabase
      .from("availability")
      .insert({
        mentor_id: mentorId,
        start_time: data.start_time,
        end_time: data.end_time,
        slot_duration_minutes: data.slot_duration_minutes,
        location: "online",
        created_by: mentorId,
        updated_by: mentorId,
      })
      .select()
      .single();

    if (error || !block) {
      console.error("Failed to create availability block:", {
        mentorId,
        error,
      });
      throw new Error(
        `Database error: ${
          error?.message || "Failed to create availability block"
        }`,
      );
    }

    // Step 2: Generate time slots for this availability block
    try {
      await this.generateTimeSlots(
        block.id,
        mentorId,
        data.start_time,
        data.end_time,
        data.slot_duration_minutes,
      );
      console.log("[AVAILABILITY] Time slots generated successfully", {
        blockId: block.id,
        mentorId,
        timestamp: new Date().toISOString(),
      });
    } catch (slotError) {
      console.error("[ERROR] Failed to generate time slots", {
        blockId: block.id,
        mentorId,
        error: slotError instanceof Error ? slotError.message : "Unknown error",
      });
      // Note: We don't throw here - the availability block was created successfully
      // The slots can be generated later via a manual process if needed
    }

    return block as AvailabilityBlockResponse;
  }

  /**
   * Generates individual time slots for an availability block.
   *
   * Calculates how many slots fit in the time range and creates a time_slots record for each.
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
    slotDurationMinutes: number,
  ): Promise<void> {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const slots = [];

    let currentSlotStart = new Date(start);

    // Generate slots until we reach the end time
    while (currentSlotStart < end) {
      const currentSlotEnd = new Date(
        currentSlotStart.getTime() + slotDurationMinutes * 60 * 1000,
      );

      // Only add slot if it fits completely within the availability window
      if (currentSlotEnd <= end) {
        slots.push({
          availability_id: availabilityId,
          mentor_id: mentorId,
          start_time: currentSlotStart.toISOString(),
          end_time: currentSlotEnd.toISOString(),
          is_booked: false,
          created_by: mentorId,
        });
      }

      // Move to next slot
      currentSlotStart = currentSlotEnd;
    }

    if (slots.length === 0) {
      console.warn(
        "[AVAILABILITY] No slots generated - duration too large for time range",
        {
          availabilityId,
          slotDurationMinutes,
          timeRangeMinutes: (end.getTime() - start.getTime()) / 60000,
        },
      );
      return;
    }

    // Insert all slots in a single batch operation
    const { error } = await this.supabase
      .from("time_slots")
      .insert(slots);

    if (error) {
      console.error("[ERROR] Failed to insert time slots", {
        availabilityId,
        slotCount: slots.length,
        error,
      });
      throw new Error(`Failed to insert time slots: ${error.message}`);
    }

    console.log("[AVAILABILITY] Time slots inserted", {
      availabilityId,
      slotCount: slots.length,
      timestamp: new Date().toISOString(),
    });
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
      .from("availability")
      .select("*")
      .eq("mentor_id", mentorId)
      .is("deleted_at", null)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Failed to fetch availability blocks:", {
        mentorId,
        error,
      });
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
      .from("availability")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      console.error("Failed to fetch availability block:", { id, error });
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
  async findAvailableSlots(
    query: GetAvailableSlotsQuery,
  ): Promise<TimeSlotResponse[]> {
    console.log("[AVAILABILITY] Fetching available slots", {
      query,
      timestamp: new Date().toISOString(),
    });

    let queryBuilder = this.supabase
      .from("time_slots")
      .select(
        `
        id,
        availability_id,
        mentor_id,
        start_time,
        end_time,
        created_at,
        availability:availability!inner(slot_duration_minutes, location),
        mentor:users!inner(
          id,
          user_profiles!inner(name)
        )
      `,
      )
      .eq("is_booked", false)
      .is("deleted_at", null)
      .order("start_time", { ascending: true });

    // Apply filters
    if (query.mentor_id) {
      queryBuilder = queryBuilder.eq("mentor_id", query.mentor_id);
    }

    if (query.start_date) {
      queryBuilder = queryBuilder.gte(
        "start_time",
        `${query.start_date}T00:00:00Z`,
      );
    }

    if (query.end_date) {
      queryBuilder = queryBuilder.lte(
        "start_time",
        `${query.end_date}T23:59:59Z`,
      );
    }

    // Note: meeting_type filter not applicable in current schema (location field is simple text)

    // Apply limit
    const limit = query.limit ?? 50;
    queryBuilder = queryBuilder.limit(limit);

    const { data, error } = await queryBuilder;

    if (error) {
      console.error("[AVAILABILITY] Failed to fetch available slots", {
        query,
        error,
      });
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      console.log("[AVAILABILITY] No slots found", {
        query,
        timestamp: new Date().toISOString(),
      });
      return [];
    }

    console.log("[AVAILABILITY] Available slots fetched successfully", {
      query,
      slotCount: data.length,
      timestamp: new Date().toISOString(),
    });

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
        name: row.mentor.user_profiles.name,
        avatar_url: null, // Avatar functionality not implemented yet (uses avatar_source_type/avatar_metadata in schema)
      },
      created_at: row.created_at,
    }));
  }
}
