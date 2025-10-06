/**
 * Test fixtures for user and profile-related mocks.
 *
 * Provides reusable factory functions for creating mock user profiles
 * that match the API schema. Ensures consistency across all tests
 * and makes schema updates easier to maintain.
 */

import type { paths } from '@shared/types/api.generated';

// Type definitions from OpenAPI schema
type UserWithProfileResponse =
  paths['/v1/users/me']['get']['responses']['200']['content']['application/json'];

/**
 * Creates a mock user with profile response with sensible defaults.
 * All fields can be overridden via the overrides parameter.
 *
 * @param overrides - Partial object to override default values
 * @returns Complete UserWithProfileResponse object
 *
 * @example
 * const mentee = createMockUserProfile();
 *
 * @example
 * const mentor = createMockUserProfile({
 *   role: 'mentor',
 *   profile: { name: 'Jane Mentor', title: 'Senior Engineer' }
 * });
 */
export const createMockUserProfile = (
  overrides?: Partial<UserWithProfileResponse>
): UserWithProfileResponse => ({
  id: 'user-123',
  airtable_record_id: 'rec123',
  email: 'test@example.com',
  role: 'mentee',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  profile: {
    id: 'profile-123',
    user_id: 'user-123',
    name: 'Test User',
    title: 'Software Engineer',
    company: 'Test Corp',
    bio: 'This is a test bio',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  ...overrides,
});

/**
 * Pre-configured mock user profiles for common test scenarios
 */
export const mockUserProfiles = {
  /** Standard mentee with complete profile */
  mentee: createMockUserProfile(),

  /** Mentor user */
  mentor: createMockUserProfile({
    id: 'mentor-123',
    role: 'mentor',
    profile: {
      id: 'profile-mentor-123',
      user_id: 'mentor-123',
      name: 'Jane Mentor',
      title: 'Senior Software Engineer',
      company: 'Tech Company',
      bio: 'Experienced mentor',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  }),

  /** User with minimal profile (nulls) */
  minimal: createMockUserProfile({
    profile: {
      id: 'profile-minimal',
      user_id: 'user-123',
      name: 'Minimal User',
      title: null,
      company: null,
      bio: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  }),
};
