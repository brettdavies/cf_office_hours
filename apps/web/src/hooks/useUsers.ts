/**
 * React Query hooks for user-related operations.
 *
 * Provides hooks for fetching and managing user data with caching.
 */

// External dependencies
import { useQuery } from '@tanstack/react-query';

// Internal modules
import { getUsers } from '@/services/api/users';

/**
 * Hook to fetch list of mentors.
 *
 * Uses React Query for caching and automatic refetching.
 * Cache is kept for 5 minutes (staleTime).
 *
 * @returns React Query result with mentors data, loading state, error, and refetch function
 *
 * @example
 * const { data: mentors, isLoading, error, refetch } = useMentors();
 *
 * if (isLoading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage />;
 * return <MentorGrid mentors={mentors} />;
 */
export function useMentors() {
  return useQuery({
    queryKey: ['users', 'list', { role: 'mentor' }],
    queryFn: () => getUsers({ role: 'mentor' }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
