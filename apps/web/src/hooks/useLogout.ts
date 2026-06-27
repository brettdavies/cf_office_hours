import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { logout as clearSession } from '@/services/auth';

/**
 * Hook for logging out the current user.
 *
 * Centralizes logout cleanup:
 * - Clears React Query cache
 * - Clears the stored session token
 * - Navigates to the login page
 *
 * @returns Object containing logout function
 *
 * @example
 * const { logout } = useLogout();
 * await logout();
 */
export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logout = async () => {
    queryClient.clear();
    clearSession();
    navigate('/auth/login');
  };

  return { logout };
}
