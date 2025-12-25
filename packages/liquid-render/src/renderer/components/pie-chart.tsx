// PieChart Component - Responsive pie/donut chart with Recharts
import React, { useMemo } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, chartColors, isBrowser, fieldToLabel } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

interface ChartDataPoint {
  [key: string]: unknown;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: mergeStyles(cardStyles(), {
    padding: tokens.spacing.md,
    minHeight: '280px',
    outline: 'none',
  }),

  header: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.medium,
    marginBottom: tokens.spacing.sm,
    color: tokens.colors.foreground,
  } as React.CSSProperties,

  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '220px',
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    textAlign: 'center',
  } as React.CSSProperties,

  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

function isNumeric(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function detectNameValueFields(data: ChartDataPoint[]): { name: string; value: string } {
  if (data.length === 0) return { name: 'name', value: 'value' };

  const firstRow = data[0]!;
  const keys = Object.keys(firstRow);

  // Find name field (string-like)
  const nameField = keys.find(k => {
    const val = firstRow[k];
    return typeof val === 'string';
  }) || keys[0] || 'name';

  // Find value field (numeric)
  const valueField = keys.find(k => {
    const val = firstRow[k];
    return isNumeric(val);
  }) || keys[1] || 'value';

  return { name: nameField, value: valueField };
}

function generateChartDescription(
  data: ChartDataPoint[],
  nameKey: string,
  valueKey: string,
  label?: string
): string {
  const count = data.length;
  const baseDesc = label ? `${label}: ` : '';

  if (count === 0) return `${baseDesc}Empty pie chart`;

  // Calculate total for percentage info
  const total = data.reduce((sum, row) => {
    const val = row[valueKey];
    return sum + (isNumeric(val) ? val : 0);
  }, 0);

  const topSegments = data
    .slice(0, 3)
    .map(row => {
      const val = row[valueKey];
      const pct = total > 0 && isNumeric(val) ? Math.round((val / total) * 100) : 0;
      return `${row[nameKey]} (${pct}%)`;
    })
    .join(', ');

  return `${baseDesc}Pie chart with ${count} segments: ${topSegments}${count > 3 ? ', and more' : ''}`;
}

// Custom label renderer
const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) => {
  if (percent < 0.05) return null; // Don't show labels for tiny slices

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: tokens.fontSize.xs, fontWeight: tokens.fontWeight.medium }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export function PieChartComponent({ block, data: context }: LiquidComponentProps): React.ReactElement {
  const rawData = resolveBinding(block.binding, context);
  const chartData = Array.isArray(rawData) ? rawData as ChartDataPoint[] : [];
  const label = block.label;
  const chartId = useMemo(() => `pie-chart-${Math.random().toString(36).slice(2, 9)}`, []);

  const { name: nameKey, value: valueKey } = useMemo(() => {
    const explicitX = block.binding?.x;
    const explicitY = block.binding?.y;
    if (explicitX && explicitY) {
      return { name: explicitX, value: explicitY };
    }
    return detectNameValueFields(chartData);
  }, [block.binding, chartData]);

  // Generate accessibility description
  const chartDescription = useMemo(
    () => generateChartDescription(chartData, nameKey, valueKey, label),
    [chartData, nameKey, valueKey, label]
  );

  // Calculate total for percentage display
  const total = useMemo(() => {
    return chartData.reduce((sum, row) => {
      const val = row[valueKey];
      return sum + (isNumeric(val) ? val : 0);
    }, 0);
  }, [chartData, valueKey]);

  // SSR fallback
  if (!isBrowser) {
    return (
      <div
        data-liquid-type="pie"
        style={styles.wrapper}
        role="img"
        aria-label={chartDescription}
      >
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.placeholder}>
          [Pie chart • {chartData.length} segments]
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div
        data-liquid-type="pie"
        style={styles.wrapper}
        role="img"
        aria-label={`${label ? label + ': ' : ''}Empty pie chart - no data available`}
      >
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.placeholder}>No data available</div>
      </div>
    );
  }

  return (
    <div
      data-liquid-type="pie"
      style={styles.wrapper}
      role="img"
      aria-label={chartDescription}
      tabIndex={0}
      aria-describedby={`${chartId}-desc`}
    >
      {label && <div id={`${chartId}-title`} style={styles.header}>{label}</div>}
      {/* Screen reader accessible data table */}
      <table id={`${chartId}-desc`} style={styles.srOnly}>
        <caption>{chartDescription}</caption>
        <thead>
          <tr>
            <th scope="col">Segment</th>
            <th scope="col">Value</th>
            <th scope="col">Percentage</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((row, i) => {
            const val = row[valueKey];
            const numVal = isNumeric(val) ? val : 0;
            const pct = total > 0 ? Math.round((numVal / total) * 100) : 0;
            return (
              <tr key={i}>
                <td>{String(row[nameKey] ?? '')}</td>
                <td>{String(numVal)}</td>
                <td>{pct}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ResponsiveContainer width="100%" height={220}>
        <RechartsPieChart>
          <Pie
            data={chartData}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={renderCustomLabel}
            labelLine={false}
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={chartColors[index % chartColors.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: tokens.colors.card,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radius.md,
              fontSize: tokens.fontSize.sm,
            }}
          />
          <Legend wrapperStyle={{ fontSize: tokens.fontSize.sm }} />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// Static Chart
// ============================================================================

interface StaticPieChartProps {
  data: ChartDataPoint[];
  nameKey: string;
  valueKey: string;
  title?: string;
  height?: number;
  innerRadius?: number; // For donut chart
  colors?: string[];
  style?: React.CSSProperties;
}

export function StaticPieChart({
  data,
  nameKey,
  valueKey,
  title,
  height = 220,
  innerRadius = 0,
  colors = chartColors as unknown as string[],
  style: customStyle,
}: StaticPieChartProps): React.ReactElement {
  if (!isBrowser) {
    return (
      <div style={mergeStyles(styles.wrapper, customStyle)}>
        {title && <div style={styles.header}>{title}</div>}
        <div style={styles.placeholder}>[Pie chart]</div>
      </div>
    );
  }

  return (
    <div style={mergeStyles(styles.wrapper, customStyle)}>
      {title && <div style={styles.header}>{title}</div>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={innerRadius}
            label={renderCustomLabel}
            labelLine={false}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Donut chart variant
interface DonutChartProps extends Omit<StaticPieChartProps, 'innerRadius'> {
  innerRadius?: number;
}

export function DonutChart({
  innerRadius = 40,
  ...props
}: DonutChartProps): React.ReactElement {
  return <StaticPieChart {...props} innerRadius={innerRadius} />;
}

export { PieChartComponent as PieChart };
export default PieChartComponent;
