/**
 * Tests for MetricRatingContent Component
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MetricRatingContent } from './MetricRatingContent';

describe('MetricRatingContent', () => {
  it('should render rating value with unit', () => {
    render(<MetricRatingContent value={4.5} />);

    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('/ 5.0')).toBeInTheDocument();
  });

  it('should render custom unit', () => {
    render(<MetricRatingContent value={4.2} unit="/ 10.0" />);

    expect(screen.getByText('/ 10.0')).toBeInTheDocument();
  });

  it('should render mentor and mentee averages', () => {
    render(<MetricRatingContent value={4.5} mentorAvg={4.6} menteeAvg={4.4} />);

    expect(screen.getByText(/Mentor Avg:/)).toBeInTheDocument();
    expect(screen.getByText('4.6')).toBeInTheDocument();
    expect(screen.getByText(/Mentee Avg:/)).toBeInTheDocument();
    expect(screen.getByText('4.4')).toBeInTheDocument();
  });

  it('should render upward trend', () => {
    render(<MetricRatingContent value={4.5} trend={0.2} trendDirection="up" />);

    expect(screen.getByText(/\+0\.2 from last month/)).toBeInTheDocument();
  });

  it('should render downward trend', () => {
    render(<MetricRatingContent value={4.3} trend={0.1} trendDirection="down" />);

    expect(screen.getByText(/0\.1 from last month/)).toBeInTheDocument();
  });
});
