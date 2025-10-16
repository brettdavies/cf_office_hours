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

/**
 * Type for tier override request with enriched user data.
 */
export type TierOverrideRequest =
  paths['/v1/bookings/overrides/pending']['get']['responses']['200']['content']['application/json']['requests'][number];

/**
 * Response type for GET /v1/bookings/overrides/pending.
 * Returns list of pending tier override requests (coordinator only).
 */
export type PendingOverridesResponse =
  paths['/v1/bookings/overrides/pending']['get']['responses']['200']['content']['application/json'];

/**
 * Get all pending tier override requests (Coordinator only).
 *
 * Returns pending requests with enriched user profiles and match scores.
 * Only accessible to coordinators.
 *
 * @returns Promise with array of tier override requests
 * @throws {ApiError} 401 if not authenticated
 * @throws {ApiError} 403 if not coordinator role
 *
 * @example
 * const { requests } = await getPendingTierOverrides();
 * console.log(`${requests.length} pending override requests`);
 */
export async function getPendingTierOverrides(): Promise<PendingOverridesResponse> {
  return apiClient.get('/v1/bookings/overrides/pending' as const);
}
