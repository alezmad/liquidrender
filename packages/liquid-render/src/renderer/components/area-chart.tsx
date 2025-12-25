// AreaChart Component - Filled area visualization with Recharts
import React, { useMemo } from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
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

interface AreaConfig {
  dataKey: string;
  fill?: string;
  stroke?: string;
  name?: string;
  stackId?: string;
}

interface ColumnDef {
  field: string;
  label?: string;
}

// Extended style interface for chart-specific options
interface AreaChartStyle {
  stacked?: boolean;
  gradient?: boolean;
  color?: string;
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

function generateChartDescription(
  data: ChartDataPoint[],
  xKey: string,
  yKeys: string[],
  label?: string,
  stacked?: boolean
): string {
  const count = data.length;
  const seriesCount = yKeys.length;
  const baseDesc = label ? `${label}: ` : '';

  if (count === 0) return `${baseDesc}Empty area chart`;

  const stackedInfo = stacked && seriesCount > 1 ? 'stacked ' : '';
  const seriesInfo = seriesCount > 1
    ? `${seriesCount} ${stackedInfo}data series`
    : `showing ${fieldToLabel(yKeys[0] || 'values')}`;

  return `${baseDesc}Area chart with ${count} data points, ${seriesInfo}`;
}

/**
 * Generate gradient definitions for area fills
 */
function renderGradientDefs(fields: string[], chartId: string): React.ReactElement {
  return (
    <defs>
      {fields.map((_, i) => {
        const color = chartColors[i % chartColors.length];
        return (
          <linearGradient
            key={`gradient-${i}`}
            id={`${chartId}-gradient-${i}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="5%" stopColor={color} stopOpacity={0.8} />
            <stop offset="95%" stopColor={color} stopOpacity={0.1} />
          </linearGradient>
        );
      })}
    </defs>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AreaChartComponent({ block, data: context }: LiquidComponentProps): React.ReactElement {
  const rawData = resolveBinding(block.binding, context);
  const chartData = Array.isArray(rawData) ? rawData as ChartDataPoint[] : [];
  const label = block.label;
  const chartId = useMemo(() => `area-chart-${Math.random().toString(36).slice(2, 9)}`, []);

  // Style options (cast to chart-specific style interface)
  const chartStyle = block.style as AreaChartStyle | undefined;
  const stacked = chartStyle?.stacked === true;
  const useGradient = chartStyle?.gradient !== false; // Default to gradient fills

  // Extract explicit columns if provided
  const explicitColumns = block.columns as ColumnDef[] | undefined;

  // Detect x/y fields
  const { x: xKey, y: yKey } = useMemo(() => {
    const explicitX = block.binding?.x;
    const explicitY = block.binding?.y;
    if (explicitX && explicitY) {
      return { x: explicitX, y: explicitY };
    }
    return detectXYFields(chartData);
  }, [block.binding, chartData]);

  // Determine which numeric fields to display
  const numericFields = useMemo(() => {
    // If explicit columns provided, use those
    if (explicitColumns && explicitColumns.length > 0) {
      return explicitColumns.map(col => col.field).filter(f => f !== xKey);
    }
    // Otherwise auto-detect
    return detectAllNumericFields(chartData, xKey);
  }, [chartData, xKey, explicitColumns]);

  // Get field labels (from explicit columns or auto-generate)
  const fieldLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    if (explicitColumns) {
      explicitColumns.forEach(col => {
        labels[col.field] = col.label || fieldToLabel(col.field);
      });
    }
    return labels;
  }, [explicitColumns]);

  // Generate accessibility description
  const chartDescription = useMemo(
    () => generateChartDescription(
      chartData,
      xKey,
      numericFields.length > 0 ? numericFields : [yKey],
      label,
      stacked
    ),
    [chartData, xKey, numericFields, yKey, label, stacked]
  );

  // SSR fallback
  if (!isBrowser) {
    return (
      <div
        data-liquid-type="area"
        style={styles.wrapper}
        role="img"
        aria-label={chartDescription}
      >
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.placeholder}>
          [Area chart - {chartData.length} points - x: {xKey}, y: {yKey}]
        </div>
      </div>
    );
  }

  // Empty state
  if (chartData.length === 0) {
    return (
      <div
        data-liquid-type="area"
        style={styles.wrapper}
        role="img"
        aria-label={`${label ? label + ': ' : ''}Empty area chart - no data available`}
      >
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.placeholder}>No data available</div>
      </div>
    );
  }

  const displayFields = numericFields.length > 0 ? numericFields : [yKey];

  return (
    <div
      data-liquid-type="area"
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
            {displayFields.map(field => (
              <th key={field} scope="col">
                {fieldLabels[field] || fieldToLabel(field)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chartData.slice(0, 10).map((row, i) => (
            <tr key={i}>
              <td>{String(row[xKey] ?? '')}</td>
              {displayFields.map(field => (
                <td key={field}>{String(row[field] ?? '')}</td>
              ))}
            </tr>
          ))}
          {chartData.length > 10 && (
            <tr><td colSpan={displayFields.length + 1}>...and {chartData.length - 10} more rows</td></tr>
          )}
        </tbody>
      </table>
      <ResponsiveContainer width="100%" height={220}>
        <RechartsAreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          {useGradient && renderGradientDefs(displayFields, chartId)}
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
          {displayFields.length === 1 && displayFields[0] ? (
            // Single area
            <Area
              type="monotone"
              dataKey={displayFields[0]}
              name={fieldLabels[displayFields[0]] || fieldToLabel(displayFields[0])}
              stroke={chartColors[0]}
              strokeWidth={2}
              fill={useGradient ? `url(#${chartId}-gradient-0)` : chartColors[0]}
              fillOpacity={useGradient ? 1 : 0.3}
            />
          ) : (
            // Multiple areas (stacked or layered)
            displayFields.map((field, i) => (
              <Area
                key={field}
                type="monotone"
                dataKey={field}
                name={fieldLabels[field] || fieldToLabel(field)}
                stroke={chartColors[i % chartColors.length]}
                strokeWidth={2}
                fill={useGradient ? `url(#${chartId}-gradient-${i})` : chartColors[i % chartColors.length]}
                fillOpacity={useGradient ? 1 : 0.3}
                stackId={stacked ? 'stack' : undefined}
              />
            ))
          )}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// Static Chart (standalone usage)
// ============================================================================

interface StaticAreaChartProps {
  data: ChartDataPoint[];
  xKey: string;
  areas: AreaConfig[];
  title?: string;
  height?: number;
  stacked?: boolean;
  gradient?: boolean;
  style?: React.CSSProperties;
}

export function StaticAreaChart({
  data,
  xKey,
  areas,
  title,
  height = 220,
  stacked = false,
  gradient = true,
  style: customStyle,
}: StaticAreaChartProps): React.ReactElement {
  const chartId = useMemo(() => `static-area-${Math.random().toString(36).slice(2, 9)}`, []);

  if (!isBrowser) {
    return (
      <div style={mergeStyles(styles.wrapper, customStyle)}>
        {title && <div style={styles.header}>{title}</div>}
        <div style={styles.placeholder}>[Area chart]</div>
      </div>
    );
  }

  return (
    <div style={mergeStyles(styles.wrapper, customStyle)}>
      {title && <div style={styles.header}>{title}</div>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart data={data}>
          {gradient && (
            <defs>
              {areas.map((area, i) => {
                const color = area.fill || chartColors[i % chartColors.length];
                return (
                  <linearGradient
                    key={`gradient-${i}`}
                    id={`${chartId}-gradient-${i}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                  </linearGradient>
                );
              })}
            </defs>
          )}
          <CartesianGrid strokeDasharray="3 3" stroke={tokens.colors.border} />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {areas.map((area, i) => {
            const color = area.fill || chartColors[i % chartColors.length];
            return (
              <Area
                key={area.dataKey}
                type="monotone"
                dataKey={area.dataKey}
                name={area.name || fieldToLabel(area.dataKey)}
                stroke={area.stroke || color}
                strokeWidth={2}
                fill={gradient ? `url(#${chartId}-gradient-${i})` : color}
                fillOpacity={gradient ? 1 : 0.3}
                stackId={stacked ? 'stack' : area.stackId}
              />
            );
          })}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export { AreaChartComponent as AreaChart };
export default AreaChartComponent;
