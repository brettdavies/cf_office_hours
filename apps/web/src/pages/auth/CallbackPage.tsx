import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function CallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        const state = location.state as { from?: { pathname: string } } | null;
        const from = state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        const hasAuthParams = location.hash.includes('access_token') || location.search.includes('code');
        if (!hasAuthParams) {
          navigate('/auth/login', { replace: true });
        }
      }
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
