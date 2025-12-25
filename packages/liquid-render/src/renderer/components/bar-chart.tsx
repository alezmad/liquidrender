// BarChart Component - Responsive bar chart with Recharts
import React, { useMemo } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
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

interface BarConfig {
  dataKey: string;
  fill?: string;
  name?: string;
  stackId?: string;
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

function detectXYFields(data: ChartDataPoint[]): { x: string; y: string } {
  if (data.length === 0) return { x: 'x', y: 'y' };

  const firstRow = data[0]!;
  const keys = Object.keys(firstRow);

  const xField = keys.find(k => {
    const val = firstRow[k];
    return typeof val === 'string' || val instanceof Date;
  }) || keys[0] || 'x';

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

function generateChartDescription(
  data: ChartDataPoint[],
  xKey: string,
  yKeys: string[],
  label?: string
): string {
  const count = data.length;
  const seriesCount = yKeys.length;
  const baseDesc = label ? `${label}: ` : '';

  if (count === 0) return `${baseDesc}Empty bar chart`;

  const seriesInfo = seriesCount > 1
    ? `${seriesCount} data series`
    : `showing ${fieldToLabel(yKeys[0] || 'values')}`;

  return `${baseDesc}Bar chart with ${count} categories, ${seriesInfo}`;
}

// ============================================================================
// Main Component
// ============================================================================

export function BarChartComponent({ block, data: context }: LiquidComponentProps): React.ReactElement {
  const rawData = resolveBinding(block.binding, context);
  const chartData = Array.isArray(rawData) ? rawData as ChartDataPoint[] : [];
  const label = block.label;
  const chartId = useMemo(() => `bar-chart-${Math.random().toString(36).slice(2, 9)}`, []);

  const { x: xKey, y: yKey } = useMemo(() => {
    const explicitX = block.binding?.x;
    const explicitY = block.binding?.y;
    if (explicitX && explicitY) {
      return { x: explicitX, y: explicitY };
    }
    return detectXYFields(chartData);
  }, [block.binding, chartData]);

  const numericFields = useMemo(
    () => detectAllNumericFields(chartData, xKey),
    [chartData, xKey]
  );

  // Generate accessibility description
  const chartDescription = useMemo(
    () => generateChartDescription(chartData, xKey, numericFields.length > 0 ? numericFields : [yKey], label),
    [chartData, xKey, numericFields, yKey, label]
  );

  // SSR fallback
  if (!isBrowser) {
    return (
      <div
        data-liquid-type="bar"
        style={styles.wrapper}
        role="img"
        aria-label={chartDescription}
      >
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.placeholder}>
          [Bar chart • {chartData.length} items • x: {xKey}, y: {yKey}]
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div
        data-liquid-type="bar"
        style={styles.wrapper}
        role="img"
        aria-label={`${label ? label + ': ' : ''}Empty bar chart - no data available`}
      >
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.placeholder}>No data available</div>
      </div>
    );
  }

  return (
    <div
      data-liquid-type="bar"
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
            <th scope="col">{fieldToLabel(xKey)}</th>
            {(numericFields.length > 0 ? numericFields : [yKey]).map(field => (
              <th key={field} scope="col">{fieldToLabel(field)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chartData.slice(0, 10).map((row, i) => (
            <tr key={i}>
              <td>{String(row[xKey] ?? '')}</td>
              {(numericFields.length > 0 ? numericFields : [yKey]).map(field => (
                <td key={field}>{String(row[field] ?? '')}</td>
              ))}
            </tr>
          ))}
          {chartData.length > 10 && (
            <tr><td colSpan={numericFields.length + 1}>...and {chartData.length - 10} more rows</td></tr>
          )}
        </tbody>
      </table>
      <ResponsiveContainer width="100%" height={220}>
        <RechartsBarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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
            cursor={{ fill: tokens.colors.muted }}
          />
          <Legend wrapperStyle={{ fontSize: tokens.fontSize.sm }} />
          {numericFields.length <= 1 ? (
            <Bar
              dataKey={yKey}
              name={fieldToLabel(yKey)}
              fill={chartColors[0]}
              radius={[4, 4, 0, 0]}
            />
          ) : (
            numericFields.map((field, i) => (
              <Bar
                key={field}
                dataKey={field}
                name={fieldToLabel(field)}
                fill={chartColors[i % chartColors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))
          )}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// Static Chart
// ============================================================================

interface StaticBarChartProps {
  data: ChartDataPoint[];
  xKey: string;
  bars: BarConfig[];
  title?: string;
  height?: number;
  stacked?: boolean;
  style?: React.CSSProperties;
}

export function StaticBarChart({
  data,
  xKey,
  bars,
  title,
  height = 220,
  stacked = false,
  style: customStyle,
}: StaticBarChartProps): React.ReactElement {
  if (!isBrowser) {
    return (
      <div style={mergeStyles(styles.wrapper, customStyle)}>
        {title && <div style={styles.header}>{title}</div>}
        <div style={styles.placeholder}>[Bar chart]</div>
      </div>
    );
  }

  return (
    <div style={mergeStyles(styles.wrapper, customStyle)}>
      {title && <div style={styles.header}>{title}</div>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={tokens.colors.border} />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {bars.map((bar, i) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name || fieldToLabel(bar.dataKey)}
              fill={bar.fill || chartColors[i % chartColors.length]}
              stackId={stacked ? 'stack' : bar.stackId}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

export { BarChartComponent as BarChart };
export default BarChartComponent;
