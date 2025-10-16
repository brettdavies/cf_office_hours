/**
 * MetricFactory Component
 *
 * Factory component that renders the appropriate metric or chart based on configuration.
 * Uses MetricContainer for consistent chrome (card, header, actions) and type-specific
 * content components for visualization.
 *
 * This enables data-driven metric rendering - add a metric by adding config, not JSX.
 *
 * Supported Types:
 * - progress: Metrics with progress bars, goals, trends
 * - rating: Star rating displays with breakdowns
 * - engagement: Active/dormant user metrics
 * - simple: Simple value + badge displays
 * - barChart: Grouped or simple bar charts
 * - lineChart: Single or dual-line charts
 * - composedChart: Bar + line combination (YoY comparisons)
 * - funnelChart: Conversion funnel visualization
 */

import { MetricContainer } from './base/MetricContainer';
import { MetricProgressContent } from './content/MetricProgressContent';
import { MetricRatingContent } from './content/MetricRatingContent';
import { MetricEngagementContent } from './content/MetricEngagementContent';
import { MetricSimpleContent } from './content/MetricSimpleContent';
import { BarChartContent } from './content/BarChartContent';
import { LineChartContent } from './content/LineChartContent';
import { ComposedChartContent } from './content/ComposedChartContent';
import { FunnelChartContent } from './content/FunnelChartContent';
import { MetricInfo } from './InfoTooltip';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type MetricType =
  | 'progress'
  | 'rating'
  | 'engagement'
  | 'simple'
  | 'barChart'
  | 'lineChart'
  | 'composedChart'
  | 'funnelChart';

interface BaseMetricConfig {
  id: string;
  type: MetricType;
  title: string;
  description?: string;
  metricInfo?: MetricInfo;
}

interface ProgressMetricConfig extends BaseMetricConfig {
  type: 'progress';
  data: {
    value: number | string;
    unit?: string;
    goal?: number;
    current?: number;
    progress?: number;
    trend?: number;
    trendDirection?: 'up' | 'down';
    description?: string;
  };
}

interface RatingMetricConfig extends BaseMetricConfig {
  type: 'rating';
  data: {
    value: number;
    unit?: string;
    mentorAvg?: number;
    menteeAvg?: number;
    trend?: number;
    trendDirection?: 'up' | 'down';
  };
}

interface EngagementMetricConfig extends BaseMetricConfig {
  type: 'engagement';
  data: {
    active: number;
    total: number;
    percentage: number;
    dormant: number;
    dormantPercentage: number;
    showWarning?: boolean;
  };
}

interface SimpleMetricConfig extends BaseMetricConfig {
  type: 'simple';
  data: {
    value: number | string;
    unit?: string;
    badgeText?: string;
    badgeVariant?: 'default' | 'destructive' | 'secondary' | 'outline';
    subMetrics?: Record<string, string | number>;
    summary?: string;
    valueColor?: string;
  };
}

interface BarChartMetricConfig extends BaseMetricConfig {
  type: 'barChart';
  data: {
    data: Record<string, string | number>[];
    xAxisKey: string;
    bars?: { dataKey: string; name: string; color: string }[];
    yAxisKey?: string;
    layout?: 'horizontal' | 'vertical';
    colors?: string[];
    height?: number;
  };
}

interface LineChartMetricConfig extends BaseMetricConfig {
  type: 'lineChart';
  data: {
    data: Record<string, string | number>[];
    xAxisKey: string;
    lines: { dataKey: string; name: string; color: string; strokeWidth?: number }[];
    height?: number;
  };
}

interface ComposedChartMetricConfig extends BaseMetricConfig {
  type: 'composedChart';
  data: {
    data: { week: string; currentYear: number; lastYear: number }[];
    currentYearLabel?: string;
    lastYearLabel?: string;
    height?: number;
  };
}

interface FunnelChartMetricConfig extends BaseMetricConfig {
  type: 'funnelChart';
  data: {
    data: { stage: string; count: number; percentage: number }[];
  };
}

export type MetricConfig =
  | ProgressMetricConfig
  | RatingMetricConfig
  | EngagementMetricConfig
  | SimpleMetricConfig
  | BarChartMetricConfig
  | LineChartMetricConfig
  | ComposedChartMetricConfig
  | FunnelChartMetricConfig;

// ============================================================================
// METRIC FACTORY COMPONENT
// ============================================================================

interface MetricFactoryProps {
  config: MetricConfig;
}

export function MetricFactory({ config }: MetricFactoryProps) {
  // Render appropriate content based on type
  const renderContent = () => {
    switch (config.type) {
      case 'progress':
        return <MetricProgressContent {...config.data} />;

      case 'rating':
        return <MetricRatingContent {...config.data} />;

      case 'engagement':
        return <MetricEngagementContent {...config.data} />;

      case 'simple':
        return <MetricSimpleContent {...config.data} />;

      case 'barChart':
        return <BarChartContent {...config.data} />;

      case 'lineChart':
        return <LineChartContent {...config.data} />;

      case 'composedChart':
        return <ComposedChartContent {...config.data} />;

      case 'funnelChart':
        return <FunnelChartContent {...config.data} />;

      default:
        return (
          <div className="text-destructive">
            Unknown metric type: {(config as BaseMetricConfig).type}
          </div>
        );
    }
  };

  return (
    <MetricContainer
      title={config.title}
      description={config.description}
      metricId={config.id}
      metricInfo={config.metricInfo}
    >
      {renderContent()}
    </MetricContainer>
  );
}
