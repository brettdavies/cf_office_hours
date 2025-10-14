/**
 * Matching API Hooks
 *
 * Custom hooks for interacting with the matching API endpoints.
 * Uses TanStack Query for caching and state management.
 */

// External dependencies
import { useMutation, useQuery } from "@tanstack/react-query";

// Internal modules
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";

// Types
import type { paths } from "@shared/types/api.generated";

type FindMatchesRequest = NonNullable<
  paths["/v1/matching/find-matches"]["post"]["requestBody"]
>["content"]["application/json"];
type FindMatchesResponse =
  paths["/v1/matching/find-matches"]["post"]["responses"]["200"]["content"][
    "application/json"
  ];

type ExplainMatchRequest = NonNullable<
  paths["/v1/matching/explain"]["post"]["requestBody"]
>["content"]["application/json"];
type ExplainMatchResponse =
  paths["/v1/matching/explain"]["post"]["responses"]["200"]["content"][
    "application/json"
  ];

type GetAlgorithmsResponse =
  paths["/v1/matching/algorithms"]["get"]["responses"]["200"]["content"][
    "application/json"
  ];

type GetUsersWithScoresResponse = {
  users: Array<{
    id: string;
    email: string;
    role: "mentor" | "mentee" | "coordinator";
    profile: {
      name: string | null;
    } | null;
  }>;
};

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
  targetRole: "mentor" | "mentee",
  algorithmVersion: string = "tag-based-v1",
  limit: number = 20,
) {
  const { toast } = useToast();
  const { session } = useAuthContext();

  return useQuery({
    queryKey: ["matches", userId, targetRole, algorithmVersion, limit],
    queryFn: async () => {
      if (!userId) {
        return { matches: [] };
      }

      // Validate auth token exists
      const token = session?.access_token;
      if (!token) {
        throw new Error("Authentication required. Please sign in.");
      }

      if (import.meta.env.DEV) {
        console.log("[CoordinatorMatching] Fetching matches", {
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
        const baseUrl = import.meta.env.VITE_API_BASE_URL ||
          "http://localhost:8787";
        const res = await fetch(`${baseUrl}/v1/matching/find-matches`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.statusText}`);
        }

        const response = await res.json() as FindMatchesResponse;

        if (import.meta.env.DEV) {
          console.log("[CoordinatorMatching] Matches received", {
            count: (response as FindMatchesResponse).matches?.length || 0,
            timestamp: new Date().toISOString(),
          });
        }

        return response as FindMatchesResponse;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("[CoordinatorMatching] Error fetching matches:", {
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
          });
        }

        toast({
          title: "Failed to load matches",
          description: error instanceof Error
            ? error.message
            : "An error occurred",
          variant: "error",
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
  const { session } = useAuthContext();

  return useMutation({
    mutationFn: async ({
      userId1,
      userId2,
      algorithmVersion = "tag-based-v1",
    }: {
      userId1: string;
      userId2: string;
      algorithmVersion?: string;
    }) => {
      // Validate auth token exists
      const token = session?.access_token;
      if (!token) {
        throw new Error("Authentication required. Please sign in.");
      }

      if (import.meta.env.DEV) {
        console.log("[CoordinatorMatching] Explaining match", {
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
        const baseUrl = import.meta.env.VITE_API_BASE_URL ||
          "http://localhost:8787";
        const res = await fetch(`${baseUrl}/v1/matching/explain`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.statusText}`);
        }

        const response = await res.json() as ExplainMatchResponse;

        if (import.meta.env.DEV) {
          console.log("[CoordinatorMatching] Match explanation received", {
            timestamp: new Date().toISOString(),
          });
        }

        return response as ExplainMatchResponse;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("[CoordinatorMatching] Error explaining match:", {
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
          });
        }

        toast({
          title: "Failed to load match explanation",
          description: error instanceof Error
            ? error.message
            : "An error occurred",
          variant: "error",
        });

        throw error;
      }
    },
  });
}

