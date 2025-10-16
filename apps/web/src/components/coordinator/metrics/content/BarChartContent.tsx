/**
 * BarChartContent Component
 *
 * Pure content component for rendering bar charts (grouped or simple).
 * No card/header logic - designed to be used inside MetricContainer.
 *
 * Supports:
 * - Grouped bar charts (multiple bars per x-axis value)
 * - Simple bar charts (single bar per x-axis value)
 * - Horizontal or vertical layout
 * - Custom colors per bar/cell
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface BarConfig {
  dataKey: string;
  name: string;
  color: string;
}

interface BarChartContentProps {
  /**
   * Chart data array
   */
  data: Record<string, string | number>[];

  /**
   * Key for x-axis values
   */
  xAxisKey: string;

  /**
   * For grouped charts: array of bar configurations
   * For simple charts: single dataKey for y-axis
   */
  bars?: BarConfig[];
  yAxisKey?: string;

  /**
   * Chart layout direction
   */
  layout?: 'horizontal' | 'vertical';

  /**
   * Optional colors for simple bar chart cells
   */
  colors?: string[];

  /**
   * Chart height in pixels
   */
  height?: number;
}

const DEFAULT_COLORS = [
  'hsl(142, 76%, 36%)', // Green
  'hsl(142, 76%, 45%)',
  'hsl(48, 96%, 53%)', // Yellow
  'hsl(25, 95%, 53%)', // Orange
  'hsl(0, 84%, 60%)', // Red
];

export function BarChartContent({
  data,
  xAxisKey,
  bars,
  yAxisKey,
  layout = 'vertical',
  colors = DEFAULT_COLORS,
  height = 300,
}: BarChartContentProps) {
  // Grouped bar chart (multiple bars)
  if (bars && bars.length > 0) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxisKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {bars.map((bar) => (
            <Bar key={bar.dataKey} dataKey={bar.dataKey} fill={bar.color} name={bar.name} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Simple bar chart (single bar with optional cell colors)
  if (yAxisKey) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout={layout}>
          <CartesianGrid strokeDasharray="3 3" />
          {layout === 'vertical' ? (
            <>
              <XAxis type="number" />
              <YAxis dataKey={xAxisKey} type="category" />
            </>
          ) : (
            <>
              <XAxis dataKey={xAxisKey} />
              <YAxis />
            </>
          )}
          <Tooltip />
          <Bar dataKey={yAxisKey} radius={layout === 'vertical' ? [0, 4, 4, 0] : [4, 4, 0, 0]}>
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return <div className="text-muted-foreground">Invalid chart configuration</div>;
}
