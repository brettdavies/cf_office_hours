/**
 * Booking Service - Business logic layer for booking operations.
 *
 * Responsibilities:
 * - Business logic and validation
 * - Call repository methods
 * - Throw AppError for failure cases
 * - NO HTTP concerns (no access to request/response)
 */

// Internal modules
import { BookingRepository } from '../repositories/booking.repository';
import { AppError } from '../lib/errors';

// Types
import type { CreateBookingRequest, BookingResponse } from '@cf-office-hours/shared';
import type { MyBookingData } from '../repositories/booking.repository';
import type { Env } from '../types/bindings';

export class BookingService {
  private bookingRepo: BookingRepository;

  constructor(env: Env) {
    this.bookingRepo = new BookingRepository(env);
  }

  /**
   * Creates a new booking for a mentee.
   *
   * Business rules (Epic 0 - Simple):
   * - Slot must exist and not be booked
   * - Status always 'pending' (no confirmation workflow yet)
   * - Location defaults to 'online' (calendar integration in Epic 3)
   * - No materials URLs (added in Epic 4)
   * - No conflict checking (added in Epic 3)
   *
   * @param userId - UUID of the authenticated user (mentee)
   * @param data - Booking creation request data
   * @returns Created booking with status='pending'
   * @throws {AppError} 404 if time slot not found
   * @throws {AppError} 409 if slot already booked
   * @throws {AppError} 500 if database operation fails
   */
  async createBooking(userId: string, data: CreateBookingRequest): Promise<BookingResponse> {
    // Fetch time slot details to validate and extract metadata
    const slot = await this.bookingRepo.getTimeSlot(data.time_slot_id);

    if (!slot) {
      throw new AppError(404, 'Time slot not found', 'SLOT_NOT_FOUND', {
        time_slot_id: data.time_slot_id,
      });
    }

    if (slot.is_booked) {
      throw new AppError(409, 'This slot is already booked', 'SLOT_UNAVAILABLE', {
        time_slot_id: data.time_slot_id,
      });
    }

    // Create booking via repository (atomic transaction)
    try {
      const booking = await this.bookingRepo.createBooking({
        time_slot_id: data.time_slot_id,
        mentor_id: slot.mentor_id,
        mentee_id: userId,
        meeting_goal: data.meeting_goal,
        meeting_start_time: slot.start_time,
        meeting_end_time: slot.end_time,
        location: 'online', // Epic 0: Default to online, calendar integration in Epic 3
      });

      return booking;
    } catch (error) {
      // Handle database function errors
      if (error instanceof Error) {
        if (error.message.includes('SLOT_NOT_FOUND')) {
          throw new AppError(404, 'Time slot not found', 'SLOT_NOT_FOUND', {
            time_slot_id: data.time_slot_id,
          });
        }
        if (error.message.includes('SLOT_UNAVAILABLE')) {
          throw new AppError(409, 'This slot is already booked', 'SLOT_UNAVAILABLE', {
            time_slot_id: data.time_slot_id,
          });
        }
      }

      // Generic database error
      console.error('Failed to create booking:', { userId, data, error });
      throw new AppError(500, 'Failed to create booking', 'DATABASE_ERROR');
    }
  }

  /**
   * Fetches all bookings for the authenticated user.
   *
   * Returns bookings where the user is either the mentor or mentee,
   * with expanded relations for display in the dashboard.
   *
   * @param userId - UUID of the authenticated user
   * @returns Array of bookings with expanded mentor, mentee, and time_slot data
   * @throws {AppError} 500 if database operation fails
   */
  async getMyBookings(userId: string): Promise<MyBookingData[]> {
    try {
      const bookings = await this.bookingRepo.getMyBookings(userId);
      return bookings;
    } catch (error) {
      console.error('Failed to fetch user bookings:', { userId, error });
      throw new AppError(500, 'Failed to fetch bookings', 'DATABASE_ERROR');
    }
  }
}