/**
 * Hook to get available matching algorithms
 *
 * Fetches list of available matching algorithms with their descriptions and capabilities.
 * This is used to populate the algorithm selector dropdown.
 *
 * @returns Query result with algorithms, loading state, and error
 */
export function useGetAlgorithms() {
  const { toast } = useToast();
  const { session } = useAuthContext();

  return useQuery({
    queryKey: ["algorithms"],
    queryFn: async () => {
      // Validate auth token exists
      const token = session?.access_token;
      if (!token) {
        throw new Error("Authentication required. Please sign in.");
      }

      if (import.meta.env.DEV) {
        console.log("[CoordinatorMatching] Fetching algorithms", {
          hasToken: !!token,
          timestamp: new Date().toISOString(),
        });
      }

      try {
        // Use fetch directly due to type constraints with generic apiClient.get
        const baseUrl = import.meta.env.VITE_API_BASE_URL ||
          "http://localhost:8787";
        const res = await fetch(`${baseUrl}/v1/matching/algorithms`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.statusText}`);
        }

        const response = await res.json() as GetAlgorithmsResponse;

        if (import.meta.env.DEV) {
          console.log("[CoordinatorMatching] Algorithms received", {
            count: response.algorithms?.length || 0,
            timestamp: new Date().toISOString(),
          });
        }

        return response as GetAlgorithmsResponse;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("[CoordinatorMatching] Error fetching algorithms:", {
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
          });
        }

        toast({
          title: "Failed to load algorithms",
          description: error instanceof Error
            ? error.message
            : "An error occurred",
          variant: "error",
        });

        throw error;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - algorithms don't change frequently
    retry: 1,
  });
}

/**
 * Hook to get users who have match scores for a specific algorithm
 *
 * Fetches users who have match scores cached for the specified algorithm.
 * Useful for filtering user lists to only show users with available match data.
 *
 * @param algorithmVersion - Algorithm version to filter by (default: 'tag-based-v1')
 * @param role - Optional role filter ('mentor', 'mentee', or undefined for all)
 * @returns Query result with users, loading state, and error
 */
export function useGetUsersWithScores(
  algorithmVersion: string = "tag-based-v1",
  role?: "mentor" | "mentee",
) {
  const { toast } = useToast();
  const { session } = useAuthContext();

  return useQuery({
    queryKey: ["users-with-scores", algorithmVersion, role],
    queryFn: async () => {
      // Validate auth token exists
      const token = session?.access_token;
      if (!token) {
        throw new Error("Authentication required. Please sign in.");
      }

      if (import.meta.env.DEV) {
        console.log("[CoordinatorMatching] Fetching users with scores", {
          algorithmVersion,
          role,
          hasToken: !!token,
          timestamp: new Date().toISOString(),
        });
      }

      try {
        // Build query parameters
        const params = new URLSearchParams({ algorithmVersion, limit: "1000" });
        if (role) {
          params.append("role", role);
        }

        // Use fetch directly due to type constraints with generic apiClient.get
        const baseUrl = import.meta.env.VITE_API_BASE_URL ||
          "http://localhost:8787";
        const res = await fetch(
          `${baseUrl}/v1/matching/users-with-scores?${params}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!res.ok) {
          throw new Error(`API error: ${res.statusText}`);
        }

        const response = await res.json() as GetUsersWithScoresResponse;

        if (import.meta.env.DEV) {
          console.log("[CoordinatorMatching] Users with scores received", {
            count: response.users?.length || 0,
            algorithmVersion,
            timestamp: new Date().toISOString(),
          });
        }

        return response as GetUsersWithScoresResponse;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(
            "[CoordinatorMatching] Error fetching users with scores:",
            {
              error: error instanceof Error ? error.message : "Unknown error",
              algorithmVersion,
              timestamp: new Date().toISOString(),
            },
          );
        }

        toast({
          title: "Failed to load users",
          description: error instanceof Error
            ? error.message
            : "An error occurred",
          variant: "error",
        });

        throw error;
      }
    },
    staleTime: 30 * 1000, // 30 seconds - shorter to reflect cache changes more quickly
    retry: 1,
  });
}
