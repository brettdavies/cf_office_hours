/**
 * Tests for MetricEngagementContent Component
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MetricEngagementContent } from './MetricEngagementContent';

describe('MetricEngagementContent', () => {
  it('should render active and total counts', () => {
    render(
      <MetricEngagementContent
        active={80}
        total={100}
        percentage={80}
        dormant={20}
        dormantPercentage={20}
      />
    );

    expect(screen.getByText(/80 \/ 100/)).toBeInTheDocument();
  });

  it('should render active percentage', () => {
    render(
      <MetricEngagementContent
        active={80}
        total={100}
        percentage={80}
        dormant={20}
        dormantPercentage={20}
      />
    );

    expect(screen.getByText('80.0% Active')).toBeInTheDocument();
  });

  it('should render dormant count and percentage', () => {
    render(
      <MetricEngagementContent
        active={75}
        total={100}
        percentage={75}
        dormant={25}
        dormantPercentage={25}
      />
    );

    // Text is split across elements, so check for the number separately
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText(/dormant/)).toBeInTheDocument();
  });

  it('should show warning badge when dormancy exceeds 25% and showWarning is true', () => {
    render(
      <MetricEngagementContent
        active={70}
        total={100}
        percentage={70}
        dormant={30}
        dormantPercentage={30}
        showWarning={true}
      />
    );

    expect(screen.getByText('High Dormancy')).toBeInTheDocument();
  });

  it('should not show warning badge when dormancy is below 25%', () => {
    render(
      <MetricEngagementContent
        active={80}
        total={100}
        percentage={80}
        dormant={20}
        dormantPercentage={20}
        showWarning={true}
      />
    );

    expect(screen.queryByText('High Dormancy')).not.toBeInTheDocument();
  });

  it('should format large numbers with locale string', () => {
    render(
      <MetricEngagementContent
        active={1500}
        total={2000}
        percentage={75}
        dormant={500}
        dormantPercentage={25}
      />
    );

    expect(screen.getByText(/1,500 \/ 2,000/)).toBeInTheDocument();
    // Check for formatted number separately since text is split
    expect(screen.getByText('500')).toBeInTheDocument();
  });
});
