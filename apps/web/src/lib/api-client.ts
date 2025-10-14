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
import type { paths } from "../../../../packages/shared/src/types/api.generated";

// Internal modules
import type { GetSlotsResponse } from "@/test/fixtures/slots";
import { supabase } from "@/services/supabase";

/**
 * Type alias for API paths from OpenAPI spec.
 */
type ApiPaths = paths;

/**
 * Extract response type from an API endpoint.
 */
type GetUserMeResponse =
  ApiPaths["/v1/users/me"]["get"]["responses"]["200"]["content"][
    "application/json"
  ];
type UpdateUserMeRequest = NonNullable<
  ApiPaths["/v1/users/me"]["put"]["requestBody"]
>["content"]["application/json"];
type UpdateUserMeResponse =
  ApiPaths["/v1/users/me"]["put"]["responses"]["200"]["content"][
    "application/json"
  ];

type GetAvailabilityResponse =
  ApiPaths["/v1/availability"]["get"]["responses"]["200"]["content"][
    "application/json"
  ];
type CreateAvailabilityRequest = NonNullable<
  ApiPaths["/v1/availability"]["post"]["requestBody"]
>["content"]["application/json"];
type CreateAvailabilityResponse =
  ApiPaths["/v1/availability"]["post"]["responses"]["201"]["content"][
    "application/json"
  ];

type CreateBookingRequest = NonNullable<
  ApiPaths["/v1/bookings"]["post"]["requestBody"]
