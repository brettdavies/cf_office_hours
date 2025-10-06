/**
 * Bookings API Service
 *
 * Provides typed API calls for booking-related operations.
 */

// External dependencies
import { apiClient } from '@/lib/api-client';

// Types
import type { paths } from '../../../../../packages/shared/src/types/api.generated';

/**
 * Type for single booking in my-bookings list response.
 * This represents a booking with expanded mentor, mentee, and time_slot relations.
 */
export type MyBooking =
  paths['/v1/bookings/my-bookings']['get']['responses']['200']['content']['application/json']['bookings'][number];

/**
 * Response type for GET /v1/bookings/my-bookings.
 * Returns list of bookings where user is mentor or mentee.
 */
export type MyBookingsResponse =
  paths['/v1/bookings/my-bookings']['get']['responses']['200']['content']['application/json'];

/**
 * Get all bookings for the current authenticated user.
 *
 * Returns bookings where the user is either the mentor or mentee,
 * with expanded relations for mentor, mentee, and time_slot data.
 *
 * @returns Promise with array of bookings
 * @throws {ApiError} 401 if not authenticated
 *
 * @example
 * const { bookings } = await getMyBookings();
 * console.log(`You have ${bookings.length} bookings`);
 */
export async function getMyBookings(): Promise<MyBookingsResponse> {
  return apiClient.get('/v1/bookings/my-bookings' as const);
}
