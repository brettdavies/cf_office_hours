/**
 * CoordinatorMetricsPage
 *
 * Data-driven metrics dashboard for coordinators showing platform analytics.
 * Uses MetricFactory pattern for consistent rendering of all metric types.
 *
 * Organized in 7 collapsible sections with 21 metric cards and 8 charts.
 * All metrics are configured via coordinatorMetricsConfig.ts
 *
 * Benefits of this approach:
 * - No duplication: Card chrome, star button, and info tooltip handled by MetricContainer
 * - Data-driven: Add metrics by adding config entries, not JSX
 * - Maintainable: Single source of truth for metric rendering logic
 * - Type-safe: TypeScript ensures config matches expected types
 */

import { MetricSection } from '@/components/coordinator/metrics/MetricSection';
import { MetricFactory } from '@/components/coordinator/metrics/MetricFactory';
import { coordinatorDashboardConfig } from '@/data/coordinatorMetricsConfig';

/**
 * Helper function to generate responsive grid classes based on column count
 */
function getGridClass(cols: number): string {
  const gridClasses: Record<number, string> = {
    1: 'grid gap-4',
    2: 'grid gap-4 md:grid-cols-2',
    3: 'grid gap-4 md:grid-cols-3',
    4: 'grid gap-4 md:grid-cols-2 lg:grid-cols-4',
  };
  return gridClasses[cols] || 'grid gap-4 md:grid-cols-2';
}

export default function CoordinatorMetricsPage() {
  const lastUpdated = new Date().toLocaleString();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Platform Metrics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor platform performance, trends, and operational health
          </p>
        </div>
        <div className="text-sm text-muted-foreground">Last updated: {lastUpdated}</div>
      </div>

      {/* Data-Driven Sections */}
      {coordinatorDashboardConfig.sections.map((section) => (
        <MetricSection
          key={section.id}
          title={section.title}
          defaultExpanded={section.defaultExpanded}
        >
          <div className={getGridClass(section.gridCols)}>
            {section.metrics.map((metric) => (
              <MetricFactory key={metric.id} config={metric} />
            ))}
          </div>
        </MetricSection>
      ))}
    </div>
  );
}
