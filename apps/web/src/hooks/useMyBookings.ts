/**
 * React Query hook for fetching user's bookings.
 *
 * Provides server state management for bookings with automatic
 * caching, refetching, and real-time updates via Supabase Realtime.
 */

// External dependencies
import { useQuery } from '@tanstack/react-query';

// Internal modules
import { getMyBookings } from '@/services/api/bookings';

/**
 * Query key factory for bookings cache management.
 */
export const bookingKeys = {
  all: ['bookings'] as const,
  my: () => [...bookingKeys.all, 'my'] as const,
  detail: (id: string) => [...bookingKeys.all, 'detail', id] as const,
};

/**
 * Hook to fetch current user's bookings (as mentor or mentee).
 *
 * Features:
 * - Automatic caching with React Query
 * - Background refetching on window focus
 * - Error handling with retry logic
 * - Loading and error states
 *
 * @returns Bookings data, loading state, error state, and refetch function
 *
 * @example
 * function MyBookingsPage() {
 *   const { bookings, isLoading, error, refetch } = useMyBookings();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <ErrorMessage error={error} onRetry={refetch} />;
 *
 *   return <BookingsList bookings={bookings} />;
 * }
 */
export function useMyBookings() {
  const query = useQuery({
    queryKey: bookingKeys.my(),
    queryFn: async () => {
      const response = await getMyBookings();
      return response.bookings;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
    refetchOnWindowFocus: true,
    retry: 2,
  });

  return {
    bookings: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}
