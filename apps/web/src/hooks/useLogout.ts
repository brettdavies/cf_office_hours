import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';

/**
 * Hook for logging out the current user.
 *
 * Provides a centralized logout function that handles all cleanup:
 * - Signs out from Supabase
 * - Clears React Query cache
 * - Clears localStorage auth tokens
 * - Navigates to login page
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
    // Clear all React Query caches
    queryClient.clear();

    // Clear localStorage auth token
    localStorage.removeItem('auth_token');

    // Sign out from Supabase
    await supabase.auth.signOut();

    // Navigate to login page
    navigate('/auth/login');
  };

  return { logout };
}
