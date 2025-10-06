/**
 * Test fixtures for booking-related mocks (backend).
 *
 * Provides reusable factory functions for creating mock bookings
 * for backend API tests.
 *
 * MANDATORY: All tests MUST use these centralized fixtures.
 * DO NOT create inline mock objects in test files.
 */

import type { BookingResponse } from '@cf-office-hours/shared';

/**
 * Creates a mock booking with sensible defaults.
 *
 * @param overrides - Partial object to override default values
 * @returns Complete BookingResponse object
 *
 * @example
 * // Default mentee booking
 * const booking = createMockBooking();
 *
 * @example
 * // Confirmed booking
 * const confirmedBooking = createMockBooking({ status: 'confirmed' });
 *
 * @example
 * // Booking for specific mentee
 * const myBooking = createMockBooking({ mentee_id: 'my-user-id' });
 */
export const createMockBooking = (overrides?: Partial<BookingResponse>): BookingResponse => ({
  id: 'booking-123',
  time_slot_id: 'slot-123',
  mentor_id: 'mentor-123',
  mentee_id: 'mentee-123',
  meeting_goal: 'Discuss product-market fit strategy for early-stage SaaS startup',
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
  /** Standard pending booking */
  pending: createMockBooking(),

  /** Confirmed booking (for Epic 4 testing) */
  confirmed: createMockBooking({
    id: 'booking-confirmed',
    status: 'confirmed',
  }),

  /** Completed booking (past session) */
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

  /** Expired booking (auto-rejected after 7 days) */
  expired: createMockBooking({
    id: 'booking-expired',
    status: 'expired',
  }),

  /** Booking with different mentor/mentee */
  differentUsers: createMockBooking({
    id: 'booking-different',
    mentor_id: 'mentor-456',
    mentee_id: 'mentee-456',
  }),
};
