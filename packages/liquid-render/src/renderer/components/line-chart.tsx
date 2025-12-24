// LineChart Component - Responsive line chart with Recharts
import React, { useMemo } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
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

interface LineConfig {
  dataKey: string;
  stroke?: string;
  strokeWidth?: number;
  dot?: boolean;
  name?: string;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: mergeStyles(cardStyles(), {
    padding: tokens.spacing.md,
    minHeight: '280px',
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
};

// ============================================================================
// Helpers
// ============================================================================

function isNumeric(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function detectXYFields(data: ChartDataPoint[]): { x: string; y: string } {
  if (data.length === 0) return { x: 'x', y: 'y' };

  const firstRow = data[0]!;
  const keys = Object.keys(firstRow);

  // Find first string-like field for x (category/date)
  const xField = keys.find(k => {
    const val = firstRow[k];
    return typeof val === 'string' || val instanceof Date;
  }) || keys[0] || 'x';

  // Find first numeric field for y
  const yField = keys.find(k => {
    const val = firstRow[k];
    return isNumeric(val) && k !== xField;
  }) || keys[1] || 'y';

  return { x: xField, y: yField };
}

function detectAllNumericFields(data: ChartDataPoint[], xField: string): string[] {
  if (data.length === 0) return [];

  const firstRow = data[0]!;
  return Object.keys(firstRow).filter(k =>
    k !== xField && isNumeric(firstRow[k])
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function LineChartComponent({ block, data: context }: LiquidComponentProps): React.ReactElement {
  const rawData = resolveBinding(block.binding, context);
  const chartData = Array.isArray(rawData) ? rawData as ChartDataPoint[] : [];
  const label = block.label;

  // Detect x/y fields
  const { x: xKey, y: yKey } = useMemo(() => {
    const explicitX = block.binding?.x;
    const explicitY = block.binding?.y;
    if (explicitX && explicitY) {
      return { x: explicitX, y: explicitY };
    }
    return detectXYFields(chartData);
  }, [block.binding, chartData]);

  // Detect all numeric fields for multi-line charts
  const numericFields = useMemo(
    () => detectAllNumericFields(chartData, xKey),
    [chartData, xKey]
  );

  // SSR fallback
  if (!isBrowser) {
    return (
      <div data-liquid-type="line" style={styles.wrapper}>
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.placeholder}>
          [Line chart • {chartData.length} points • x: {xKey}, y: {yKey}]
        </div>
      </div>
    );
  }

  // Empty state
  if (chartData.length === 0) {
    return (
      <div data-liquid-type="line" style={styles.wrapper}>
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.placeholder}>No data available</div>
      </div>
    );
  }

  return (
    <div data-liquid-type="line" style={styles.wrapper}>
      {label && <div style={styles.header}>{label}</div>}
      <ResponsiveContainer width="100%" height={220}>
        <RechartsLineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={tokens.colors.border} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12, fill: tokens.colors.mutedForeground }}
            stroke={tokens.colors.border}
          />
          <YAxis
            tick={{ fontSize: 12, fill: tokens.colors.mutedForeground }}
            stroke={tokens.colors.border}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: tokens.colors.card,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radius.md,
              fontSize: tokens.fontSize.sm,
            }}
          />
          <Legend wrapperStyle={{ fontSize: tokens.fontSize.sm }} />
          {numericFields.length <= 1 ? (
            // Single line
            <Line
              type="monotone"
              dataKey={yKey}
              name={fieldToLabel(yKey)}
              stroke={chartColors[0]}
              strokeWidth={2}
              dot={{ r: 4, fill: chartColors[0] }}
              activeDot={{ r: 6 }}
            />
          ) : (
            // Multiple lines
            numericFields.map((field, i) => (
              <Line
                key={field}
                type="monotone"
                dataKey={field}
                name={fieldToLabel(field)}
                stroke={chartColors[i % chartColors.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: chartColors[i % chartColors.length] }}
                activeDot={{ r: 5 }}
              />
            ))
          )}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// Static Chart (standalone usage)
// ============================================================================

interface StaticLineChartProps {
  data: ChartDataPoint[];
  xKey: string;
  lines: LineConfig[];
  title?: string;
  height?: number;
  style?: React.CSSProperties;
}

export function StaticLineChart({
  data,
  xKey,
  lines,
  title,
  height = 220,
  style: customStyle,
}: StaticLineChartProps): React.ReactElement {
  if (!isBrowser) {
    return (
      <div style={mergeStyles(styles.wrapper, customStyle)}>
        {title && <div style={styles.header}>{title}</div>}
        <div style={styles.placeholder}>[Line chart]</div>
      </div>
    );
  }

  return (
    <div style={mergeStyles(styles.wrapper, customStyle)}>
      {title && <div style={styles.header}>{title}</div>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={tokens.colors.border} />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {lines.map((line, i) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name || fieldToLabel(line.dataKey)}
              stroke={line.stroke || chartColors[i % chartColors.length]}
              strokeWidth={line.strokeWidth || 2}
              dot={line.dot !== false}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

export { LineChartComponent as LineChart };
export default LineChartComponent;
