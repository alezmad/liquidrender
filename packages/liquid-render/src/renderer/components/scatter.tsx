// Scatter Component - X/Y scatter plot with Recharts
import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter as RechartsScatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, chartColors, isBrowser, fieldToLabel } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

interface ScatterDataPoint {
  [key: string]: unknown;
}

interface SeriesConfig {
  dataKey?: string;
  name?: string;
  data?: ScatterDataPoint[];
  fill?: string;
  shape?: 'circle' | 'cross' | 'diamond' | 'square' | 'star' | 'triangle' | 'wye';
}

interface TrendLineData {
  slope: number;
  intercept: number;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
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

  wrapperFocused: {
    outline: `2px solid ${tokens.colors.ring}`,
    outlineOffset: '2px',
  } as React.CSSProperties,

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

function detectXYFields(data: ScatterDataPoint[]): { x: string; y: string } {
  if (data.length === 0) return { x: 'x', y: 'y' };

  const firstRow = data[0]!;
  const keys = Object.keys(firstRow);

  // Find first two numeric fields
  const numericKeys = keys.filter(k => isNumeric(firstRow[k]));

  if (numericKeys.length >= 2) {
    return { x: numericKeys[0]!, y: numericKeys[1]! };
  }

  // Fallback
  return { x: keys[0] || 'x', y: keys[1] || 'y' };
}

function detectZField(data: ScatterDataPoint[], xKey: string, yKey: string): string | undefined {
  if (data.length === 0) return undefined;

  const firstRow = data[0]!;
  const keys = Object.keys(firstRow);

  // Find a third numeric field for dot size
  const zKey = keys.find(k => k !== xKey && k !== yKey && isNumeric(firstRow[k]));
  return zKey;
}

function calculateTrendLine(data: ScatterDataPoint[], xKey: string, yKey: string): TrendLineData | null {
  if (data.length < 2) return null;

  // Extract numeric values
  const points: { x: number; y: number }[] = [];
  for (const point of data) {
    const x = point[xKey];
    const y = point[yKey];
    if (isNumeric(x) && isNumeric(y)) {
      points.push({ x, y });
    }
  }

  if (points.length < 2) return null;

  // Calculate linear regression using least squares
  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumX2 += point.x * point.x;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Find x range
  const xValues = points.map(p => p.x);
  const x1 = Math.min(...xValues);
  const x2 = Math.max(...xValues);

  return {
    slope,
    intercept,
    x1,
    x2,
    y1: slope * x1 + intercept,
    y2: slope * x2 + intercept,
  };
}

function generateChartDescription(
  data: ScatterDataPoint[],
  xKey: string,
  yKey: string,
  seriesCount: number,
  label?: string
): string {
  const count = data.length;
  const baseDesc = label ? `${label}: ` : '';

  if (count === 0) return `${baseDesc}Empty scatter chart`;

  const seriesInfo = seriesCount > 1
    ? `${seriesCount} data series`
    : `showing ${fieldToLabel(yKey)} vs ${fieldToLabel(xKey)}`;

  return `${baseDesc}Scatter chart with ${count} data points, ${seriesInfo}`;
}

// ============================================================================
// Sub-components
// ============================================================================

interface TrendLineProps {
  trendData: TrendLineData;
  stroke?: string;
}

function TrendLine({ trendData, stroke = tokens.colors.mutedForeground }: TrendLineProps): React.ReactElement {
  return (
    <ReferenceLine
      segment={[
        { x: trendData.x1, y: trendData.y1 },
        { x: trendData.x2, y: trendData.y2 },
      ]}
      stroke={stroke}
      strokeWidth={2}
      strokeDasharray="5 5"
      ifOverflow="extendDomain"
    />
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Scatter({ block, data: context }: LiquidComponentProps): React.ReactElement {
  const rawData = resolveBinding(block.binding, context);
  const chartData = Array.isArray(rawData) ? rawData as ScatterDataPoint[] : [];
  const label = block.label;
  const chartId = useMemo(() => `scatter-chart-${Math.random().toString(36).slice(2, 9)}`, []);
  const props = block.props ?? {};

  // Extract options from block
  const showTrendLine = props.trendLine === true;
  const dotSize = typeof props.dotSize === 'number' ? props.dotSize : 60;
  const series = props.series as SeriesConfig[] | undefined;

  // Detect x/y fields
  const { x: xKey, y: yKey } = useMemo(() => {
    const explicitX = block.binding?.x;
    const explicitY = block.binding?.y;
    if (explicitX && explicitY) {
      return { x: explicitX, y: explicitY };
    }
    return detectXYFields(chartData);
  }, [block.binding, chartData]);

  // Detect z field for dot size variation (cast binding to allow z)
  const binding = block.binding as (typeof block.binding & { z?: string }) | undefined;
  const zKey = useMemo(() => {
    const explicitZ = binding?.z;
    if (explicitZ) return explicitZ;
    return detectZField(chartData, xKey, yKey);
  }, [binding, chartData, xKey, yKey]);

  // Calculate trend line if enabled
  const trendLine = useMemo(() => {
    if (!showTrendLine) return null;
    return calculateTrendLine(chartData, xKey, yKey);
  }, [showTrendLine, chartData, xKey, yKey]);

  // Determine series count
  const seriesCount = series?.length || 1;

  // Generate accessibility description
  const chartDescription = useMemo(
    () => generateChartDescription(chartData, xKey, yKey, seriesCount, label),
    [chartData, xKey, yKey, seriesCount, label]
  );

  // SSR fallback
  if (!isBrowser) {
    return (
      <div
        data-liquid-type="scatter"
        style={styles.wrapper}
        role="img"
        aria-label={chartDescription}
      >
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.placeholder}>
          [Scatter chart - {chartData.length} points - x: {xKey}, y: {yKey}]
        </div>
      </div>
    );
  }

  // Empty state
  if (chartData.length === 0) {
    return (
      <div
        data-liquid-type="scatter"
        style={styles.wrapper}
        role="img"
        aria-label={`${label ? label + ': ' : ''}Empty scatter chart - no data available`}
      >
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.placeholder}>No data available</div>
      </div>
    );
  }

  return (
    <div
      data-liquid-type="scatter"
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
            <th scope="col">{fieldToLabel(yKey)}</th>
            {zKey && <th scope="col">{fieldToLabel(zKey)}</th>}
          </tr>
        </thead>
        <tbody>
          {chartData.slice(0, 10).map((row, i) => (
            <tr key={i}>
              <td>{String(row[xKey] ?? '')}</td>
              <td>{String(row[yKey] ?? '')}</td>
              {zKey && <td>{String(row[zKey] ?? '')}</td>}
            </tr>
          ))}
          {chartData.length > 10 && (
            <tr><td colSpan={zKey ? 3 : 2}>...and {chartData.length - 10} more rows</td></tr>
          )}
        </tbody>
      </table>
      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={tokens.colors.border} />
          <XAxis
            dataKey={xKey}
            type="number"
            name={fieldToLabel(xKey)}
            tick={{ fontSize: 12, fill: tokens.colors.mutedForeground }}
            stroke={tokens.colors.border}
          />
          <YAxis
            dataKey={yKey}
            type="number"
            name={fieldToLabel(yKey)}
            tick={{ fontSize: 12, fill: tokens.colors.mutedForeground }}
            stroke={tokens.colors.border}
          />
          {zKey && (
            <ZAxis
              dataKey={zKey}
              type="number"
              range={[40, 400]}
              name={fieldToLabel(zKey)}
            />
          )}
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{
              backgroundColor: tokens.colors.card,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radius.md,
              fontSize: tokens.fontSize.sm,
            }}
          />
          <Legend wrapperStyle={{ fontSize: tokens.fontSize.sm }} />
          {trendLine && <TrendLine trendData={trendLine} />}
          {series && series.length > 0 ? (
            // Multiple series from config
            series.map((s, i) => (
              <RechartsScatter
                key={s.name || i}
                name={s.name || `Series ${i + 1}`}
                data={s.data || chartData}
                fill={s.fill || chartColors[i % chartColors.length]}
                shape={s.shape || 'circle'}
              />
            ))
          ) : (
            // Single series from data
            <RechartsScatter
              name={label || fieldToLabel(yKey)}
              data={chartData}
              fill={chartColors[0]}
            >
              {!zKey && chartData.map((_, index) => (
                <circle key={index} r={Math.sqrt(dotSize / Math.PI)} />
              ))}
            </RechartsScatter>
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

interface StaticScatterSeries {
  name: string;
  data: ScatterDataPoint[];
  fill?: string;
  shape?: 'circle' | 'cross' | 'diamond' | 'square' | 'star' | 'triangle' | 'wye';
}

interface StaticScatterProps {
  data?: ScatterDataPoint[];
  series?: StaticScatterSeries[];
  xKey: string;
  yKey: string;
  zKey?: string;
  title?: string;
  height?: number;
  dotSize?: number;
  showTrendLine?: boolean;
  style?: React.CSSProperties;
}

export function StaticScatter({
  data,
  series,
  xKey,
  yKey,
  zKey,
  title,
  height = 220,
  dotSize = 60,
  showTrendLine = false,
  style: customStyle,
}: StaticScatterProps): React.ReactElement {
  // Combine all data for trend line calculation
  const allData = useMemo(() => {
    if (series) {
      return series.flatMap(s => s.data);
    }
    return data || [];
  }, [data, series]);

  // Calculate trend line if enabled
  const trendLine = useMemo(() => {
    if (!showTrendLine || allData.length < 2) return null;
    return calculateTrendLine(allData, xKey, yKey);
  }, [showTrendLine, allData, xKey, yKey]);

  if (!isBrowser) {
    return (
      <div data-liquid-type="scatter" style={mergeStyles(styles.wrapper, customStyle)}>
        {title && <div style={styles.header}>{title}</div>}
        <div style={styles.placeholder}>[Scatter chart]</div>
      </div>
    );
  }

  const hasData = series ? series.some(s => s.data.length > 0) : (data && data.length > 0);

  if (!hasData) {
    return (
      <div data-liquid-type="scatter" style={mergeStyles(styles.wrapper, customStyle)}>
        {title && <div style={styles.header}>{title}</div>}
        <div style={styles.placeholder}>No data available</div>
      </div>
    );
  }

  return (
    <div data-liquid-type="scatter" style={mergeStyles(styles.wrapper, customStyle)}>
      {title && <div style={styles.header}>{title}</div>}
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={tokens.colors.border} />
          <XAxis
            dataKey={xKey}
            type="number"
            name={fieldToLabel(xKey)}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            dataKey={yKey}
            type="number"
            name={fieldToLabel(yKey)}
            tick={{ fontSize: 12 }}
          />
          {zKey && (
            <ZAxis
              dataKey={zKey}
              type="number"
              range={[40, 400]}
              name={fieldToLabel(zKey)}
            />
          )}
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Legend />
          {trendLine && <TrendLine trendData={trendLine} />}
          {series ? (
            series.map((s, i) => (
              <RechartsScatter
                key={s.name}
                name={s.name}
                data={s.data}
                fill={s.fill || chartColors[i % chartColors.length]}
                shape={s.shape || 'circle'}
              />
            ))
          ) : (
            <RechartsScatter
              name={title || fieldToLabel(yKey)}
              data={data}
              fill={chartColors[0]}
            >
              {!zKey && data?.map((_, index) => (
                <circle key={index} r={Math.sqrt(dotSize / Math.PI)} />
              ))}
            </RechartsScatter>
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export default Scatter;
