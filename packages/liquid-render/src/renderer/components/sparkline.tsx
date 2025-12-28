// Sparkline Component - Tiny inline chart for embedding in text or tables
import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { LiquidComponentProps } from './utils';
import { tokens, chartColors, mergeStyles, isBrowser } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

type SparklineVariant = 'line' | 'area';

interface SparklineDataPoint {
  value: number;
  index?: number;
}

type TrendDirection = 'up' | 'down' | 'flat';

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: {
    display: 'inline-block',
    verticalAlign: 'middle',
    lineHeight: 0,
  } as React.CSSProperties,

  placeholder: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.xs,
    backgroundColor: tokens.colors.muted,
    borderRadius: tokens.radius.sm,
  } as React.CSSProperties,

  empty: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.xs,
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Determine trend direction based on first and last values
 */
function getTrendDirection(data: SparklineDataPoint[]): TrendDirection {
  if (data.length < 2) return 'flat';

  const first = data[0]!.value;
  const last = data[data.length - 1]!.value;

  // Use a small threshold to avoid noise
  const threshold = Math.abs(first) * 0.01;
  const diff = last - first;

  if (diff > threshold) return 'up';
  if (diff < -threshold) return 'down';
  return 'flat';
}

/**
 * Get color based on trend direction
 */
function getTrendColor(trend: TrendDirection): string {
  switch (trend) {
    case 'up':
      return tokens.colors.success;
    case 'down':
      return tokens.colors.error;
    case 'flat':
    default:
      return chartColors[0]!;
  }
}

/**
 * Normalize data to SparklineDataPoint format
 */
function normalizeData(raw: unknown): SparklineDataPoint[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((item, index) => {
    if (typeof item === 'number') {
      return { value: item, index };
    }
    if (typeof item === 'object' && item !== null) {
      // Try common field names for value
      const obj = item as Record<string, unknown>;
      const value = obj.value ?? obj.y ?? obj.v ?? obj.amount ?? obj.count ?? 0;
      return {
        value: typeof value === 'number' ? value : 0,
        index,
      };
    }
    return { value: 0, index };
  });
}

/**
 * Calculate reference line value (e.g., average, zero)
 */
