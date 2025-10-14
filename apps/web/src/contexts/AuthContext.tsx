import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import type { Session } from '@supabase/supabase-js';

/**
 * AuthContext provides session and authentication state.
 *
 * NOTE: This context only manages authentication state (session, loading, isAuthenticated).
 * For user profile data, use the `useCurrentUser` hook which provides React Query
 * integration with caching, refetching, and error handling.
 */
export interface AuthState {
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthState | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[AUTH_PROVIDER] Initializing auth provider');

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[AUTH_PROVIDER] Error getting initial session:', error);
        } else {
          console.log('[AUTH_PROVIDER] Initial session:', !!session);
          setSession(session);
        }
      } catch (error) {
        console.error('[AUTH_PROVIDER] Error in getInitialSession:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AUTH_PROVIDER] Auth state change:', {
        event,
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
      });

      setSession(session);

      // Invalidate user profile query when auth state changes
      queryClient.invalidateQueries({ queryKey: ['user', 'current'] });

      setIsLoading(false);
    });

    return () => {
      console.log('[AUTH_PROVIDER] Unsubscribing from auth state changes');
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const value: AuthState = {
    session,
    isLoading,
    isAuthenticated: !!session,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication state (session, loading, isAuthenticated).
 *
 * Use this for:
 * - Checking if user is authenticated
 * - Accessing session/token information
 * - Handling loading states during auth
 *
 * For user profile data, use `useCurrentUser` instead.
 *
 * @example
 * const { session, isLoading, isAuthenticated } = useAuthContext();
 */
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
