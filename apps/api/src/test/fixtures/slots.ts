/**
 * Test fixtures for time slot-related mocks (backend).
 *
 * Provides reusable factory functions for creating mock time slots
 * for backend API tests.
 */

import type { TimeSlotResponse, GetAvailableSlotsResponse } from '@cf-office-hours/shared';

/**
 * Creates a mock time slot with sensible defaults.
 */
export const createMockTimeSlot = (overrides?: Partial<TimeSlotResponse>): TimeSlotResponse => ({
  id: 'slot-123',
  availability_id: 'avail-123',
  mentor_id: 'mentor-123',
  start_time: '2025-10-15T19:00:00Z', // 2:00 PM CDT
  end_time: '2025-10-15T19:30:00Z', // 2:30 PM CDT
  slot_duration_minutes: 30,
  is_booked: false,
  mentor: {
    id: 'mentor-123',
    name: 'Jane Mentor',
    avatar_url: null,
  },
  created_at: '2025-10-05T10:00:00Z',
  ...overrides,
});

/**
 * Creates a mock GET slots response with pagination.
 */
export const createMockSlotsResponse = (
  slots: TimeSlotResponse[] = [createMockTimeSlot()],
  paginationOverrides?: Partial<GetAvailableSlotsResponse['pagination']>
): GetAvailableSlotsResponse => ({
  slots,
  pagination: {
    total: slots.length,
    limit: 50,
    has_more: false,
    ...paginationOverrides,
  },
});

/**
 * Pre-configured mock slots for common test scenarios
 */
export const mockTimeSlots = {
  /** Standard available slot */
  available: createMockTimeSlot(),

  /** Morning slot at 9:00 AM CDT */
  morning: createMockTimeSlot({
    id: 'slot-morning',
    start_time: '2025-10-15T14:00:00Z', // 9:00 AM CDT
    end_time: '2025-10-15T14:30:00Z',
  }),

  /** Afternoon slot at 2:00 PM CDT */
  afternoon: createMockTimeSlot({
    id: 'slot-afternoon',
    start_time: '2025-10-15T19:00:00Z', // 2:00 PM CDT
    end_time: '2025-10-15T19:30:00Z',
  }),

  /** Next day slot */
  nextDay: createMockTimeSlot({
    id: 'slot-next-day',
    start_time: '2025-10-16T15:00:00Z', // 10:00 AM CDT
    end_time: '2025-10-16T15:30:00Z',
  }),
};
