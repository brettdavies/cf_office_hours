/**
 * Tests for MetricProgressContent Component
 *
 * Tests progress bar rendering, color coding, trends, and optional fields.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MetricProgressContent } from './MetricProgressContent';

describe('MetricProgressContent', () => {
  it('should render value with unit', () => {
    render(<MetricProgressContent value={75} unit="%" />);

    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('should format numeric values with locale string', () => {
    render(<MetricProgressContent value={1234567} />);

    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });

  it('should render string values without formatting', () => {
    render(<MetricProgressContent value="Custom Value" />);

    expect(screen.getByText('Custom Value')).toBeInTheDocument();
  });

  it('should render goal and current sub-metrics', () => {
    render(<MetricProgressContent value={80} goal={100} current={80} />);

    expect(screen.getByText(/Goal:/)).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText(/Current:/)).toBeInTheDocument();
    // Multiple "80" texts exist, so use getAllByText
    expect(screen.getAllByText('80').length).toBeGreaterThan(0);
  });

  it('should render progress bar with percentage', () => {
    render(<MetricProgressContent value={75} progress={75} />);

    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('75.0%')).toBeInTheDocument();
  });

  it('should render green progress bar for >70%', () => {
    const { container } = render(<MetricProgressContent value={85} progress={85} />);

    const progressBar = container.querySelector('.bg-green-600');
    expect(progressBar).toBeInTheDocument();
  });

  it('should render yellow progress bar for 40-70%', () => {
    const { container } = render(<MetricProgressContent value={55} progress={55} />);

    const progressBar = container.querySelector('.bg-yellow-500');
    expect(progressBar).toBeInTheDocument();
  });

  it('should render red progress bar for <40%', () => {
    const { container } = render(<MetricProgressContent value={25} progress={25} />);

    const progressBar = container.querySelector('.bg-red-600');
    expect(progressBar).toBeInTheDocument();
  });

  it('should cap progress bar width at 100%', () => {
    const { container } = render(<MetricProgressContent value={120} progress={120} />);

    const progressBar = container.querySelector('[style*="width: 100%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('should render upward trend indicator', () => {
    render(<MetricProgressContent value={75} trend={5} trendDirection="up" />);

    expect(screen.getByText('5%')).toBeInTheDocument();
    // Check for green color class
    const trendElement = screen.getByText('5%').closest('div');
    expect(trendElement?.className).toContain('text-green-600');
  });

  it('should render downward trend indicator', () => {
    render(<MetricProgressContent value={70} trend={3} trendDirection="down" />);

    expect(screen.getByText('3%')).toBeInTheDocument();
    // Check for red color class
    const trendElement = screen.getByText('3%').closest('div');
    expect(trendElement?.className).toContain('text-red-600');
  });

  it('should render description text', () => {
    render(<MetricProgressContent value={75} description="Test description text" />);

    expect(screen.getByText('Test description text')).toBeInTheDocument();
  });

  it('should not render optional elements when not provided', () => {
    render(<MetricProgressContent value={75} />);

    expect(screen.queryByText(/Goal:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Progress/)).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('should handle all optional props together', () => {
    render(
      <MetricProgressContent
        value={85}
        unit="%"
        goal={100}
        current={85}
        progress={85}
        trend={10}
        trendDirection="up"
        description="Excellent performance"
      />
    );

    // Check for main components (allow multiple matches)
    expect(screen.getAllByText('85').length).toBeGreaterThan(0);
    expect(screen.getByText('%')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('85.0%')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText('Excellent performance')).toBeInTheDocument();
  });
});
