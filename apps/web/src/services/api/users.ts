/**
 * Users API Service
 *
 * Provides typed API calls for user-related operations.
 */

// Internal modules
import { apiClient } from '@/lib/api-client';

// Types
import type { paths } from '../../../../../packages/shared/src/types/api.generated';

/**
 * Type for user list response.
 * This represents users returned from GET /v1/users.
 */
export type UserListResponse =
  paths['/v1/users']['get']['responses']['200']['content']['application/json'];

/**
 * Get list of users with optional role filter.
 *
 * @param filters - Optional filters (role)
 * @returns Promise with array of users with profiles
 * @throws {ApiError} 401 if not authenticated
 *
 * @example
 * const mentors = await getUsers({ role: 'mentor' });
 * console.log(`Found ${mentors.length} mentors`);
 */
export async function getUsers(filters?: {
  role?: 'mentee' | 'mentor' | 'coordinator';
}): Promise<UserListResponse> {
  const params = new URLSearchParams();
  if (filters?.role) params.set('role', filters.role);

  const endpoint = params.toString() ? `/v1/users?${params.toString()}` : '/v1/users';
  return apiClient.get(endpoint as '/v1/users');
}
