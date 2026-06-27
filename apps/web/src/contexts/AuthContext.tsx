import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSession, onAuthChange, type AuthSession } from '@/services/auth';

/**
 * AuthContext provides session and authentication state.
 *
 * NOTE: This context only manages authentication state (session, loading, isAuthenticated).
 * For user profile data, use the `useCurrentUser` hook which provides React Query
 * integration with caching, refetching, and error handling.
 */
export interface AuthState {
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthState | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Session is read synchronously from localStorage, so there is no async load step.
  const [session, setSession] = useState<AuthSession | null>(() => getSession());
  const queryClient = useQueryClient();

  useEffect(() => {
    return onAuthChange(() => {
      setSession(getSession());
      queryClient.invalidateQueries({ queryKey: ['user', 'current'] });
    });
  }, [queryClient]);

  const value: AuthState = {
    session,
    isLoading: false,
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
