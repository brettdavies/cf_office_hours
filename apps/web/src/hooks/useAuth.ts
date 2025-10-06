import { useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { UserWithProfile } from '@/types/user';

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
          userId: session?.user?.id,
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
          timestamp: new Date().toISOString(),
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
      console.log(
        '[useAuth] Fetching user profile with token:',
        accessToken.substring(0, 20) + '...'
      );
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
          email: authUser?.email,
        });
      }

      if (error) throw error;

      if (authUser) {
        // Fetch user role from API
        try {
          const apiUrl = import.meta.env.VITE_API_BASE_URL;
          const response = await fetch(`${apiUrl}/users/me`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (response.ok) {
            const userData = await response.json();
            const userProfile: UserWithProfile = {
              id: authUser.id,
              airtable_record_id: userData.airtable_record_id || null,
              email: authUser.email || '',
              role: userData.role,
              created_at: userData.created_at || new Date().toISOString(),
              updated_at: userData.updated_at || new Date().toISOString(),
              profile: userData.profile || {
                id: userData.profile?.id || '',
                user_id: authUser.id,
                name: authUser.user_metadata?.name || null,
                title: null,
                company: null,
                bio: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            };
            if (import.meta.env.DEV) {
              console.log('[useAuth] Setting user profile with role:', userProfile);
            }
            setUser(userProfile);
          } else {
            // Fallback if API call fails
            const userProfile: UserWithProfile = {
              id: authUser.id,
              airtable_record_id: null,
              email: authUser.email || '',
              role: 'mentee', // Default role
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              profile: {
                id: '',
                user_id: authUser.id,
                name: authUser.user_metadata?.name || null,
                title: null,
                company: null,
                bio: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            };
            if (import.meta.env.DEV) {
              console.log('[useAuth] API call failed, using default role:', userProfile);
            }
            setUser(userProfile);
          }
        } catch (apiError) {
          console.error('[useAuth] Failed to fetch from API:', apiError);
          // Fallback to basic user data
          const userProfile: UserWithProfile = {
            id: authUser.id,
            airtable_record_id: null,
            email: authUser.email || '',
            role: 'mentee', // Default role
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            profile: {
              id: '',
              user_id: authUser.id,
              name: authUser.user_metadata?.name || null,
              title: null,
              company: null,
              bio: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          };
          setUser(userProfile);
        }
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
