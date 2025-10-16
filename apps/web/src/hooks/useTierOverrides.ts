/**
 * React Query hook for fetching pending tier override requests.
 *
 * Provides server state management for tier override requests with automatic
 * caching and refetching. Coordinator access only.
 */

// External dependencies
import { useQuery } from '@tanstack/react-query';

// Internal modules
import { getPendingTierOverrides } from '@/services/api/bookings';

/**
 * Query key factory for tier overrides cache management.
 */
export const tierOverrideKeys = {
  all: ['tier-overrides'] as const,
  pending: () => [...tierOverrideKeys.all, 'pending'] as const,
};

/**
 * Hook to fetch pending tier override requests (Coordinator only).
 *
 * Features:
 * - Automatic caching with React Query
 * - Background refetching on window focus
 * - Error handling with retry logic
 * - Loading and error states
 *
 * @returns Override requests data, loading state, error state, and refetch function
 *
 * @example
 * function CoordinatorDashboard() {
 *   const { requests, isLoading, error, refetch } = useTierOverrides();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <ErrorMessage error={error} onRetry={refetch} />;
 *
 *   return <OverrideRequestsList requests={requests} />;
 * }
 */
export function useTierOverrides() {
  const query = useQuery({
    queryKey: tierOverrideKeys.pending(),
    queryFn: async () => {
      const response = await getPendingTierOverrides();
      return response.requests;
    },
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: true,
    retry: 2,
  });

  return {
    requests: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}
