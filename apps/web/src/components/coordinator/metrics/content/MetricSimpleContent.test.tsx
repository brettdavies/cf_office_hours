/**
 * Tests for MetricSimpleContent Component
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MetricSimpleContent } from './MetricSimpleContent';

describe('MetricSimpleContent', () => {
  it('should render numeric value', () => {
    render(<MetricSimpleContent value={42} />);

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should render string value', () => {
    render(<MetricSimpleContent value="Custom Value" />);

    expect(screen.getByText('Custom Value')).toBeInTheDocument();
  });

  it('should render unit label', () => {
    render(<MetricSimpleContent value={15} unit="pending requests" />);

    expect(screen.getByText('pending requests')).toBeInTheDocument();
  });

  it('should render badge with text', () => {
    render(<MetricSimpleContent value={20} badgeText="Warning" badgeVariant="destructive" />);

    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('should render sub-metrics grid', () => {
    const subMetrics = {
      Mentors: '170',
      Mentees: '9',
    };

    render(<MetricSimpleContent value={179} subMetrics={subMetrics} />);

    expect(screen.getByText(/Mentors:/)).toBeInTheDocument();
    expect(screen.getByText('170')).toBeInTheDocument();
    expect(screen.getByText(/Mentees:/)).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('should render summary text', () => {
    render(<MetricSimpleContent value={78} summary="Most ratings: 4-5 stars" />);

    expect(screen.getByText('Most ratings: 4-5 stars')).toBeInTheDocument();
  });

  it('should apply custom value color', () => {
    const { container } = render(
      <MetricSimpleContent value={100} valueColor="text-green-600" />
    );

    const valueElement = container.querySelector('.text-green-600');
    expect(valueElement).toBeInTheDocument();
  });

  it('should format large numeric values', () => {
    render(<MetricSimpleContent value={1234567} />);

    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });

  it('should render all optional props together', () => {
    render(
      <MetricSimpleContent
        value={150}
        unit="total users"
        badgeText="High"
        badgeVariant="destructive"
        subMetrics={{ Active: '120', Dormant: '30' }}
        summary="Good engagement"
        valueColor="text-blue-600"
      />
    );

    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('total users')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText(/Active:/)).toBeInTheDocument();
    expect(screen.getByText('Good engagement')).toBeInTheDocument();
  });
});
