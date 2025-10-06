/**
 * User-related type definitions derived from OpenAPI schema.
 *
 * These types are re-exported from the generated API types to provide
 * a consistent interface for user authentication and authorization.
 */

import type { paths } from '@shared/types/api.generated';

/**
 * User profile with authentication information from /v1/users/me endpoint.
 * This matches the API response structure exactly.
 */
export type UserWithProfile = paths['/v1/users/me']['get']['responses']['200']['content']['application/json'];

/**
 * User role type - extracted from the API schema.
 */
export type UserRole = UserWithProfile['role'];

/**
 * Authentication session data.
 * This is internal to the frontend and not part of the API schema.
 */
export interface AuthSession {
  access_token: string;
  refresh_token: string;
}
