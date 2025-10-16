/**
 * MetricEngagementContent Component
 *
 * Pure content component for displaying active/dormant user engagement metrics.
 * No card/header logic - designed to be used inside MetricContainer.
 *
 * Features:
 * - Active vs total user count display
 * - Percentage active with visual prominence
 * - Dormant user count with percentage
 * - Optional warning badge for high dormancy
 */

import { Badge } from '@/components/ui/badge';

interface MetricEngagementContentProps {
  /**
   * Number of active users (had activity in timeframe)
   */
  active: number;

  /**
   * Total number of registered users
   */
  total: number;

  /**
   * Percentage of users who are active
   */
  percentage: number;

  /**
   * Number of dormant users (no activity in timeframe)
   */
  dormant: number;

  /**
   * Percentage of users who are dormant
   */
  dormantPercentage: number;

  /**
   * Show warning badge if dormancy exceeds threshold (default: 25%)
   */
  showWarning?: boolean;
}

export function MetricEngagementContent({
  active,
  total,
  percentage,
  dormant,
  dormantPercentage,
  showWarning = false,
}: MetricEngagementContentProps) {
  return (
    <div className="space-y-3">
      {/* Active / Total Ratio */}
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold">
          {active.toLocaleString()} / {total.toLocaleString()}
        </span>
      </div>

      {/* Percentage Active with Prominent Styling */}
      <div className="flex items-center gap-2">
        <div className="text-lg font-medium text-green-600">
          {percentage.toFixed(1)}% Active
        </div>
        {showWarning && dormantPercentage > 25 && (
          <Badge variant="destructive" className="text-xs">
            High Dormancy
          </Badge>
        )}
      </div>

      {/* Dormant User Information */}
      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{dormant.toLocaleString()}</span> dormant (
        {dormantPercentage.toFixed(1)}%)
      </div>
    </div>
  );
}
