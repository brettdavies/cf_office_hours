/**
 * ComposedChartContent Component
 *
 * Pure content component for rendering composed charts (bar + line combination).
 * No card/header logic - designed to be used inside MetricContainer.
 *
 * Used for: Year-over-year comparisons showing current year (bars) vs previous year (line)
 *
 * Features:
 * - Bar chart for primary data series
 * - Dashed line for comparison data series
 * - Legend with custom labels
 */

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ComposedChartContentProps {
  /**
   * Chart data array (must include week, currentYear, lastYear keys)
   */
  data: { week: string; currentYear: number; lastYear: number }[];

  /**
   * Label for current year data
   */
  currentYearLabel?: string;

  /**
   * Label for previous year data
   */
  lastYearLabel?: string;

  /**
   * Chart height in pixels
   */
  height?: number;
}

export function ComposedChartContent({
  data,
  currentYearLabel = '2024',
  lastYearLabel = '2023',
  height = 300,
}: ComposedChartContentProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="currentYear" fill="hsl(var(--primary))" name={currentYearLabel} />
        <Line
          type="monotone"
          dataKey="lastYear"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={2}
          name={lastYearLabel}
          strokeDasharray="5 5"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
