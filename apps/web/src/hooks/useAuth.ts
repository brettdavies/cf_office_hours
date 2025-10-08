import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { UserWithProfile } from '@/types/user';

export function useAuth() {
  const { user, session, setUser, setSession, clearAuth } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    console.log('[AUTH] Initializing auth hook', {
      timestamp: new Date().toISOString(),
    });

    // Don't call getSession() immediately - it won't have tokens from URL hash yet
    // Instead, wait for onAuthStateChange which fires after Supabase extracts tokens

    let initialSessionHandled = false;

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AUTH] onAuthStateChange:', {
        event,
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        hasAccessToken: !!session?.access_token,
        accessTokenLength: session?.access_token?.length || 0,
        timestamp: new Date().toISOString(),
      });

      // Mark initialization as complete after first event
      if (!initialSessionHandled) {
        console.log('[AUTH] First auth event - marking initialization complete');
        initialSessionHandled = true;
        setIsInitializing(false);
      }

      if (session && session.user) {
        console.log('[AUTH] Setting session from auth state change', {
          userId: session.user.id,
          event,
          hasAccessToken: !!session.access_token,
          tokenLength: session.access_token?.length || 0,
          tokenPreview: session.access_token ? session.access_token.substring(0, 30) + '...' : 'NO TOKEN',
          timestamp: new Date().toISOString(),
        });

        setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

        // Store token in localStorage for API client
        console.log('[AUTH] About to store token in localStorage...', {
          hasToken: !!session.access_token,
          tokenLength: session.access_token?.length || 0,
        });
        localStorage.setItem('auth_token', session.access_token);

        const storedToken = localStorage.getItem('auth_token');
        console.log('[AUTH] Token stored in localStorage', {
          key: 'auth_token',
          hasStoredToken: !!storedToken,
          storedTokenLength: storedToken?.length || 0,
          storedTokenPreview: storedToken ? storedToken.substring(0, 30) + '...' : 'NO TOKEN',
        });

        fetchUserProfile(session.access_token);
      } else {
        console.log('[AUTH] Clearing auth (no session)', {
          event,
          timestamp: new Date().toISOString(),
        });
        localStorage.removeItem('auth_token');
        clearAuth();
      }
    });

    return () => {
      console.log('[AUTH] Unsubscribing from auth state changes');
      subscription.unsubscribe();
    };
  }, [setSession, setUser, clearAuth]);

  const fetchUserProfile = async (accessToken: string) => {
    console.log('[PROFILE] Starting fetchUserProfile', {
      hasToken: !!accessToken,
      tokenLength: accessToken?.length || 0,
      tokenPreview: accessToken ? accessToken.substring(0, 30) + '...' : 'EMPTY TOKEN',
      timestamp: new Date().toISOString(),
    });

    if (!accessToken) {
      console.error('[PROFILE] ERROR: accessToken is empty or undefined!');
      return;
    }

    try {
      console.log('[PROFILE] Calling supabase.auth.getUser()...');

      // Get user from Supabase auth
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser(accessToken);

      console.log('[PROFILE] Supabase getUser result:', {
        hasUser: !!authUser,
        error: error?.message || null,
        email: authUser?.email,
        userId: authUser?.id,
        timestamp: new Date().toISOString(),
      });

      if (error) throw error;

      if (authUser) {
        // Fetch user role from API
        try {
          const apiUrl = import.meta.env.VITE_API_BASE_URL;

          console.log('[PROFILE] About to call API /v1/users/me', {
            url: `${apiUrl}/v1/users/me`,
            hasToken: !!accessToken,
            tokenLength: accessToken.length,
            tokenPreview: accessToken.substring(0, 30) + '...',
            timestamp: new Date().toISOString(),
          });

          const response = await fetch(`${apiUrl}/v1/users/me`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          console.log('[PROFILE] API /v1/users/me response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            userId: authUser.id,
            timestamp: new Date().toISOString(),
          });

          if (response.ok) {
            const userData = await response.json();
            console.log('[PROFILE] User data received from API:', {
              hasRole: !!userData.role,
              role: userData.role,
              userId: userData.id || authUser.id,
            });

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

            console.log('[PROFILE] User profile loaded successfully', {
              userId: userProfile.id,
              role: userProfile.role,
              email: userProfile.email,
              timestamp: new Date().toISOString(),
            });

            setUser(userProfile);
          } else {
            const errorText = await response.text();
            console.error('[AUTH] API call failed - signing out', {
              status: response.status,
              statusText: response.statusText,
              errorBody: errorText,
              userId: authUser.id,
              email: authUser.email,
              timestamp: new Date().toISOString(),
            });

            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
          }
        } catch (apiError) {
          console.error('[ERROR] Failed to fetch user profile from API', {
            error: apiError instanceof Error ? apiError.message : 'Unknown error',
            errorStack: apiError instanceof Error ? apiError.stack : undefined,
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
      console.error('[ERROR] Failed to fetch user profile from Supabase', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      clearAuth();
    }
  };

  const signOut = async () => {
    console.log('[AUTH] Signing out', {
      userId: user?.id,
      timestamp: new Date().toISOString(),
    });
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
