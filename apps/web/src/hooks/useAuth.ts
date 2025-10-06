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
    if (import.meta.env.DEV) {
      console.log('[useAuth] Initializing auth hook');
    }

    // Get initial session from Supabase
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (import.meta.env.DEV) {
        console.log('[useAuth] getSession result:', {
          hasSession: !!session,
          error,
          userId: session?.user?.id
        });
      }

      if (session) {
        if (import.meta.env.DEV) {
          console.log('[useAuth] Setting session from getSession');
        }
        setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        // Store token in localStorage for API client
        localStorage.setItem('auth_token', session.access_token);
        // Fetch user profile from API
        fetchUserProfile(session.access_token);
      } else if (import.meta.env.DEV) {
        console.log('[useAuth] No session found in getSession');
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (import.meta.env.DEV) {
        console.log('[useAuth] onAuthStateChange:', {
          event,
          hasSession: !!session,
          userId: session?.user?.id,
          timestamp: new Date().toISOString()
        });
      }

      if (session) {
        if (import.meta.env.DEV) {
          console.log('[useAuth] Setting session from auth state change');
        }
        setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        // Store token in localStorage for API client
        localStorage.setItem('auth_token', session.access_token);
        fetchUserProfile(session.access_token);
      } else {
        if (import.meta.env.DEV) {
          console.log('[useAuth] Clearing auth (no session)');
        }
        // Clear token from localStorage
        localStorage.removeItem('auth_token');
        clearAuth();
      }
    });

    return () => {
      if (import.meta.env.DEV) {
        console.log('[useAuth] Unsubscribing from auth state changes');
      }
      subscription.unsubscribe();
    };
  }, [setSession, setUser, clearAuth]);

  const fetchUserProfile = async (accessToken: string) => {
    if (import.meta.env.DEV) {
      console.log('[useAuth] Fetching user profile with token:', accessToken.substring(0, 20) + '...');
    }

    try {
      // Get user from Supabase auth
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser(accessToken);

      if (import.meta.env.DEV) {
        console.log('[useAuth] getUser result:', {
          hasUser: !!authUser,
          error,
          email: authUser?.email
        });
      }

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
        if (import.meta.env.DEV) {
          console.log('[useAuth] Setting user profile:', userProfile);
        }
        setUser(userProfile);
      }
    } catch (error) {
      console.error('[useAuth] Failed to fetch user profile:', error);
      clearAuth();
    }
  };

  const signOut = async () => {
    if (import.meta.env.DEV) {
      console.log('[useAuth] Signing out');
    }
    await supabase.auth.signOut();
    localStorage.removeItem('auth_token');
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