>["content"]["application/json"];
type CreateBookingResponse =
  ApiPaths["/v1/bookings"]["post"]["responses"]["201"]["content"][
    "application/json"
  ];

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
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Global request cache for deduplication
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Base fetch wrapper with authentication and error handling.
 *
 * @param endpoint - API endpoint path (e.g., '/v1/users/me')
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Parsed JSON response
 * @throws {ApiError} If response is not ok
 */
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";

  // Get token from Supabase session instead of localStorage
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  // Create a unique key for this request (endpoint + method + body)
  const requestKey = `${options?.method || "GET"}:${endpoint}:${
    JSON.stringify(options?.body) || ""
  }`;

  // Check if this exact request is already in progress
  if (pendingRequests.has(requestKey)) {
    console.log(`[API_DEDUPE] Returning existing request for ${requestKey}`);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return pendingRequests.get(requestKey)!;
  }

  // Create the request promise
  const requestPromise = (async () => {
    try {
      console.log(`[API] Making request to ${endpoint}`, {
        method: options?.method || "GET",
        hasToken: !!token,
        timestamp: new Date().toISOString(),
      });

      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: {
            code: "UNKNOWN_ERROR",
            message: "An error occurred",
            timestamp: new Date().toISOString(),
          },
        }));

        // Handle 403 Forbidden - user removed from whitelist or access revoked
        if (response.status === 403) {
          if (import.meta.env.DEV) {
            console.log(
              "[AUTH] API call failed with 403 Forbidden, signing out",
              {
                endpoint,
                timestamp: new Date().toISOString(),
              },
            );
          }

          // NOTE: Using direct logout logic here instead of useLogout hook
          // because hooks can't be called from non-React contexts.
          // This is a hard logout after being blocked by the API.

          // Sign out from Supabase (this will trigger AuthContext to update via onAuthStateChange)
          await supabase.auth.signOut();

          // Hard redirect to login (can't use navigate here)
          window.location.href = "/auth/login";
        }

        throw new ApiError(
          response.status,
          errorData.error?.code || "UNKNOWN_ERROR",
          errorData.error?.message || "An error occurred",
          errorData.error?.details,
        );
      }

      const result = await response.json();
      console.log(`[API] Request completed for ${endpoint}`, {
        status: response.status,
        timestamp: new Date().toISOString(),
      });

      return result;
    } finally {
      // Clean up the request from the cache
      pendingRequests.delete(requestKey);
    }
  })();

  // Store the request promise for deduplication
  pendingRequests.set(requestKey, requestPromise);

  return requestPromise;
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
    return fetchApi<GetUserMeResponse>("/v1/users/me");
  },

  /**
   * Update current user's profile.
   *
   * @param data - Partial profile data to update
   * @returns Updated user object with profile
   * @throws {ApiError} 400 if validation fails, 401 if not authenticated, 500 if update fails
   */
  updateCurrentUser: (
    data: UpdateUserMeRequest,
  ): Promise<UpdateUserMeResponse> => {
    return fetchApi<UpdateUserMeResponse>("/v1/users/me", {
      method: "PUT",
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
    return fetchApi<GetAvailabilityResponse>("/v1/availability");
  },

  /**
   * Create new availability block and generate time slots.
   *
   * @param data - Availability block data (date, times, duration, location)
   * @returns Created availability block with total_slots count
   * @throws {ApiError} 400 if validation fails, 401 if not authenticated, 403 if not a mentor, 500 if creation fails
   */
  createAvailability: (
    data: CreateAvailabilityRequest,
  ): Promise<CreateAvailabilityResponse> => {
    return fetchApi<CreateAvailabilityResponse>("/v1/availability", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Get available time slots for booking.
   *
   * Returns time slots generated from mentor availability blocks. Slots can be
   * filtered by mentor, date range, and meeting type.
   *
   * @param params - Query parameters for filtering slots
   * @param params.mentor_id - Filter slots by specific mentor UUID (optional)
   * @param params.start_date - Start date for slot search (ISO 8601 date, optional)
   * @param params.end_date - End date for slot search (ISO 8601 date, optional)
   * @param params.meeting_type - Filter by 'online' or 'in_person' (optional)
   * @param params.limit - Number of results (default: 50, max: 100, optional)
   * @returns Array of time slots with pagination metadata
   * @throws {ApiError} 401 if not authenticated, 403 if forbidden, 404 if no slots found
   *
   * @example
   * // Get all slots for a specific mentor
   * const response = await apiClient.getAvailableSlots({ mentor_id: 'mentor-123' });
   *
   * @example
   * // Get online slots within date range
   * const response = await apiClient.getAvailableSlots({
   *   mentor_id: 'mentor-123',
   *   start_date: '2025-10-15',
   *   end_date: '2025-10-31',
   *   meeting_type: 'online'
   * });
   */
  getAvailableSlots: (params?: {
    mentor_id?: string;
    start_date?: string;
    end_date?: string;
    meeting_type?: "online" | "in_person";
    limit?: number;
  }): Promise<GetSlotsResponse> => {
    const queryString = new URLSearchParams();

    if (params?.mentor_id) queryString.append("mentor_id", params.mentor_id);
    if (params?.start_date) queryString.append("start_date", params.start_date);
    if (params?.end_date) queryString.append("end_date", params.end_date);
    if (params?.meeting_type) {
      queryString.append("meeting_type", params.meeting_type);
    }
    if (params?.limit) queryString.append("limit", params.limit.toString());

    const endpoint = queryString.toString().length > 0
      ? `/v1/availability/slots?${queryString.toString()}`
      : "/v1/availability/slots";

    return fetchApi<GetSlotsResponse>(endpoint);
  },

  /**
   * Create a new booking for a time slot.
   *
   * Epic 0: Simple booking - no calendar integration, no confirmation flow.
   * Status always 'pending'.
   *
   * @param data - Booking creation data (time_slot_id, meeting_goal)
   * @returns Created booking with all fields
   * @throws {ApiError} 400 if validation fails (meeting_goal too short), 401 if not authenticated, 404 if slot not found, 409 if slot already booked
   *
   * @example
   * const booking = await apiClient.createBooking({
   *   time_slot_id: 'slot-uuid',
   *   meeting_goal: 'I want to discuss go-to-market strategy for my SaaS startup'
   * });
   */
  createBooking: (
    data: CreateBookingRequest,
  ): Promise<CreateBookingResponse> => {
    return fetchApi<CreateBookingResponse>("/v1/bookings", {
      method: "POST",
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
    path: Path,
  ): Promise<
    ApiPaths[Path] extends {
      get: { responses: { 200: { content: { "application/json": infer T } } } };
    } ? T
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
      post: { requestBody: { content: { "application/json": infer T } } };
    } ? T
      : never,
  ): Promise<
    NonNullable<ApiPaths[Path]> extends {
      post: {
        responses: { 201: { content: { "application/json": infer T } } };
      };
    } ? T
      : never
  > => {
    return fetchApi(path, {
      method: "POST",
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
      put: { requestBody: { content: { "application/json": infer T } } };
    } ? T
      : never,
  ): Promise<
    NonNullable<ApiPaths[Path]> extends {
      put: { responses: { 200: { content: { "application/json": infer T } } } };
    } ? T
      : never
  > => {
    return fetchApi(path, {
      method: "PUT",
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
    path: Path,
  ): Promise<
    ApiPaths[Path] extends {
      delete: {
        responses: { 200: { content: { "application/json": infer T } } };
      };
    } ? T
      : never
  > => {
    return fetchApi(path, {
      method: "DELETE",
    });
  },
};
