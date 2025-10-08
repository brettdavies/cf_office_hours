/**
 * Matching API Hooks
 *
 * Custom hooks for interacting with the matching API endpoints.
 * Uses TanStack Query for caching and state management.
 */

// External dependencies
import { useQuery, useMutation } from '@tanstack/react-query';

// Internal modules
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';

// Types
import type { paths } from '@shared/types/api.generated';

type FindMatchesRequest = NonNullable<
  paths['/v1/matching/find-matches']['post']['requestBody']
>['content']['application/json'];
type FindMatchesResponse =
  paths['/v1/matching/find-matches']['post']['responses']['200']['content']['application/json'];

type ExplainMatchRequest = NonNullable<
  paths['/v1/matching/explain']['post']['requestBody']
>['content']['application/json'];
type ExplainMatchResponse =
  paths['/v1/matching/explain']['post']['responses']['200']['content']['application/json'];

/**
 * Hook to find matches for a user
 *
 * Fetches pre-calculated match recommendations from the cache.
 * Automatically refetches when userId, targetRole, or algorithmVersion changes.
 *
 * @param userId - User ID to find matches for (null disables query)
 * @param targetRole - Role to find matches for ('mentor' or 'mentee')
 * @param algorithmVersion - Algorithm version to use (default: 'tag-based-v1')
 * @param limit - Maximum number of matches to return (default: 20)
 * @returns Query result with matches, loading state, and error
 */
export function useFindMatches(
  userId: string | null,
  targetRole: 'mentor' | 'mentee',
  algorithmVersion: string = 'tag-based-v1',
  limit: number = 20
) {
  const { toast } = useToast();
  const session = useAuthStore(state => state.session);

  return useQuery({
    queryKey: ['matches', userId, targetRole, algorithmVersion, limit],
    queryFn: async () => {
      if (!userId) {
        return { matches: [] };
      }

      // Validate auth token exists
      const token = session?.access_token;
      if (!token) {
        throw new Error('Authentication required. Please sign in.');
      }

      if (import.meta.env.DEV) {
        console.log('[CoordinatorMatching] Fetching matches', {
          userId,
          targetRole,
          algorithmVersion,
          limit,
          hasToken: !!token,
          timestamp: new Date().toISOString(),
        });
      }

      try {
        const requestBody: FindMatchesRequest = {
          userId,
          targetRole,
          options: {
            algorithmVersion,
            limit,
          },
        };

        // Use fetch directly due to type constraints with generic apiClient.post
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
        const res = await fetch(`${baseUrl}/v1/matching/find-matches`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.statusText}`);
        }

        const response = await res.json() as FindMatchesResponse;

        if (import.meta.env.DEV) {
          console.log('[CoordinatorMatching] Matches received', {
            count: (response as FindMatchesResponse).matches?.length || 0,
            timestamp: new Date().toISOString(),
          });
        }

        return response as FindMatchesResponse;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[CoordinatorMatching] Error fetching matches:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          });
        }

        toast({
          title: 'Failed to load matches',
          description: error instanceof Error ? error.message : 'An error occurred',
          variant: 'error',
        });

        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes - matches don't change frequently
    retry: 1,
  });
}

/**
 * Hook to explain a match between two users
 *
 * Returns a mutation function that can be called to fetch match explanation.
 * Use this when user clicks "Explain Match" button.
 *
 * @returns Mutation object with mutate function, loading state, and data
 */
export function useExplainMatch() {
  const { toast } = useToast();
  const session = useAuthStore(state => state.session);

  return useMutation({
    mutationFn: async ({
      userId1,
      userId2,
      algorithmVersion = 'tag-based-v1',
    }: {
      userId1: string;
      userId2: string;
      algorithmVersion?: string;
    }) => {
      // Validate auth token exists
      const token = session?.access_token;
      if (!token) {
        throw new Error('Authentication required. Please sign in.');
      }

      if (import.meta.env.DEV) {
        console.log('[CoordinatorMatching] Explaining match', {
          userId1,
          userId2,
          algorithmVersion,
          hasToken: !!token,
          timestamp: new Date().toISOString(),
        });
      }

      try {
        const requestBody: ExplainMatchRequest = {
          userId1,
          userId2,
          algorithmVersion,
        };

        // Use fetch directly due to type constraints with generic apiClient.post
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
        const res = await fetch(`${baseUrl}/v1/matching/explain`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.statusText}`);
        }

        const response = await res.json() as ExplainMatchResponse;

        if (import.meta.env.DEV) {
          console.log('[CoordinatorMatching] Match explanation received', {
            timestamp: new Date().toISOString(),
          });
        }

        return response as ExplainMatchResponse;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[CoordinatorMatching] Error explaining match:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          });
        }

        toast({
          title: 'Failed to load match explanation',
          description: error instanceof Error ? error.message : 'An error occurred',
          variant: 'error',
        });

        throw error;
      }
    },
  });
}
