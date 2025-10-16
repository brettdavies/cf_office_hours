/**
 * Centralized Mock Fixtures for Coordinator Metrics
 *
 * Factory functions for creating mock metric configurations and data.
 * CRITICAL: All tests MUST use these centralized factories (Coding Standard 14.11.2).
 */

import type { MetricConfig } from '@/components/coordinator/metrics/MetricFactory';
import type { MetricInfo } from '@/components/coordinator/metrics/InfoTooltip';

/**
 * Creates a mock MetricInfo object for testing
 */
export function createMockMetricInfo(overrides?: Partial<MetricInfo>): MetricInfo {
  return {
    what: 'Test metric description',
    why: 'Test tracking rationale',
    how: 'Test calculation method',
    ...overrides,
  };
}

/**
 * Creates a mock progress metric configuration
 */
export function createMockProgressMetric(
  overrides?: Partial<MetricConfig>
): Extract<MetricConfig, { type: 'progress' }> {
  return {
    id: 'test-progress-metric',
    type: 'progress',
    title: 'Test Progress Metric',
    description: 'A test progress metric',
    metricInfo: createMockMetricInfo(),
    data: {
      value: 75,
      unit: '%',
      goal: 100,
      current: 75,
      progress: 75,
      trend: 5,
      trendDirection: 'up',
    },
    ...overrides,
  } as Extract<MetricConfig, { type: 'progress' }>;
}

/**
 * Creates a mock rating metric configuration
 */
export function createMockRatingMetric(
  overrides?: Partial<MetricConfig>
): Extract<MetricConfig, { type: 'rating' }> {
  return {
    id: 'test-rating-metric',
    type: 'rating',
    title: 'Test Rating Metric',
    metricInfo: createMockMetricInfo(),
    data: {
      value: 4.5,
      unit: '/ 5.0',
      mentorAvg: 4.6,
      menteeAvg: 4.4,
      trend: 0.2,
      trendDirection: 'up',
    },
    ...overrides,
  } as Extract<MetricConfig, { type: 'rating' }>;
}

/**
 * Creates a mock engagement metric configuration
 */
export function createMockEngagementMetric(
  overrides?: Partial<MetricConfig>
): Extract<MetricConfig, { type: 'engagement' }> {
  return {
    id: 'test-engagement-metric',
    type: 'engagement',
    title: 'Test Engagement Metric',
    metricInfo: createMockMetricInfo(),
    data: {
      active: 80,
      total: 100,
      percentage: 80,
      dormant: 20,
      dormantPercentage: 20,
      showWarning: false,
    },
    ...overrides,
  } as Extract<MetricConfig, { type: 'engagement' }>;
}

/**
 * Creates a mock simple metric configuration
 */
export function createMockSimpleMetric(
  overrides?: Partial<MetricConfig>
): Extract<MetricConfig, { type: 'simple' }> {
  return {
    id: 'test-simple-metric',
    type: 'simple',
    title: 'Test Simple Metric',
    metricInfo: createMockMetricInfo(),
    data: {
      value: 42,
      unit: 'items',
      badgeText: 'Good',
      badgeVariant: 'default',
      subMetrics: {
        'Sub 1': '10',
        'Sub 2': '32',
      },
      summary: 'Test summary',
    },
    ...overrides,
  } as Extract<MetricConfig, { type: 'simple' }>;
}

/**
 * Creates mock bar chart data
 */
export function createMockBarChartData() {
  return [
    { year: '2023', Community: 5, Ventures: 7 },
    { year: '2024', Community: 6, Ventures: 8 },
    { year: '2025', Community: 7, Ventures: 9 },
  ];
}

/**
 * Creates a mock bar chart metric configuration
 */
