/**
 * Tests for MetricFactory Component
 *
 * Tests type-based rendering for all metric types.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MetricFactory } from './MetricFactory';
import {
  createMockProgressMetric,
  createMockRatingMetric,
  createMockEngagementMetric,
  createMockSimpleMetric,
  createMockBarChartMetric,
  createMockLineChartMetric,
  createMockComposedChartMetric,
  createMockFunnelChartMetric,
} from '@/test/fixtures/coordinatorMetrics';

// Mock MetricContainer
vi.mock('./base/MetricContainer', () => ({
  MetricContainer: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="metric-container">
      <div data-testid="container-title">{title}</div>
      {children}
    </div>
  ),
}));

// Mock content components
vi.mock('./content/MetricProgressContent', () => ({
  MetricProgressContent: () => <div data-testid="progress-content">Progress Content</div>,
}));

vi.mock('./content/MetricRatingContent', () => ({
  MetricRatingContent: () => <div data-testid="rating-content">Rating Content</div>,
}));

vi.mock('./content/MetricEngagementContent', () => ({
  MetricEngagementContent: () => <div data-testid="engagement-content">Engagement Content</div>,
}));

vi.mock('./content/MetricSimpleContent', () => ({
  MetricSimpleContent: () => <div data-testid="simple-content">Simple Content</div>,
}));

vi.mock('./content/BarChartContent', () => ({
  BarChartContent: () => <div data-testid="bar-chart-content">Bar Chart Content</div>,
}));

vi.mock('./content/LineChartContent', () => ({
  LineChartContent: () => <div data-testid="line-chart-content">Line Chart Content</div>,
}));

vi.mock('./content/ComposedChartContent', () => ({
  ComposedChartContent: () => <div data-testid="composed-chart-content">Composed Chart Content</div>,
}));

vi.mock('./content/FunnelChartContent', () => ({
  FunnelChartContent: () => <div data-testid="funnel-chart-content">Funnel Chart Content</div>,
}));

describe('MetricFactory', () => {
  it('should render MetricProgressContent for progress type', () => {
    const config = createMockProgressMetric();
    render(<MetricFactory config={config} />);

    expect(screen.getByTestId('metric-container')).toBeInTheDocument();
    expect(screen.getByTestId('progress-content')).toBeInTheDocument();
    expect(screen.getByTestId('container-title')).toHaveTextContent('Test Progress Metric');
  });

  it('should render MetricRatingContent for rating type', () => {
    const config = createMockRatingMetric();
    render(<MetricFactory config={config} />);

    expect(screen.getByTestId('metric-container')).toBeInTheDocument();
    expect(screen.getByTestId('rating-content')).toBeInTheDocument();
    expect(screen.getByTestId('container-title')).toHaveTextContent('Test Rating Metric');
  });

  it('should render MetricEngagementContent for engagement type', () => {
    const config = createMockEngagementMetric();
    render(<MetricFactory config={config} />);

    expect(screen.getByTestId('metric-container')).toBeInTheDocument();
    expect(screen.getByTestId('engagement-content')).toBeInTheDocument();
  });

  it('should render MetricSimpleContent for simple type', () => {
    const config = createMockSimpleMetric();
    render(<MetricFactory config={config} />);

    expect(screen.getByTestId('metric-container')).toBeInTheDocument();
    expect(screen.getByTestId('simple-content')).toBeInTheDocument();
  });

  it('should render BarChartContent for barChart type', () => {
    const config = createMockBarChartMetric();
    render(<MetricFactory config={config} />);

    expect(screen.getByTestId('metric-container')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart-content')).toBeInTheDocument();
    expect(screen.getByTestId('container-title')).toHaveTextContent('Test Bar Chart');
  });

  it('should render LineChartContent for lineChart type', () => {
    const config = createMockLineChartMetric();
    render(<MetricFactory config={config} />);

    expect(screen.getByTestId('metric-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart-content')).toBeInTheDocument();
  });

  it('should render ComposedChartContent for composedChart type', () => {
    const config = createMockComposedChartMetric();
    render(<MetricFactory config={config} />);

    expect(screen.getByTestId('metric-container')).toBeInTheDocument();
    expect(screen.getByTestId('composed-chart-content')).toBeInTheDocument();
  });

  it('should render FunnelChartContent for funnelChart type', () => {
    const config = createMockFunnelChartMetric();
    render(<MetricFactory config={config} />);

    expect(screen.getByTestId('metric-container')).toBeInTheDocument();
    expect(screen.getByTestId('funnel-chart-content')).toBeInTheDocument();
  });

  it('should pass all config props to MetricContainer', () => {
    const config = createMockProgressMetric({
      title: 'Custom Title',
      description: 'Custom Description',
      id: 'custom-id',
    });

    render(<MetricFactory config={config} />);

    expect(screen.getByTestId('container-title')).toHaveTextContent('Custom Title');
  });
});
