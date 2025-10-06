/**
 * Test fixtures for time slot-related mocks.
 *
 * Provides reusable factory functions for creating mock time slots
 * that match the Story 0.10 slot picker API schema. This ensures consistency
 * across all tests and makes schema updates easier to maintain.
 */

// Types
// Note: Since the backend endpoint hasn't been implemented yet (Story 0.8 dependency),
// we're defining the expected types based on the Story 0.10 specifications.
// These will be replaced with OpenAPI-generated types once the backend is complete.

/**
 * Time slot with nested mentor information.
 * Based on Story 0.10 Dev Notes TimeSlot Schema (lines 140-168)
 */
export interface TimeSlot {
  id: string;
  availability_id: string;
  mentor_id: string;
  start_time: string; // ISO 8601 datetime
  end_time: string; // ISO 8601 datetime
  slot_duration_minutes: number;
  is_booked: boolean;
  mentor: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  created_at: string;
}

/**
 * Response from GET /v1/availability/slots
 */
export interface GetSlotsResponse {
  slots: TimeSlot[];
  pagination: {
    total: number;
    limit: number;
    has_more: boolean;
  };
}

/**
 * Creates a mock time slot with sensible defaults.
 *
 * @param overrides - Partial object to override default values
 * @returns Complete TimeSlot object
 *
 * @example
 * // Default available slot
 * const slot = createMockTimeSlot();
 *
 * @example
 * // Booked slot
 * const bookedSlot = createMockTimeSlot({ is_booked: true });
 *
 * @example
 * // Custom time slot
 * const morningSlot = createMockTimeSlot({
 *   start_time: '2025-10-15T09:00:00Z',
 *   end_time: '2025-10-15T09:30:00Z'
 * });
 */
export const createMockTimeSlot = (overrides?: Partial<TimeSlot>): TimeSlot => ({
  id: 'slot-123',
  availability_id: 'avail-123',
  mentor_id: 'mentor-123',
  start_time: '2025-10-15T19:00:00Z', // 2:00 PM CDT (UTC-5)
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
 *
 * @param slots - Array of TimeSlot objects (defaults to single available slot)
 * @param paginationOverrides - Override pagination values
 * @returns Complete GetSlotsResponse object
 *
 * @example
 * const response = createMockSlotsResponse([
 *   createMockTimeSlot({ start_time: '2025-10-15T09:00:00Z' }),
 *   createMockTimeSlot({ start_time: '2025-10-15T10:00:00Z' })
 * ]);
 */
export const createMockSlotsResponse = (
  slots: TimeSlot[] = [createMockTimeSlot()],
  paginationOverrides?: Partial<GetSlotsResponse['pagination']>
): GetSlotsResponse => ({
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
  /** Standard available slot at 2:00 PM */
  available: createMockTimeSlot(),

  /** Booked slot (disabled in UI) */
  booked: createMockTimeSlot({
    id: 'slot-booked',
    is_booked: true,
  }),

  /** Morning slot at 9:00 AM CDT */
  morning: createMockTimeSlot({
    id: 'slot-morning',
    start_time: '2025-10-15T14:00:00Z', // 9:00 AM CDT (UTC-5)
    end_time: '2025-10-15T14:30:00Z',
  }),

  /** Afternoon slot at 2:00 PM CDT */
  afternoon: createMockTimeSlot({
    id: 'slot-afternoon',
    start_time: '2025-10-15T19:00:00Z', // 2:00 PM CDT
    end_time: '2025-10-15T19:30:00Z',
  }),

  /** Evening slot at 5:00 PM CDT */
  evening: createMockTimeSlot({
    id: 'slot-evening',
    start_time: '2025-10-15T22:00:00Z', // 5:00 PM CDT
    end_time: '2025-10-15T22:30:00Z',
  }),

  /** Slot on a different date (Oct 16) at 10:00 AM CDT */
  nextDay: createMockTimeSlot({
    id: 'slot-next-day',
    start_time: '2025-10-16T15:00:00Z', // 10:00 AM CDT
    end_time: '2025-10-16T15:30:00Z',
  }),
};

/**
 * Pre-configured mock responses for common test scenarios
 */
export const mockSlotsResponses = {
  /** Empty response (no slots) */
  empty: createMockSlotsResponse([]),

  /** Single available slot */
  single: createMockSlotsResponse([mockTimeSlots.available]),

  /** Multiple slots on same day */
  multipleSlotsSameDay: createMockSlotsResponse([
    mockTimeSlots.morning,
    mockTimeSlots.afternoon,
    mockTimeSlots.evening,
  ]),

  /** Slots across multiple days */
  multipleSlotsDifferentDays: createMockSlotsResponse([
    mockTimeSlots.morning,
    mockTimeSlots.afternoon,
    mockTimeSlots.nextDay,
  ]),

  /** Mix of available and booked slots */
  mixedAvailability: createMockSlotsResponse([
    mockTimeSlots.morning,
    mockTimeSlots.booked,
    mockTimeSlots.afternoon,
  ]),
};
