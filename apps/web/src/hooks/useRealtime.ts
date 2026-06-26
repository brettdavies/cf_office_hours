/**
 * Live-update hooks for booking data.
 *
 * With the database on Cloudflare D1 there is no push-based realtime channel, so
 * freshness comes from polling: the hook periodically invalidates the bookings
 * query, prompting React Query to refetch.
 */

// External dependencies
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Internal modules
import { bookingKeys } from './useMyBookings';

/** How often to refresh the current user's bookings, in milliseconds. */
const POLL_INTERVAL_MS = 15000;

/**
 * Keep the current user's bookings fresh by polling.
 *
 * Invalidates the bookings query on an interval so React Query refetches and the
 * UI reflects bookings created or canceled by the other party.
 *
 * @param userId - Current user's ID; polling is disabled when undefined
 *
 * @example
 * function DashboardPage() {
 *   const { user } = useAuth();
 *   useMyBookingsRealtime(user?.id);
 * }
 */
export function useMyBookingsRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) {
      return;
    }

    const intervalId = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.my() });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [userId, queryClient]);
}
