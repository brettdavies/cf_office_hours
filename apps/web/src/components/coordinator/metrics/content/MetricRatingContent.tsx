/**
 * MetricRatingContent Component
 *
 * Pure content component for displaying star ratings with breakdown.
 * No card/header logic - designed to be used inside MetricContainer.
 *
 * Features:
 * - Large star icon with rating value
 * - Optional mentor/mentee average breakdown
 * - Optional trend indicator with direction
 */

import { Star, ArrowUp, ArrowDown } from 'lucide-react';

interface MetricRatingContentProps {
  /**
   * Primary rating value (1-5 scale)
   */
  value: number;

  /**
   * Optional unit label (defaults to "/ 5.0")
   */
  unit?: string;

  /**
   * Optional mentor average rating
   */
  mentorAvg?: number;

  /**
   * Optional mentee average rating
   */
  menteeAvg?: number;

  /**
   * Optional trend value (rating change)
   */
  trend?: number;

  /**
   * Optional trend direction (up = improving, down = declining)
   */
  trendDirection?: 'up' | 'down';
}

export function MetricRatingContent({
  value,
  unit = '/ 5.0',
  mentorAvg,
  menteeAvg,
  trend,
  trendDirection,
}: MetricRatingContentProps) {
  return (
    <div className="space-y-3">
      {/* Main Rating Display with Star Icon */}
      <div className="flex items-center gap-2">
        <Star className="h-8 w-8 fill-yellow-400 text-yellow-400" />
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">{value.toFixed(1)}</span>
          <span className="text-lg text-muted-foreground">{unit}</span>
        </div>
      </div>

      {/* Mentor/Mentee Breakdown */}
      {(mentorAvg !== undefined || menteeAvg !== undefined) && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {mentorAvg !== undefined && (
            <div>
              <span className="text-muted-foreground">Mentor Avg:</span>{' '}
              <span className="font-medium">{mentorAvg.toFixed(1)}</span>
            </div>
          )}
          {menteeAvg !== undefined && (
            <div>
              <span className="text-muted-foreground">Mentee Avg:</span>{' '}
              <span className="font-medium">{menteeAvg.toFixed(1)}</span>
            </div>
          )}
        </div>
      )}

      {/* Trend Indicator */}
      {trend !== undefined && trendDirection && (
        <div
          className={`flex items-center text-sm font-medium ${
            trendDirection === 'up' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {trendDirection === 'up' ? (
            <ArrowUp className="h-4 w-4 mr-1" />
          ) : (
            <ArrowDown className="h-4 w-4 mr-1" />
          )}
          <span>
            {trendDirection === 'up' ? '+' : ''}
            {trend.toFixed(1)} from last month
          </span>
        </div>
      )}
    </div>
  );
}
