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
import type { MyBooking } from '@/services/api/bookings';

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

/**
 * Creates a mock MyBooking with expanded relations for dashboard display.
 *
 * MyBooking includes mentor, mentee, and time_slot relations expanded,
 * as returned by GET /v1/bookings/my-bookings endpoint.
 *
 * @param overrides - Partial object to override default values
 * @returns Complete MyBooking object with expanded relations
 *
 * @example
 * // Default booking where current user is mentee
 * const booking = createMockMyBooking();
 *
 * @example
 * // Booking where current user is mentor
 * const mentorBooking = createMockMyBooking({
 *   mentor_id: 'current-user-id',
 *   mentee_id: 'other-user-id'
 * });
 *
 * @example
 * // Upcoming booking
 * const upcoming = createMockMyBooking({
 *   time_slot: {
 *     start_time: new Date(Date.now() + 86400000).toISOString(),
 *     end_time: new Date(Date.now() + 90000000).toISOString(),
 *     mentor_id: 'mentor-123',
 *   }
 * });
 */
export const createMockMyBooking = (overrides?: Partial<MyBooking>): MyBooking => {
  const baseTime = new Date('2025-10-15T19:00:00Z');
  const endTime = new Date('2025-10-15T19:30:00Z');

  return {
    id: 'booking-123',
    time_slot_id: 'slot-123',
    mentor_id: 'mentor-123',
    mentee_id: 'mentee-123',
    meeting_goal: 'Discuss go-to-market strategy for SaaS product launch',
    materials_urls: [],
    status: 'pending',
    created_at: '2025-10-06T10:00:00Z',
    updated_at: '2025-10-06T10:00:00Z',
    time_slot: {
      start_time: baseTime.toISOString(),
      end_time: endTime.toISOString(),
      mentor_id: 'mentor-123',
    },
    mentor: {
      id: 'mentor-123',
      profile: {
        name: 'John Mentor',
        avatar_url: 'https://example.com/avatars/mentor.jpg',
      },
    },
    mentee: {
      id: 'mentee-123',
      profile: {
        name: 'Jane Mentee',
        avatar_url: 'https://example.com/avatars/mentee.jpg',
      },
    },
    ...overrides,
  };
};

/**
 * Pre-configured mock MyBooking instances for common test scenarios
 */
export const mockMyBookings = {
  /** Standard pending booking where current user is mentee */
  asMentee: createMockMyBooking({
    mentee_id: 'current-user-id',
  }),

  /** Booking where current user is mentor */
  asMentor: createMockMyBooking({
    id: 'booking-as-mentor',
    mentor_id: 'current-user-id',
    mentee_id: 'other-user-id',
  }),

  /** Upcoming booking (tomorrow) */
  upcoming: createMockMyBooking({
    id: 'booking-upcoming',
    time_slot: {
      start_time: new Date(Date.now() + 86400000).toISOString(),
      end_time: new Date(Date.now() + 90000000).toISOString(),
      mentor_id: 'mentor-123',
    },
  }),

  /** Past booking (yesterday, completed) */
  past: createMockMyBooking({
    id: 'booking-past',
    status: 'completed',
    time_slot: {
      start_time: new Date(Date.now() - 86400000).toISOString(),
      end_time: new Date(Date.now() - 82800000).toISOString(),
      mentor_id: 'mentor-123',
    },
  }),

  /** Canceled booking */
  canceled: createMockMyBooking({
    id: 'booking-canceled',
    status: 'canceled',
  }),
};

/**
 * Creates a list of MyBookings for testing list views.
 *
 * @param options - Configuration for generating bookings list
 * @returns Array of MyBooking objects
 *
 * @example
 * const bookings = createMockMyBookingsList({ upcomingCount: 3, pastCount: 2 });
 */
export const createMockMyBookingsList = (
  options: {
    upcomingCount?: number;
    pastCount?: number;
    canceledCount?: number;
    currentUserId?: string;
  } = {}
): MyBooking[] => {
  const {
    upcomingCount = 2,
    pastCount = 1,
    canceledCount = 0,
    currentUserId = 'current-user-id',
  } = options;

  const bookings: MyBooking[] = [];

  // Create upcoming bookings
  for (let i = 0; i < upcomingCount; i++) {
    bookings.push(
      createMockMyBooking({
        id: `booking-upcoming-${i}`,
        mentee_id: currentUserId,
        time_slot: {
          start_time: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
          end_time: new Date(Date.now() + (i + 1) * 86400000 + 1800000).toISOString(),
          mentor_id: `mentor-${i}`,
        },
        mentor: {
          id: `mentor-${i}`,
          profile: {
            name: `Mentor ${i + 1}`,
            avatar_url: null,
          },
        },
      })
    );
  }

  // Create past bookings
  for (let i = 0; i < pastCount; i++) {
    bookings.push(
      createMockMyBooking({
        id: `booking-past-${i}`,
        mentee_id: currentUserId,
        status: 'completed',
        time_slot: {
          start_time: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
          end_time: new Date(Date.now() - (i + 1) * 86400000 + 1800000).toISOString(),
          mentor_id: `mentor-past-${i}`,
        },
        mentor: {
          id: `mentor-past-${i}`,
          profile: {
            name: `Past Mentor ${i + 1}`,
            avatar_url: null,
          },
        },
      })
    );
  }

  // Create canceled bookings
  for (let i = 0; i < canceledCount; i++) {
    bookings.push(
      createMockMyBooking({
        id: `booking-canceled-${i}`,
        mentee_id: currentUserId,
        status: 'canceled',
        time_slot: {
          start_time: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
          end_time: new Date(Date.now() + (i + 1) * 86400000 + 1800000).toISOString(),
          mentor_id: `mentor-canceled-${i}`,
        },
      })
    );
  }

  return bookings;
};
