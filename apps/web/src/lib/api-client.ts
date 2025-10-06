/**
 * Type-safe API client for CF Office Hours frontend.
 *
 * Uses types generated from OpenAPI spec to provide compile-time type safety
 * and auto-completion for all API endpoints.
 *
 * Usage:
 * ```typescript
 * import { apiClient } from '@/lib/api-client';
 *
 * const user = await apiClient.getCurrentUser();
 * const updated = await apiClient.updateCurrentUser({ name: 'New Name' });
 * ```
 */

// External dependencies
// Note: Direct import path needed for build-time resolution
import type { paths } from '../../../../packages/shared/src/types/api.generated';

/**
 * Type alias for API paths from OpenAPI spec.
 */
type ApiPaths = paths;

/**
 * Extract response type from an API endpoint.
 */
type GetUserMeResponse =
  ApiPaths['/v1/users/me']['get']['responses']['200']['content']['application/json'];
type UpdateUserMeRequest =
  NonNullable<ApiPaths['/v1/users/me']['put']['requestBody']>['content']['application/json'];
type UpdateUserMeResponse =
  ApiPaths['/v1/users/me']['put']['responses']['200']['content']['application/json'];

type GetAvailabilityResponse =
  ApiPaths['/v1/availability']['get']['responses']['200']['content']['application/json'];
type CreateAvailabilityRequest =
  NonNullable<ApiPaths['/v1/availability']['post']['requestBody']>['content']['application/json'];
type CreateAvailabilityResponse =
  ApiPaths['/v1/availability']['post']['responses']['201']['content']['application/json'];

/**
 * Custom error class for API errors.
 *
 * Contains structured error information from the API including
 * status code, error code, message, and optional details.
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Base fetch wrapper with authentication and error handling.
 *
 * @param endpoint - API endpoint path (e.g., '/v1/users/me')
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Parsed JSON response
 * @throws {ApiError} If response is not ok
 */
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
  const token = localStorage.getItem('auth_token'); // TODO: Replace with auth context

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An error occurred',
        timestamp: new Date().toISOString(),
      },
    }));

    throw new ApiError(
      response.status,
      errorData.error?.code || 'UNKNOWN_ERROR',
      errorData.error?.message || 'An error occurred',
      errorData.error?.details
    );
  }

  return response.json();
}

/**
 * Type-safe API client with methods for all endpoints.
 *
 * Each method is fully typed based on the OpenAPI specification,
 * providing compile-time type safety and IDE auto-completion.
 */
export const apiClient = {
  /**
   * Get current authenticated user with profile.
   *
   * @returns User object with embedded profile
   * @throws {ApiError} 401 if not authenticated, 404 if user not found
   */
  getCurrentUser: (): Promise<GetUserMeResponse> => {
    return fetchApi<GetUserMeResponse>('/v1/users/me');
  },

  /**
   * Update current user's profile.
   *
   * @param data - Partial profile data to update
   * @returns Updated user object with profile
   * @throws {ApiError} 400 if validation fails, 401 if not authenticated, 500 if update fails
   */
  updateCurrentUser: (data: UpdateUserMeRequest): Promise<UpdateUserMeResponse> => {
    return fetchApi<UpdateUserMeResponse>('/v1/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get availability blocks for current authenticated mentor.
   *
   * @returns Array of availability blocks with slot counts
   * @throws {ApiError} 401 if not authenticated, 403 if not a mentor
   */
  getMyAvailability: (): Promise<GetAvailabilityResponse> => {
    return fetchApi<GetAvailabilityResponse>('/v1/availability');
  },

  /**
   * Create new availability block and generate time slots.
   *
   * @param data - Availability block data (date, times, duration, location)
   * @returns Created availability block with total_slots count
   * @throws {ApiError} 400 if validation fails, 401 if not authenticated, 403 if not a mentor, 500 if creation fails
   */
  createAvailability: (data: CreateAvailabilityRequest): Promise<CreateAvailabilityResponse> => {
    return fetchApi<CreateAvailabilityResponse>('/v1/availability', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Generic GET method with type extraction.
   *
   * @param path - API path from the paths type
   * @returns Typed response based on path
   */
  get: <Path extends keyof ApiPaths & string>(
    path: Path
  ): Promise<
    ApiPaths[Path] extends { get: { responses: { 200: { content: { 'application/json': infer T } } } } }
      ? T
      : never
  > => {
    return fetchApi(path);
  },

  /**
   * Generic POST method with type extraction.
   *
   * @param path - API path from the paths type
   * @param data - Request body typed based on path
   * @returns Typed response based on path
   */
  post: <Path extends keyof ApiPaths & string>(
    path: Path,
    data: NonNullable<ApiPaths[Path]> extends {
      post: { requestBody: { content: { 'application/json': infer T } } };
    }
      ? T
      : never
  ): Promise<
    NonNullable<ApiPaths[Path]> extends {
      post: { responses: { 201: { content: { 'application/json': infer T } } } };
    }
      ? T
      : never
  > => {
    return fetchApi(path, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Generic PUT method with type extraction.
   *
   * @param path - API path from the paths type
   * @param data - Request body typed based on path
   * @returns Typed response based on path
   */
  put: <Path extends keyof ApiPaths & string>(
    path: Path,
    data: NonNullable<ApiPaths[Path]> extends {
      put: { requestBody: { content: { 'application/json': infer T } } };
    }
      ? T
      : never
  ): Promise<
    NonNullable<ApiPaths[Path]> extends {
      put: { responses: { 200: { content: { 'application/json': infer T } } } };
    }
      ? T
      : never
  > => {
    return fetchApi(path, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Generic DELETE method with type extraction.
   *
   * @param path - API path from the paths type
   * @returns Typed response based on path
   */
  delete: <Path extends keyof ApiPaths & string>(
    path: Path
  ): Promise<
    ApiPaths[Path] extends {
      delete: { responses: { 200: { content: { 'application/json': infer T } } } };
    }
      ? T
      : never
  > => {
    return fetchApi(path, {
      method: 'DELETE',
    });
  },
};
