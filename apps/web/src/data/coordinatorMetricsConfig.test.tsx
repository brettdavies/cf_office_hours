/**
 * Tests for coordinatorMetricsConfig
 *
 * Locks the two corrected progress values, guards every formula-driven progress
 * metric against future drift, and verifies the corrected values render through
 * MetricProgressContent as the expected on-screen percentages.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { coordinatorDashboardConfig } from './coordinatorMetricsConfig';
import { MetricProgressContent } from '@/components/coordinator/metrics/content/MetricProgressContent';
import { MetricConfig } from '@/components/coordinator/metrics/MetricFactory';

type ProgressMetric = Extract<MetricConfig, { type: 'progress' }>;

const isProgressMetric = (m: MetricConfig): m is ProgressMetric => m.type === 'progress';

const progressMetrics: ProgressMetric[] = coordinatorDashboardConfig.sections
  .flatMap((section) => section.metrics)
  .filter(isProgressMetric);

const findProgressMetric = (id: string): ProgressMetric => {
  const metric = progressMetrics.find((m) => m.id === id);
  if (!metric) throw new Error(`Progress metric "${id}" not found in config`);
  return metric;
};

const EXCEPTION_ALLOWLIST = new Set([
  'avgTimeToConfirm',
  'expirationRate',
  'avgDecisionTime',
  'lateCancellationRate',
  'avgOHMeetings90Days',
  'portcosMeetingRate',
]);

const EPSILON = 0.05;
const round2 = (x: number): number => Math.round(x * 100) / 100;

describe('coordinatorMetricsConfig — corrected progress values', () => {
  it('companiesMet stored progress equals 93.99', () => {
    expect(findProgressMetric('companiesMet').data.progress).toBe(93.99);
  });

  it('totalUtilization stored progress equals 88.18', () => {
    expect(findProgressMetric('totalUtilization').data.progress).toBe(88.18);
  });
});

describe('coordinatorMetricsConfig — progress drift guard', () => {
  it('every allowlisted id exists in the config', () => {
    for (const id of EXCEPTION_ALLOWLIST) {
      expect(progressMetrics.some((m) => m.id === id)).toBe(true);
    }
  });

  for (const metric of progressMetrics) {
    const { current, goal } = metric.data;
    if (typeof current !== 'number' || typeof goal !== 'number') continue;

    it(`${metric.id} has a numeric progress field`, () => {
      expect(typeof metric.data.progress).toBe('number');
    });

    if (EXCEPTION_ALLOWLIST.has(metric.id)) continue;

    it(`${metric.id} progress matches round(current/goal*100)`, () => {
      const expected = round2((current / goal) * 100);
      expect(Math.abs((metric.data.progress as number) - expected)).toBeLessThanOrEqual(EPSILON);
    });
  }
});

describe('coordinatorMetricsConfig — render fidelity', () => {
  it('companiesMet renders 94.0% with a green bar', () => {
    const { container } = render(<MetricProgressContent {...findProgressMetric('companiesMet').data} />);

    expect(screen.getByText('94.0%')).toBeInTheDocument();
    expect(container.querySelector('.bg-green-600')).toBeInTheDocument();
  });

  it('totalUtilization renders 88.2% with a green bar', () => {
    const { container } = render(<MetricProgressContent {...findProgressMetric('totalUtilization').data} />);

    expect(screen.getByText('88.2%')).toBeInTheDocument();
    expect(container.querySelector('.bg-green-600')).toBeInTheDocument();
  });
});
