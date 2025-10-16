/**
 * Tests for CoordinatorMetricsPage
 *
 * Tests data-driven metrics dashboard rendering with MetricFactory pattern.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CoordinatorMetricsPage from './CoordinatorMetricsPage';

// Mock the configuration
vi.mock('@/data/coordinatorMetricsConfig', () => ({
  coordinatorDashboardConfig: {
    sections: [
      {
        id: 'testSection1',
        title: 'Test Section 1',
        defaultExpanded: true,
        gridCols: 2,
        metrics: [
          {
            id: 'metric1',
            type: 'progress',
            title: 'Test Metric 1',
            data: { value: 75 },
          },
          {
            id: 'metric2',
            type: 'rating',
            title: 'Test Metric 2',
            data: { value: 4.5 },
          },
        ],
      },
      {
        id: 'testSection2',
        title: 'Test Section 2',
        defaultExpanded: false,
        gridCols: 3,
        metrics: [
          {
            id: 'chart1',
            type: 'barChart',
            title: 'Test Chart 1',
            data: { data: [], xAxisKey: 'year' },
          },
        ],
      },
    ],
  },
}));

// Mock MetricSection
vi.mock('@/components/coordinator/metrics/MetricSection', () => ({
  MetricSection: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div data-testid={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <h2>{title}</h2>
      {children}
    </div>
  ),
}));

// Mock MetricFactory
vi.mock('@/components/coordinator/metrics/MetricFactory', () => ({
  MetricFactory: ({ config }: { config: any }) => (
    <div data-testid={`metric-${config.id}`}>
      {config.title}
    </div>
  ),
}));

describe('CoordinatorMetricsPage', () => {
  it('should render page header', () => {
    render(<CoordinatorMetricsPage />);

    expect(screen.getByText('Platform Metrics Dashboard')).toBeInTheDocument();
    expect(
      screen.getByText(/Monitor platform performance, trends, and operational health/)
    ).toBeInTheDocument();
  });

  it('should render last updated timestamp', () => {
    render(<CoordinatorMetricsPage />);

    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it('should render all sections from config', () => {
    render(<CoordinatorMetricsPage />);

    expect(screen.getByText('Test Section 1')).toBeInTheDocument();
    expect(screen.getByText('Test Section 2')).toBeInTheDocument();
  });

  it('should render all metrics within sections', () => {
    render(<CoordinatorMetricsPage />);

    expect(screen.getByTestId('metric-metric1')).toBeInTheDocument();
    expect(screen.getByTestId('metric-metric2')).toBeInTheDocument();
    expect(screen.getByTestId('metric-chart1')).toBeInTheDocument();
  });

  it('should render metrics with correct titles', () => {
    render(<CoordinatorMetricsPage />);

    expect(screen.getByText('Test Metric 1')).toBeInTheDocument();
    expect(screen.getByText('Test Metric 2')).toBeInTheDocument();
    expect(screen.getByText('Test Chart 1')).toBeInTheDocument();
  });

  it('should apply correct grid layout classes', () => {
    const { container } = render(<CoordinatorMetricsPage />);

    // Check for grid layout classes
    const grids = container.querySelectorAll('[class*="grid"]');
    expect(grids.length).toBeGreaterThan(0);
  });

  it('should render sections with correct data-testid', () => {
    render(<CoordinatorMetricsPage />);

    expect(screen.getByTestId('section-test-section-1')).toBeInTheDocument();
    expect(screen.getByTestId('section-test-section-2')).toBeInTheDocument();
  });
});
