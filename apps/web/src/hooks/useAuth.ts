import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { UserWithProfile } from '@/types/user';

export function useAuth() {
  const { user, session, setUser, setSession, clearAuth } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true); // Start as loading

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[AUTH] Initializing auth hook', {
        timestamp: new Date().toISOString(),
      });
    }

    // Don't call getSession() immediately - it won't have tokens from URL hash yet
    // Instead, wait for onAuthStateChange which fires after Supabase extracts tokens

    let initialSessionHandled = false;

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (import.meta.env.DEV) {
        console.log('[AUTH] onAuthStateChange:', {
          event,
          hasSession: !!session,
          userId: session?.user?.id,
          timestamp: new Date().toISOString(),
        });
      }

      // Mark initialization as complete after first event
      if (!initialSessionHandled) {
        initialSessionHandled = true;
        setIsInitializing(false);
      }

      if (session && session.user) {
        if (import.meta.env.DEV) {
          console.log('[AUTH] Setting session from auth state change', {
            userId: session.user.id,
            event,
            timestamp: new Date().toISOString(),
          });
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
          console.log('[AUTH] Clearing auth (no session)', {
            event,
            timestamp: new Date().toISOString(),
          });
        }
        // Clear token from localStorage
        localStorage.removeItem('auth_token');
        clearAuth();
      }
    });

    return () => {
      if (import.meta.env.DEV) {
        console.log('[AUTH] Unsubscribing from auth state changes');
      }
      subscription.unsubscribe();
    };
  }, [setSession, setUser, clearAuth]);

  const fetchUserProfile = async (accessToken: string) => {
    if (import.meta.env.DEV) {
      console.log('[PROFILE] Fetching user profile', {
        tokenPreview: accessToken.substring(0, 20) + '...',
        timestamp: new Date().toISOString(),
      });
    }

    try {
      // Get user from Supabase auth
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser(accessToken);

      if (import.meta.env.DEV) {
        console.log('[PROFILE] Supabase getUser result:', {
          hasUser: !!authUser,
          error,
          email: authUser?.email,
          userId: authUser?.id,
          timestamp: new Date().toISOString(),
        });
      }

      if (error) throw error;

      if (authUser) {
        // Fetch user role from API
        try {
          const apiUrl = import.meta.env.VITE_API_BASE_URL;
          const response = await fetch(`${apiUrl}/v1/users/me`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (import.meta.env.DEV) {
            console.log('[PROFILE] API /users/me response:', {
              status: response.status,
              ok: response.ok,
              userId: authUser.id,
              timestamp: new Date().toISOString(),
            });
          }

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
              console.log('[PROFILE] User profile loaded successfully', {
                userId: userProfile.id,
                role: userProfile.role,
                email: userProfile.email,
                timestamp: new Date().toISOString(),
              });
            }
            setUser(userProfile);
          } else {
            // API call failed - sign user out (no fallback for security)
            if (import.meta.env.DEV) {
              console.error('[AUTH] API call failed, signing out', {
                status: response.status,
                userId: authUser.id,
                email: authUser.email,
                timestamp: new Date().toISOString(),
              });
            }
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
          }
        } catch (apiError) {
          console.error('[ERROR] Failed to fetch user profile from API', {
            error: apiError instanceof Error ? apiError.message : 'Unknown error',
            userId: authUser.id,
            timestamp: new Date().toISOString(),
          });
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
      console.error('[ERROR] Failed to fetch user profile', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      clearAuth();
    }
  };

  const signOut = async () => {
    if (import.meta.env.DEV) {
      console.log('[AUTH] Signing out', {
        userId: user?.id,
        timestamp: new Date().toISOString(),
      });
    }
    await supabase.auth.signOut();
    localStorage.removeItem('auth_token');
    clearAuth();
  };

  return {
    user,
    session,
    isLoading: isInitializing,
    isAuthenticated: !!session,
    signOut,
  };
}
