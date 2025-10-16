/**
 * LineChartContent Component
 *
 * Pure content component for rendering line charts (single or dual-line).
 * No card/header logic - designed to be used inside MetricContainer.
 *
 * Supports:
 * - Single line charts
 * - Dual/multiple line charts with different colors
 * - Monotone curve interpolation
 * - Legend for multiple lines
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface LineConfig {
  dataKey: string;
  name: string;
  color: string;
  strokeWidth?: number;
}

interface LineChartContentProps {
  /**
   * Chart data array
   */
  data: Record<string, string | number>[];

  /**
   * Key for x-axis values
   */
  xAxisKey: string;

  /**
   * Array of line configurations
   */
  lines: LineConfig[];

  /**
   * Chart height in pixels
   */
  height?: number;
}

export function LineChartContent({
  data,
  xAxisKey,
  lines,
  height = 300,
}: LineChartContentProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxisKey} />
        <YAxis />
        <Tooltip />
        <Legend />
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.color}
            strokeWidth={line.strokeWidth || 2}
            name={line.name}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
