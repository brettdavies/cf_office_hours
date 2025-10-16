/**
 * Coordinator Landing Page
 *
 * Dashboard for coordinators showing:
 * 1. Up to 6 favorite metrics (user-selected via star button)
 * 2. Up to 6 most urgent pending override requests (sorted by expiration)
 *
 * Both sections link to their dedicated full-feature pages.
 */

// External dependencies
import { useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Internal modules
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MetricFactory } from '@/components/coordinator/metrics/MetricFactory';
import { OverrideRequestCard } from '@/components/coordinator/OverrideRequestCard';
import { useFavoriteMetrics } from '@/hooks/useFavoriteMetrics';
import { useTierOverrides } from '@/hooks/useTierOverrides';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { coordinatorDashboardConfig } from '@/data/coordinatorMetricsConfig';
import { Star, AlertCircle, ArrowRight, BarChart3, FileCheck } from 'lucide-react';

/**
 * Main coordinator landing page component.
 */
export function CoordinatorLandingPage() {
  const { data: user, isLoading: isLoadingUser } = useCurrentUser();
  const { favorites, isLoaded: isFavoritesLoaded } = useFavoriteMetrics();
  const { requests, isLoading: isLoadingOverrides, error: overridesError } = useTierOverrides();
  const navigate = useNavigate();

  // Redirect if not coordinator
  useEffect(() => {
    if (!isLoadingUser && user && user.role !== 'coordinator') {
      navigate('/dashboard');
    }
  }, [user, isLoadingUser, navigate]);

  // Get favorited metrics (up to 6)
  const favoritedMetrics = useMemo(() => {
    if (!isFavoritesLoaded) return [];

    const allMetrics = coordinatorDashboardConfig.sections.flatMap(section => section.metrics);

    return allMetrics
      .filter(metric => favorites.has(metric.id))
      .slice(0, 6);
  }, [favorites, isFavoritesLoaded]);

  // Get urgent override requests (up to 6, sorted by expiration soonest first)
  const urgentRequests = useMemo(() => {
    return requests
      .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime())
      .slice(0, 6);
  }, [requests]);

  // Loading state
  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render if not coordinator (will redirect)
  if (!user || user.role !== 'coordinator') {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Coordinator Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Quick access to your favorite metrics and urgent override requests
        </p>
      </div>

      {/* Favorite Metrics Section */}
      <section>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle>Your Favorite Metrics</CardTitle>
              </div>
              <Link to="/coordinator/metrics">
                <Button variant="ghost" size="sm" className="gap-2">
                  View All Metrics
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!isFavoritesLoaded ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : favoritedMetrics.length === 0 ? (
              <Alert>
                <Star className="h-4 w-4" />
                <AlertDescription>
                  You haven't starred any metrics yet. Visit the{' '}
                  <Link to="/coordinator/metrics" className="font-medium underline">
                    Metrics page
                  </Link>{' '}
                  and click the star icon on metrics you want to pin here.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoritedMetrics.map(metric => (
                  <MetricFactory key={metric.id} config={metric} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Urgent Override Requests Section */}
      <section>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                <CardTitle>Urgent Override Requests</CardTitle>
                {urgentRequests.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ({urgentRequests.length} shown)
                  </span>
                )}
              </div>
              <Link to="/coordinator/overrides">
                <Button variant="ghost" size="sm" className="gap-2">
                  View All Overrides
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingOverrides ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : overridesError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load override requests. Please try refreshing the page.
                </AlertDescription>
              </Alert>
            ) : urgentRequests.length === 0 ? (
              <Alert>
                <FileCheck className="h-4 w-4" />
                <AlertDescription>
                  No pending override requests at this time. Great work!
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {urgentRequests.map(request => (
                  <OverrideRequestCard
                    key={request.id}
                    request={request}
                    variant="summary"
                    onClick={() => navigate('/coordinator/overrides')}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default CoordinatorLandingPage;