function calculateReferenceValue(
  data: SparklineDataPoint[],
  type: 'average' | 'zero' | 'first' | 'last'
): number {
  if (data.length === 0) return 0;

  switch (type) {
    case 'average':
      return data.reduce((sum, d) => sum + d.value, 0) / data.length;
    case 'zero':
      return 0;
    case 'first':
      return data[0]!.value;
    case 'last':
      return data[data.length - 1]!.value;
    default:
      return 0;
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function Sparkline({ block, data: context }: LiquidComponentProps): React.ReactElement {
  const rawData = resolveBinding(block.binding, context);
  const props = block.props ?? {};

  // Parse configuration from block
  const variant: SparklineVariant = (props.variant as SparklineVariant) || 'line';
  const width = (props.width as number) || 80;
  const height = (props.height as number) || 24;
  const showReferenceLine = props.referenceLine as boolean | 'average' | 'zero' | 'first' | 'last';
  const colorOverride = (props.color as string | undefined) ?? block.style?.color;
  const autoColor = props.autoColor !== false; // Default to true for trend-based coloring

  // Normalize data
  const chartData = useMemo(() => normalizeData(rawData), [rawData]);

  // Calculate trend and color
  const trend = useMemo(() => getTrendDirection(chartData), [chartData]);
  const strokeColor = useMemo(() => {
    if (colorOverride) return colorOverride;
    if (autoColor) return getTrendColor(trend);
    return chartColors[0]!;
  }, [colorOverride, autoColor, trend]);

  // Reference line value
  const referenceValue = useMemo(() => {
    if (!showReferenceLine) return null;
    const refType = typeof showReferenceLine === 'string' ? showReferenceLine : 'average';
    return calculateReferenceValue(chartData, refType);
  }, [showReferenceLine, chartData]);

  // SSR fallback
  if (!isBrowser) {
    return (
      <span
        data-liquid-type="sparkline"
        style={mergeStyles(styles.placeholder, { width, height })}
        role="img"
        aria-label={`Sparkline chart with ${chartData.length} data points`}
      >
        [~]
      </span>
    );
  }

  // Empty state
  if (chartData.length === 0) {
    return (
      <span
        data-liquid-type="sparkline"
        style={mergeStyles(styles.empty, { width, height })}
        role="img"
        aria-label="Sparkline chart - no data"
      >
        --
      </span>
    );
  }

  // Generate accessibility label
  const ariaLabel = `Sparkline showing ${chartData.length} points, trend: ${trend}`;

  // Common chart props
  const chartMargin = { top: 2, right: 2, bottom: 2, left: 2 };

  return (
    <span
      data-liquid-type="sparkline"
      style={mergeStyles(styles.wrapper, { width, height })}
      role="img"
      aria-label={ariaLabel}
    >
      {variant === 'area' ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={chartMargin}>
            {referenceValue !== null && (
              <ReferenceLine
                y={referenceValue}
                stroke={tokens.colors.mutedForeground}
                strokeDasharray="2 2"
                strokeWidth={1}
              />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={1.5}
              fill={strokeColor}
              fillOpacity={0.2}
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={chartMargin}>
            {referenceValue !== null && (
              <ReferenceLine
                y={referenceValue}
                stroke={tokens.colors.mutedForeground}
                strokeDasharray="2 2"
                strokeWidth={1}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </span>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

interface StaticSparklineProps {
  /** Array of values or objects with a value property */
  data: number[] | Array<{ value: number; [key: string]: unknown }>;
  /** Chart variant: 'line' or 'area' */
  variant?: SparklineVariant;
  /** Width in pixels (default: 80) */
  width?: number;
  /** Height in pixels (default: 24) */
  height?: number;
  /** Override stroke/fill color */
  color?: string;
  /** Auto-color based on trend (default: true) */
  autoColor?: boolean;
  /** Show reference line: true for 'average', or specify 'zero'|'first'|'last' */
  referenceLine?: boolean | 'average' | 'zero' | 'first' | 'last';
  /** Custom styles */
  style?: React.CSSProperties;
}

export function StaticSparkline({
  data,
  variant = 'line',
  width = 80,
  height = 24,
  color,
  autoColor = true,
  referenceLine,
  style: customStyle,
}: StaticSparklineProps): React.ReactElement {
  // Normalize data
  const chartData = useMemo(() => normalizeData(data), [data]);

  // Calculate trend and color
  const trend = useMemo(() => getTrendDirection(chartData), [chartData]);
  const strokeColor = useMemo(() => {
    if (color) return color;
    if (autoColor) return getTrendColor(trend);
    return chartColors[0]!;
  }, [color, autoColor, trend]);

  // Reference line value
  const referenceValue = useMemo(() => {
    if (!referenceLine) return null;
    const refType = typeof referenceLine === 'string' ? referenceLine : 'average';
    return calculateReferenceValue(chartData, refType);
  }, [referenceLine, chartData]);

  // SSR fallback
  if (!isBrowser) {
    return (
      <span
        style={mergeStyles(styles.placeholder, { width, height }, customStyle)}
        role="img"
        aria-label={`Sparkline chart with ${chartData.length} data points`}
      >
        [~]
      </span>
    );
  }

  // Empty state
  if (chartData.length === 0) {
    return (
      <span
        style={mergeStyles(styles.empty, { width, height }, customStyle)}
        role="img"
        aria-label="Sparkline chart - no data"
      >
        --
      </span>
    );
  }

  const ariaLabel = `Sparkline showing ${chartData.length} points, trend: ${trend}`;
  const chartMargin = { top: 2, right: 2, bottom: 2, left: 2 };

  return (
    <span
      style={mergeStyles(styles.wrapper, { width, height }, customStyle)}
      role="img"
      aria-label={ariaLabel}
    >
      {variant === 'area' ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={chartMargin}>
            {referenceValue !== null && (
              <ReferenceLine
                y={referenceValue}
                stroke={tokens.colors.mutedForeground}
                strokeDasharray="2 2"
                strokeWidth={1}
              />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={1.5}
              fill={strokeColor}
              fillOpacity={0.2}
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={chartMargin}>
            {referenceValue !== null && (
              <ReferenceLine
                y={referenceValue}
                stroke={tokens.colors.mutedForeground}
                strokeDasharray="2 2"
                strokeWidth={1}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </span>
  );
}

export default Sparkline;
