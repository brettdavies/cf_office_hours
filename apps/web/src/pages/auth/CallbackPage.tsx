import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

export default function CallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuthContext();

  useEffect(() => {
    console.log('[CALLBACK] Page rendered/updated:', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      isLoading,
      isAuthenticated,
      timestamp: new Date().toISOString(),
    });

    // Check for various auth parameters that Supabase might include
    const hasAuthParams =
      location.hash.includes('access_token') ||
      location.search.includes('code') ||
      location.search.includes('token');

    console.log('[CALLBACK] Auth params check:', {
      hasAuthParams,
      hasAccessToken: location.hash.includes('access_token'),
      hasCode: location.search.includes('code'),
      hasToken: location.search.includes('token'),
      timestamp: new Date().toISOString(),
    });

    // Wait for auth state to be loaded
    if (!isLoading) {
      console.log('[CALLBACK] Auth loading complete', { isAuthenticated, hasAuthParams });

      if (isAuthenticated) {
        const state = location.state as { from?: { pathname: string } } | null;
        const from = state?.from?.pathname || '/dashboard';
        console.log('[CALLBACK] User authenticated, redirecting to:', {
          destination: from,
          timestamp: new Date().toISOString(),
        });
        navigate(from, { replace: true });
      } else if (!hasAuthParams) {
        console.log('[CALLBACK] No auth params found, redirecting to login', {
          timestamp: new Date().toISOString(),
        });
        navigate('/auth/login', { replace: true });
      } else {
        console.warn(
          '[CALLBACK] Waiting for session - auth params present but not authenticated yet',
          {
            hasAuthParams,
            isLoading,
            isAuthenticated,
            timestamp: new Date().toISOString(),
          }
        );
      }
    } else {
      console.log('[CALLBACK] Auth is still loading...', {
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
