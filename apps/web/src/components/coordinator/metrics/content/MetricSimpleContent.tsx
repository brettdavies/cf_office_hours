/**
 * MetricSimpleContent Component
 *
 * Pure content component for displaying simple metrics with a value and optional badge.
 * No card/header logic - designed to be used inside MetricContainer.
 *
 * Used for: Tier override pending requests, dormant user counts, rating distribution summaries, etc.
 *
 * Features:
 * - Large value display
 * - Optional status badge with variant
 * - Optional unit/label text
 * - Optional sub-metrics grid (2-column layout)
 * - Optional summary text
 */

import { Badge } from '@/components/ui/badge';

interface MetricSimpleContentProps {
  /**
   * Primary value to display
   */
  value: number | string;

  /**
   * Optional unit/label below value
   */
  unit?: string;

  /**
   * Optional badge text (e.g., "Warning", "OK", "High")
   */
  badgeText?: string;

  /**
   * Optional badge variant styling
   */
  badgeVariant?: 'default' | 'destructive' | 'secondary' | 'outline';

  /**
   * Optional sub-metrics to display in 2-column grid
   * Example: { "Mentors": "170", "Mentees": "9" }
   */
  subMetrics?: Record<string, string | number>;

  /**
   * Optional summary text below metrics
   */
  summary?: string;

  /**
   * Optional color for value text (e.g., "text-green-600")
   */
  valueColor?: string;
}

export function MetricSimpleContent({
  value,
  unit,
  badgeText,
  badgeVariant = 'default',
  subMetrics,
  summary,
  valueColor,
}: MetricSimpleContentProps) {
  return (
    <div className="space-y-3">
      {/* Main Value with Optional Badge */}
      <div className="flex items-baseline gap-3">
        <span className={`text-4xl font-bold ${valueColor || ''}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {badgeText && <Badge variant={badgeVariant}>{badgeText}</Badge>}
      </div>

      {/* Optional Unit Label */}
      {unit && <p className="text-sm text-muted-foreground">{unit}</p>}

      {/* Optional Sub-Metrics Grid */}
      {subMetrics && Object.keys(subMetrics).length > 0 && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(subMetrics).map(([label, val]) => (
            <div key={label}>
              <span className="text-muted-foreground">{label}:</span>{' '}
              <span className="font-medium">
                {typeof val === 'number' ? val.toLocaleString() : val}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Optional Summary Text */}
      {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
    </div>
  );
}