export function createMockBarChartMetric(
  overrides?: Partial<MetricConfig>
): Extract<MetricConfig, { type: 'barChart' }> {
  return {
    id: 'test-bar-chart',
    type: 'barChart',
    title: 'Test Bar Chart',
    description: 'A test bar chart',
    metricInfo: createMockMetricInfo(),
    data: {
      data: createMockBarChartData(),
      xAxisKey: 'year',
      bars: [
        { dataKey: 'Community', name: 'Community', color: '#3b82f6' },
        { dataKey: 'Ventures', name: 'Ventures', color: '#10b981' },
      ],
    },
    ...overrides,
  } as Extract<MetricConfig, { type: 'barChart' }>;
}

/**
 * Creates mock line chart data
 */
export function createMockLineChartData() {
  return [
    { week: 'Week 1', mentors: 50, mentees: 30 },
    { week: 'Week 2', mentors: 55, mentees: 32 },
    { week: 'Week 3', mentors: 60, mentees: 35 },
  ];
}

/**
 * Creates a mock line chart metric configuration
 */
export function createMockLineChartMetric(
  overrides?: Partial<MetricConfig>
): Extract<MetricConfig, { type: 'lineChart' }> {
  return {
    id: 'test-line-chart',
    type: 'lineChart',
    title: 'Test Line Chart',
    description: 'A test line chart',
    metricInfo: createMockMetricInfo(),
    data: {
      data: createMockLineChartData(),
      xAxisKey: 'week',
      lines: [
        { dataKey: 'mentors', name: 'Mentors', color: '#3b82f6' },
        { dataKey: 'mentees', name: 'Mentees', color: '#10b981' },
      ],
    },
    ...overrides,
  } as Extract<MetricConfig, { type: 'lineChart' }>;
}

/**
 * Creates mock composed chart data (YoY)
 */
export function createMockComposedChartData() {
  return [
    { week: 'W1', currentYear: 100, lastYear: 90 },
    { week: 'W2', currentYear: 110, lastYear: 95 },
    { week: 'W3', currentYear: 105, lastYear: 92 },
  ];
}

/**
 * Creates a mock composed chart metric configuration
 */
export function createMockComposedChartMetric(
  overrides?: Partial<MetricConfig>
): Extract<MetricConfig, { type: 'composedChart' }> {
  return {
    id: 'test-composed-chart',
    type: 'composedChart',
    title: 'Test YoY Chart',
    description: 'A test year-over-year chart',
    metricInfo: createMockMetricInfo(),
    data: {
      data: createMockComposedChartData(),
      currentYearLabel: '2024',
      lastYearLabel: '2023',
    },
    ...overrides,
  } as Extract<MetricConfig, { type: 'composedChart' }>;
}

/**
 * Creates mock funnel chart data
 */
export function createMockFunnelChartData() {
  return [
    { stage: 'Created', count: 1000, percentage: 100 },
    { stage: 'Confirmed', count: 800, percentage: 80 },
    { stage: 'Completed', count: 700, percentage: 70 },
    { stage: 'Rated', count: 600, percentage: 60 },
  ];
}

/**
 * Creates a mock funnel chart metric configuration
 */
export function createMockFunnelChartMetric(
  overrides?: Partial<MetricConfig>
): Extract<MetricConfig, { type: 'funnelChart' }> {
  return {
    id: 'test-funnel-chart',
    type: 'funnelChart',
    title: 'Test Funnel Chart',
    description: 'A test funnel chart',
    metricInfo: createMockMetricInfo(),
    data: {
      data: createMockFunnelChartData(),
    },
    ...overrides,
  } as Extract<MetricConfig, { type: 'funnelChart' }>;
}

/**
 * Creates a collection of mock metrics for dashboard testing
 */
export function createMockMetricsCollection(): MetricConfig[] {
  return [
    createMockProgressMetric({ id: 'metric1' }),
    createMockRatingMetric({ id: 'metric2' }),
    createMockEngagementMetric({ id: 'metric3' }),
    createMockSimpleMetric({ id: 'metric4' }),
    createMockBarChartMetric({ id: 'chart1' }),
    createMockLineChartMetric({ id: 'chart2' }),
  ];
}
