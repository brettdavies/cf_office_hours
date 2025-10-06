import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function CallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[AUTH] CallbackPage rendered/updated:', {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        isLoading,
        isAuthenticated,
        timestamp: new Date().toISOString(),
      });
    }

    // Check for various auth parameters that Supabase might include
    const hasAuthParams =
      location.hash.includes('access_token') ||
      location.search.includes('code') ||
      location.search.includes('token'); // Magic link token parameter

    if (import.meta.env.DEV) {
      console.log('[AUTH] Callback auth params check:', {
        hasAuthParams,
        hasAccessToken: location.hash.includes('access_token'),
        hasCode: location.search.includes('code'),
        hasToken: location.search.includes('token'),
        timestamp: new Date().toISOString(),
      });
    }

    // Wait for auth state to be loaded
    if (!isLoading) {
      if (isAuthenticated) {
        // User is authenticated, redirect to dashboard or intended destination
        const state = location.state as { from?: { pathname: string } } | null;
        const from = state?.from?.pathname || '/dashboard';
        if (import.meta.env.DEV) {
          console.log('[AUTH] User authenticated, redirecting to:', {
            destination: from,
            timestamp: new Date().toISOString(),
          });
        }
        navigate(from, { replace: true });
      } else if (!hasAuthParams) {
        // No auth and no auth params in URL, redirect to login
        if (import.meta.env.DEV) {
          console.log('[AUTH] No auth params found, redirecting to login', {
            timestamp: new Date().toISOString(),
          });
        }
        navigate('/auth/login', { replace: true });
      } else if (import.meta.env.DEV) {
        console.warn('[AUTH] Premature redirect prevented - auth params present but session not yet established', {
          hasAuthParams,
          isLoading,
          isAuthenticated,
          timestamp: new Date().toISOString(),
        });
      }
      // If !isAuthenticated but hasAuthParams, stay on callback page
      // The auth state change listener will trigger soon and update isAuthenticated
    } else if (import.meta.env.DEV) {
      console.log('[AUTH] Auth is still loading...', {
        isLoading,
        timestamp: new Date().toISOString(),
      });
    }
  }, [isLoading, isAuthenticated, navigate, location]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
