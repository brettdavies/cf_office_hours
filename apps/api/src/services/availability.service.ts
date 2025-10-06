/**
 * Availability Service - Business logic layer for availability operations.
 *
 * Responsibilities:
 * - Business logic and validation
 * - Call repository methods
 * - Enforce RBAC (mentor-only for creation)
 * - Throw AppError for failure cases
 * - NO HTTP concerns (no access to request/response)
 */

// Internal modules
import { AvailabilityRepository } from '../repositories/availability.repository';
import { AppError } from '../lib/errors';

// Types
import type {
  CreateAvailabilityBlockRequest,
  AvailabilityBlockResponse,
  UserRole,
  GetAvailableSlotsQuery,
  GetAvailableSlotsResponse,
} from '@cf-office-hours/shared';
import type { Env } from '../types/bindings';

export class AvailabilityService {
  private availabilityRepo: AvailabilityRepository;

  constructor(env: Env) {
    this.availabilityRepo = new AvailabilityRepository(env);
  }

  /**
   * Creates a new one-time availability block for a mentor.
   *
   * Business rules:
   * - Only mentors can create availability blocks
   * - Only "online" meeting type supported in this story (0.8)
   * - Recurrence pattern is always "one_time" (no weekly/monthly yet)
   *
   * @param userId - UUID of the authenticated user
   * @param userRole - Role of the authenticated user
   * @param data - Availability block data from request
   * @returns Created availability block
   * @throws {AppError} 403 if user is not a mentor
   * @throws {AppError} 400 if meeting_type is not "online"
   * @throws {AppError} 500 if database operation fails
   */
  async createAvailabilityBlock(
    userId: string,
    userRole: UserRole,
    data: CreateAvailabilityBlockRequest
  ): Promise<AvailabilityBlockResponse> {
    // Validate user is a mentor
    if (userRole !== 'mentor') {
      throw new AppError(403, 'Only mentors can create availability blocks', 'FORBIDDEN', {
        requiredRole: 'mentor',
        actualRole: userRole,
      });
    }

    // Validate meeting type is "online" (in-person deferred to later stories)
    if (data.meeting_type !== 'online') {
      throw new AppError(
        400,
        'Only "online" meeting type is supported in this version',
        'INVALID_MEETING_TYPE',
        { meeting_type: data.meeting_type, supported: ['online'] }
      );
    }

    // Create availability block via repository
    try {
      const block = await this.availabilityRepo.create(userId, {
        start_time: data.start_time,
        end_time: data.end_time,
        slot_duration_minutes: data.slot_duration_minutes,
        buffer_minutes: data.buffer_minutes ?? 0,
        meeting_type: data.meeting_type,
        description: data.description,
      });

      return block;
    } catch (error) {
      console.error('Failed to create availability block:', { userId, error });
      throw new AppError(500, 'Failed to create availability block', 'CREATION_FAILED', {
        originalError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Retrieves all availability blocks for a mentor.
   *
   * @param mentorId - UUID of the mentor
   * @returns Array of availability blocks (may be empty)
   */
  async getAvailabilityBlocksByMentor(mentorId: string): Promise<AvailabilityBlockResponse[]> {
    return this.availabilityRepo.findByMentor(mentorId);
  }

  /**
   * Retrieves a single availability block by ID.
   *
   * @param blockId - UUID of the availability block
   * @returns Availability block
   * @throws {AppError} 404 if block not found
   */
  async getAvailabilityBlockById(blockId: string): Promise<AvailabilityBlockResponse> {
    const block = await this.availabilityRepo.findById(blockId);

    if (!block) {
      throw new AppError(404, 'Availability block not found', 'NOT_FOUND');
    }

    return block;
  }

  /**
   * Retrieves available time slots with optional filtering.
   *
   * Returns non-booked time slots with mentor information.
   * Supports filtering by mentor, date range, and meeting type.
   *
   * @param query - Query parameters for filtering slots
   * @returns Paginated list of available time slots
   * @throws {AppError} 500 if database operation fails
   */
  async getAvailableSlots(query: GetAvailableSlotsQuery): Promise<GetAvailableSlotsResponse> {
    try {
      const slots = await this.availabilityRepo.findAvailableSlots(query);
      const limit = query.limit ?? 50;

      return {
        slots,
        pagination: {
          total: slots.length,
          limit,
          has_more: false, // For Epic 0, no actual pagination implementation
        },
      };
    } catch (error) {
      console.error('Failed to fetch available slots:', { query, error });
      throw new AppError(500, 'Failed to fetch available slots', 'FETCH_FAILED', {
        originalError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
