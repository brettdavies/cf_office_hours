/**
 * FunnelChartContent Component
 *
 * Pure content component for rendering funnel visualizations.
 * No card/header logic - designed to be used inside MetricContainer.
 *
 * Used for: Booking conversion funnel (search → profile → booking → attendance)
 *
 * Features:
 * - Progressive width bars representing conversion rates
 * - Stage labels with count and percentage
 * - Decreasing opacity for funnel effect
 * - Inline percentage display on bars
 */

interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
}

interface FunnelChartContentProps {
  /**
   * Funnel stage data (ordered from top to bottom)
   */
  data: FunnelStage[];
}

export function FunnelChartContent({ data }: FunnelChartContentProps) {
  // Calculate max count for width scaling
  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="space-y-2">
      {data.map((stage, index) => {
        const widthPercentage = (stage.count / maxCount) * 100;
        const opacity = 1 - index * 0.15; // Decreasing opacity for funnel effect

        return (
          <div key={stage.stage} className="space-y-1">
            {/* Stage Label with Count and Percentage */}
            <div className="flex justify-between text-sm">
              <span className="font-medium">{stage.stage}</span>
              <span className="text-muted-foreground">
                {stage.count.toLocaleString()} ({stage.percentage.toFixed(1)}%)
              </span>
            </div>

            {/* Funnel Bar */}
            <div className="w-full bg-gray-200 rounded-full h-8 flex items-center justify-start overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                style={{
                  width: `${widthPercentage}%`,
                  backgroundColor: `hsl(var(--primary))`,
                  opacity: opacity,
                }}
              >
                {/* Show percentage inside bar if there's enough space */}
                {widthPercentage > 20 && (
                  <span className="text-xs font-semibold text-white">
                    {stage.percentage.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
