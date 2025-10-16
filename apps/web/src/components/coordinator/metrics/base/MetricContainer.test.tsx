/**
 * Tests for MetricContainer Component
 *
 * Tests the universal wrapper that provides card chrome, star button, and info tooltip
 * for all metrics and charts.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetricContainer } from './MetricContainer';
import { createMockMetricInfo } from '@/test/fixtures/coordinatorMetrics';

// Mock the useFavoriteMetrics hook
const mockToggleFavorite = vi.fn();
const mockIsFavorite = vi.fn();

vi.mock('@/hooks/useFavoriteMetrics', () => ({
  useFavoriteMetrics: () => ({
    toggleFavorite: mockToggleFavorite,
    isFavorite: mockIsFavorite,
  }),
}));

// Mock InfoTooltip component
vi.mock('../InfoTooltip', () => ({
  InfoTooltip: ({ metricInfo }: { metricInfo?: any }) =>
    metricInfo ? <div data-testid="info-tooltip">Info</div> : null,
}));

describe('MetricContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFavorite.mockReturnValue(false);
  });

  it('should render children content', () => {
    render(
      <MetricContainer title="Test Metric" metricId="test-1">
        <div data-testid="metric-content">Content</div>
      </MetricContainer>
    );

    expect(screen.getByTestId('metric-content')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should render title', () => {
    render(
      <MetricContainer title="Test Metric Title" metricId="test-1">
        <div>Content</div>
      </MetricContainer>
    );

    expect(screen.getByText('Test Metric Title')).toBeInTheDocument();
  });

  it('should render optional description', () => {
    render(
      <MetricContainer title="Test Metric" metricId="test-1" description="Test Description">
        <div>Content</div>
      </MetricContainer>
    );

    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('should render star button for favorites', () => {
    render(
      <MetricContainer title="Test Metric" metricId="test-1">
        <div>Content</div>
      </MetricContainer>
    );

    const starButton = screen.getByLabelText('Add to favorites');
    expect(starButton).toBeInTheDocument();
  });

  it('should toggle favorite when star button is clicked', () => {
    render(
      <MetricContainer title="Test Metric" metricId="test-123">
        <div>Content</div>
      </MetricContainer>
    );

    const starButton = screen.getByLabelText('Add to favorites');
    fireEvent.click(starButton);

    expect(mockToggleFavorite).toHaveBeenCalledWith('test-123');
    expect(mockToggleFavorite).toHaveBeenCalledTimes(1);
  });

  it('should show filled star when metric is favorited', () => {
    mockIsFavorite.mockReturnValue(true);

    render(
      <MetricContainer title="Test Metric" metricId="test-1">
        <div>Content</div>
      </MetricContainer>
    );

    const starButton = screen.getByLabelText('Remove from favorites');
    expect(starButton).toBeInTheDocument();
  });

  it('should render InfoTooltip when metricInfo is provided', () => {
    const metricInfo = createMockMetricInfo();

    render(
      <MetricContainer title="Test Metric" metricId="test-1" metricInfo={metricInfo}>
        <div>Content</div>
      </MetricContainer>
    );

    expect(screen.getByTestId('info-tooltip')).toBeInTheDocument();
  });

  it('should not render InfoTooltip when metricInfo is not provided', () => {
    render(
      <MetricContainer title="Test Metric" metricId="test-1">
        <div>Content</div>
      </MetricContainer>
    );

    expect(screen.queryByTestId('info-tooltip')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <MetricContainer title="Test Metric" metricId="test-1" className="custom-class">
        <div>Content</div>
      </MetricContainer>
    );

    const card = container.querySelector('.custom-class');
    expect(card).toBeInTheDocument();
  });

  it('should check favorite status on mount', () => {
    render(
      <MetricContainer title="Test Metric" metricId="test-456">
        <div>Content</div>
      </MetricContainer>
    );

    expect(mockIsFavorite).toHaveBeenCalledWith('test-456');
  });
});
