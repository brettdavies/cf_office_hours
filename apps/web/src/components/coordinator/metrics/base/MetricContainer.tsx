/**
 * MetricContainer Component
 *
 * Universal wrapper for all metrics and charts on the coordinator dashboard.
 * Provides consistent card shell, header, action buttons (star/info), and favorites integration.
 *
 * This is the single abstraction layer that eliminates duplication across all metric components.
 *
 * Usage:
 * <MetricContainer title="..." metricId="..." metricInfo={...}>
 *   <YourCustomContent />
 * </MetricContainer>
 */

import { ReactNode } from 'react';
import { Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InfoTooltip, MetricInfo } from '../InfoTooltip';
import { useFavoriteMetrics } from '@/hooks/useFavoriteMetrics';

interface MetricContainerProps {
  /**
   * Primary title displayed in card header
   */
  title: string;

  /**
   * Optional subtitle/description below title
   */
  description?: string;

  /**
   * Unique identifier for favorites system
   */
  metricId: string;

  /**
   * Metric information for info tooltip (what/why/how)
   */
  metricInfo?: MetricInfo;

  /**
   * Content to render inside card (metric visualization)
   */
  children: ReactNode;

  /**
   * Optional CSS classes for card styling
   */
  className?: string;
}

export function MetricContainer({
  title,
  description,
  metricId,
  metricInfo,
  children,
  className = '',
}: MetricContainerProps) {
  const { toggleFavorite, isFavorite } = useFavoriteMetrics();
  const isMetricFavorited = isFavorite(metricId);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>

          {/* Action Buttons: Star (Favorite) + Info Tooltip */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => toggleFavorite(metricId)}
              aria-label={isMetricFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star
                className={`h-4 w-4 ${
                  isMetricFavorited
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground'
                }`}
              />
            </Button>

            {metricInfo && <InfoTooltip metricInfo={metricInfo} />}
          </div>
        </div>
      </CardHeader>

      <CardContent>{children}</CardContent>
    </Card>
  );
}
