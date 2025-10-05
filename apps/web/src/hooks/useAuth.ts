import { useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';

interface UserWithProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

export function useAuth() {
  const { user, session, setUser, setSession, clearAuth } = useAuthStore();

  useEffect(() => {
    // Get initial session from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        // Fetch user profile from API
        fetchUserProfile(session.access_token);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        fetchUserProfile(session.access_token);
      } else {
        clearAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setUser, clearAuth]);

  const fetchUserProfile = async (accessToken: string) => {
    try {
      // Get user from Supabase auth
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser(accessToken);

      if (error) throw error;

      if (authUser) {
        // For Epic 0, we use Supabase auth user data directly
        // In Epic 1+, we'll fetch from /users/me API endpoint
        const userProfile: UserWithProfile = {
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name,
          avatar_url: authUser.user_metadata?.avatar_url,
        };
        setUser(userProfile);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      clearAuth();
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearAuth();
  };

  return {
    user,
    session,
    isLoading: session !== null && user === null,
    isAuthenticated: !!user,
    signOut,
  };
}
