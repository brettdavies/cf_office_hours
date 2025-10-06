/**
 * Test fixtures for availability-related mocks.
 *
 * Provides reusable factory functions for creating mock availability blocks
 * that match the Story 0.8 API schema. This ensures consistency across all tests
 * and makes schema updates easier to maintain.
 */

import type { paths } from '@shared/types/api.generated';

// Type definitions from OpenAPI schema
type AvailabilityBlockResponse =
  paths['/v1/availability']['get']['responses']['200']['content']['application/json'][number];

type CreateAvailabilityRequest =
  paths['/v1/availability']['post']['requestBody']['content']['application/json'];

/**
 * Creates a mock availability block response with sensible defaults.
 * All fields can be overridden via the overrides parameter.
 *
 * Defaults to 'one_time' pattern (no recurrence). For recurring patterns
 * (weekly/monthly), override recurrence_pattern, start_date, and end_date.
 *
 * @param overrides - Partial object to override default values
 * @returns Complete AvailabilityBlockResponse object
 *
 * @example
 * // One-time block (Story 0.9)
 * const block = createMockAvailabilityBlock({
 *   start_time: '2025-10-20T14:00:00Z',
 *   location_custom: 'Conference Room A'
 * });
 *
 * @example
 * // Recurring block (Future stories)
 * const recurringBlock = createMockAvailabilityBlock({
 *   recurrence_pattern: 'weekly',
 *   start_date: '2025-10-01',
 *   end_date: '2025-12-31'
 * });
 */
export const createMockAvailabilityBlock = (
  overrides?: Partial<AvailabilityBlockResponse>
): AvailabilityBlockResponse => ({
  id: 'avail-123',
  mentor_id: 'mentor-123',
  recurrence_pattern: 'one_time',
  start_date: null, // Only used for recurring patterns (weekly/monthly)
  end_date: null,   // Only used for recurring patterns (weekly/monthly)
  start_time: '2025-10-15T09:00:00Z',
  end_time: '2025-10-15T17:00:00Z',
  slot_duration_minutes: 30,
  buffer_minutes: 0,
  meeting_type: 'online',
  location_preset_id: null, // Used when meeting_type is 'in_person_preset'
  location_custom: null,    // Used when meeting_type is 'in_person_custom'
  description: null,
  created_at: '2025-10-05T10:00:00Z',
  updated_at: '2025-10-05T10:00:00Z',
  created_by: 'mentor-123',
  updated_by: 'mentor-123',
  ...overrides,
});

/**
 * Creates a mock create availability request with sensible defaults.
 *
 * @param overrides - Partial object to override default values
 * @returns Complete CreateAvailabilityRequest object
 *
 * @example
 * const request = createMockAvailabilityRequest({
 *   slot_duration_minutes: 60
 * });
 */
export const createMockAvailabilityRequest = (
  overrides?: Partial<CreateAvailabilityRequest>
): CreateAvailabilityRequest => ({
  start_time: '2025-10-15T09:00:00Z',
  end_time: '2025-10-15T17:00:00Z',
  slot_duration_minutes: 30,
  buffer_minutes: 0,
  meeting_type: 'online',
  description: '',
  ...overrides,
});

/**
 * Pre-configured mock blocks for common test scenarios
 */
export const mockAvailabilityBlocks = {
  /** Standard online meeting block */
  standard: createMockAvailabilityBlock(),

  /** Block with custom location */
  withCustomLocation: createMockAvailabilityBlock({
    id: 'avail-custom-loc',
    location_custom: 'Conference Room A',
  }),

  /** Afternoon time slot */
  afternoon: createMockAvailabilityBlock({
    id: 'avail-afternoon',
    start_time: '2025-10-20T14:00:00Z',
    end_time: '2025-10-20T17:00:00Z',
    slot_duration_minutes: 60,
  }),

  /** Morning time slot with custom location */
  morningWithLocation: createMockAvailabilityBlock({
    id: 'avail-morning',
    start_time: '2025-10-25T10:00:00Z',
    end_time: '2025-10-25T16:00:00Z',
    slot_duration_minutes: 45,
    location_custom: 'Office 201',
  }),
};
