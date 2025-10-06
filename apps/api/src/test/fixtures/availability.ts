/**
 * Test Fixtures for Availability Domain (Backend API)
 *
 * Centralized mock data factories for availability blocks.
 * Uses actual API schema types from shared package.
 */

// Types
import type {
  AvailabilityBlockResponse,
  CreateAvailabilityBlockRequest,
} from '@cf-office-hours/shared';

/**
 * Creates a mock AvailabilityBlockResponse with default values.
 * All fields can be overridden via the overrides parameter.
 *
 * @param overrides - Partial object to override default field values
 * @returns Complete AvailabilityBlockResponse object
 */
export const createMockAvailabilityBlock = (
  overrides?: Partial<AvailabilityBlockResponse>
): AvailabilityBlockResponse => ({
  id: 'block-uuid-456',
  mentor_id: 'mentor-uuid-123',
  recurrence_pattern: 'one_time',
  start_date: null, // Only used for recurring patterns (weekly/monthly)
  end_date: null, // Only used for recurring patterns (weekly/monthly)
  start_time: '2025-10-10T14:00:00Z',
  end_time: '2025-10-10T16:00:00Z',
  slot_duration_minutes: 30,
  buffer_minutes: 0,
  meeting_type: 'online',
  location_preset_id: null, // Used when meeting_type is 'in_person_preset'
  location_custom: null, // Used when meeting_type is 'in_person_custom'
  description: 'Test block',
  created_at: '2025-10-05T12:00:00Z',
  updated_at: '2025-10-05T12:00:00Z',
  created_by: 'mentor-uuid-123',
  updated_by: 'mentor-uuid-123',
  ...overrides,
});

/**
 * Creates a mock request/data object for creating availability blocks.
 * Works for both CreateAvailabilityBlockRequest (API layer) and
 * CreateAvailabilityBlockData (repository layer) since they now have
 * the same shape after fixing the buffer_minutes type.
 *
 * @param overrides - Partial object to override default field values
 * @returns Request data compatible with both API and repository layers
 */
export const createMockAvailabilityRequest = (
  overrides?: Partial<CreateAvailabilityBlockRequest>
): CreateAvailabilityBlockRequest => ({
  start_time: '2025-10-10T14:00:00Z',
  end_time: '2025-10-10T16:00:00Z',
  slot_duration_minutes: 30,
  buffer_minutes: 0,
  meeting_type: 'online',
  description: 'Test block',
  ...overrides,
});
