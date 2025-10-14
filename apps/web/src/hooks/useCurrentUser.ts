import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthContext } from "@/contexts/AuthContext";

/**
 * React Query hook for fetching current user profile data.
 *
 * This hook provides user profile information with React Query integration
 * for caching, automatic refetching, and error handling.
 *
 * **When to use:**
 * - Accessing user profile data (name, email, role, etc.)
 * - Displaying user information in UI components
 * - Role-based conditional rendering
 *
 * **Do NOT use for:**
 * - Authentication state checks (use `useAuthContext` instead)
 * - Session/token access (use `useAuthContext` instead)
 *
 * @returns React Query result with user profile data
 * @returns {UserWithProfile | undefined} data - User profile data (undefined when not loaded)
 * @returns {boolean} isLoading - True while fetching user data
 * @returns {Error | null} error - Error object if fetch failed
 * @returns {Function} refetch - Function to manually refetch user data
 *
 * @example
 * // Basic usage
 * const { data: user, isLoading } = useCurrentUser();
 * if (isLoading) return <LoadingSpinner />;
 * return <div>Welcome, {user?.profile.name}!</div>;
 *
 * @example
 * // Role-based rendering
 * const { data: user } = useCurrentUser();
 * const isMentor = user?.role === 'mentor';
 */
export function useCurrentUser() {
  const { session } = useAuthContext();

  return useQuery({
    queryKey: ["user", "current"],
    queryFn: async () => {
      console.log("[USER_PROFILE] Fetching user profile", {
        hasSession: !!session,
        userId: session?.user?.id,
        timestamp: new Date().toISOString(),
      });

      const userData = await apiClient.getCurrentUser();

      console.log("[USER_PROFILE] User profile loaded", {
        userId: userData.id,
        role: userData.role,
        email: userData.email,
        timestamp: new Date().toISOString(),
      });

      return userData;
    },
    enabled: !!session, // Only fetch when authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    retry: 2,
    refetchOnWindowFocus: false, // Avoid duplicate calls on window focus
  });
}
