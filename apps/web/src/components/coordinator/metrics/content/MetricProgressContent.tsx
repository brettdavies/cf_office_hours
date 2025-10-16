/**
 * MetricProgressContent Component
 *
 * Pure content component for displaying metrics with progress bars, goals, and trends.
 * No card/header logic - designed to be used inside MetricContainer.
 *
 * Features:
 * - Large value display with optional unit
 * - Optional trend indicator (up/down arrow with percentage)
 * - Optional goal and current value display
 * - Color-coded progress bar (green/yellow/red based on progress)
 * - Optional description text
 */

import { ArrowUp, ArrowDown } from 'lucide-react';

interface MetricProgressContentProps {
  /**
   * Primary metric value (number or formatted string)
   */
  value: number | string;

  /**
   * Optional unit label (e.g., "%", "companies", "meetings")
   */
  unit?: string;

  /**
   * Optional goal value for progress calculation
   */
  goal?: number;

  /**
   * Optional current value (compared to goal)
   */
  current?: number;

  /**
   * Optional progress percentage (0-100)
   */
  progress?: number;

  /**
   * Optional trend value (percentage change)
   */
  trend?: number;

  /**
   * Optional trend direction (up = positive, down = negative)
   */
  trendDirection?: 'up' | 'down';

  /**
   * Optional description/footnote text
   */
  description?: string;
}

/**
 * Determines progress bar color based on progress percentage.
 * Green: >70%, Yellow: 40-70%, Red: <40%
 */
function getProgressColor(progress: number): string {
  if (progress > 70) return 'bg-green-600';
  if (progress >= 40) return 'bg-yellow-500';
  return 'bg-red-600';
}

export function MetricProgressContent({
  value,
  unit,
  goal,
  current,
  progress,
  trend,
  trendDirection,
  description,
}: MetricProgressContentProps) {
  return (
    <div className="space-y-3">
      {/* Main Value Display */}
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
          {unit && <span className="text-lg text-muted-foreground">{unit}</span>}
        </div>

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
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      {/* Sub-metrics: Goal and Current */}
      {(goal !== undefined || current !== undefined) && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {goal !== undefined && (
            <div>
              <span className="text-muted-foreground">Goal:</span>{' '}
              <span className="font-medium">{goal}</span>
            </div>
          )}
          {current !== undefined && (
            <div>
              <span className="text-muted-foreground">Current:</span>{' '}
              <span className="font-medium">{current}</span>
            </div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {progress !== undefined && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(progress)}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Optional Description */}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
