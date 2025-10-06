/**
 * Test fixtures for booking-related mocks (frontend).
 *
 * Provides reusable factory functions for creating mock bookings
 * for frontend component and API client tests.
 *
 * MANDATORY: All tests MUST use these centralized fixtures.
 * DO NOT create inline mock objects in test files.
 */

import type { paths } from '../../../../../packages/shared/src/types/api.generated';

/**
 * Type for booking response from POST /v1/bookings endpoint.
 * Uses OpenAPI-generated types for compile-time safety.
 */
type BookingResponse =
  paths['/v1/bookings']['post']['responses']['201']['content']['application/json'];

/**
 * Creates a mock booking response with sensible defaults.
 *
 * @param overrides - Partial object to override default values
 * @returns Complete BookingResponse object
 *
 * @example
 * // Default pending booking
 * const booking = createMockBooking();
 *
 * @example
 * // Booking for current user as mentee
 * const myBooking = createMockBooking({ mentee_id: 'current-user-id' });
 *
 * @example
 * // Confirmed booking (for Epic 4+ testing)
 * const confirmed = createMockBooking({ status: 'confirmed' });
 */
export const createMockBooking = (overrides?: Partial<BookingResponse>): BookingResponse => ({
  id: 'booking-123',
  time_slot_id: 'slot-123',
  mentor_id: 'mentor-123',
  mentee_id: 'mentee-123',
  meeting_goal: 'Discuss go-to-market strategy for SaaS product launch',
  status: 'pending',
  meeting_start_time: '2025-10-15T19:00:00Z', // 2:00 PM CDT
  meeting_end_time: '2025-10-15T19:30:00Z', // 2:30 PM CDT
  created_at: '2025-10-06T10:00:00Z',
  updated_at: '2025-10-06T10:00:00Z',
  ...overrides,
});

/**
 * Pre-configured mock bookings for common test scenarios
 */
export const mockBookings = {
  /** Standard pending booking (Epic 0) */
  pending: createMockBooking(),

  /** Confirmed booking (for Epic 4+ UI testing) */
  confirmed: createMockBooking({
    id: 'booking-confirmed',
    status: 'confirmed',
  }),

  /** Completed booking (past meeting) */
  completed: createMockBooking({
    id: 'booking-completed',
    status: 'completed',
    meeting_start_time: '2025-10-01T19:00:00Z',
    meeting_end_time: '2025-10-01T19:30:00Z',
  }),

  /** Canceled booking */
  canceled: createMockBooking({
    id: 'booking-canceled',
    status: 'canceled',
  }),

  /** Booking scheduled for tomorrow */
  tomorrow: createMockBooking({
    id: 'booking-tomorrow',
    meeting_start_time: '2025-10-16T15:00:00Z', // Next day, 10:00 AM CDT
    meeting_end_time: '2025-10-16T15:30:00Z',
  }),
};
