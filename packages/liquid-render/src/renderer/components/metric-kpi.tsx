// MetricKPI Component - Displays calculated metric values from Knosia
// This is a specialized KPI card that displays metrics from the calculated metrics system
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, formatDisplayValue } from './utils';
import { resolveBinding, type DataContext } from '../data-context';
import type { Block } from '../../compiler/ui-emitter';

// ============================================================================
// Types
// ============================================================================

interface MetricKPIBlock extends Block {
  type: 'metricKPI';
  /** ID of the calculated metric */
  metricId?: string;
  /** Show trend indicator */
  showTrend?: boolean;
  /** Auto-refresh interval in seconds (0 = manual only) */
  refreshInterval?: number;
  /** Label override (uses metric name if not specified) */
  label?: string;
}

interface MetricExecutionResult {
  value: number | string;
  formattedValue: string;
  executedAt: string;
  executionTimeMs: number;
  fromCache: boolean;
  name?: string;
  trend?: number;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: mergeStyles(cardStyles(), {
    padding: tokens.spacing.lg,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.md,
    minHeight: '160px',
  }),

  title: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.mutedForeground,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  value: {
    fontSize: tokens.fontSize['4xl'],
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.foreground,
    lineHeight: 1,
  } as React.CSSProperties,

  trend: (isPositive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    fontSize: tokens.fontSize.sm,
    color: isPositive ? tokens.colors.success : tokens.colors.error,
  }),

  timestamp: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
    marginTop: 'auto',
  } as React.CSSProperties,

  loading: {
    opacity: 0.5,
  } as React.CSSProperties,

  error: {
    color: tokens.colors.error,
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// ============================================================================
// Sub-components
// ============================================================================

interface TrendIndicatorProps {
  value: number;
}

function TrendIndicator({ value }: TrendIndicatorProps): React.ReactElement {
  const isPositive = value >= 0;
  const arrow = isPositive ? '↑' : '↓';

  return (
    <div style={styles.trend(isPositive)}>
      <span>{arrow}</span>
      <span>{Math.abs(value).toFixed(1)}% vs last period</span>
    </div>
  );
}

interface LoadingStateProps {
  label?: string;
}

function LoadingState({ label }: LoadingStateProps): React.ReactElement {
  return (
    <div data-liquid-type="metricKPI" style={styles.container}>
      <div style={{ ...styles.title, ...styles.loading }}>{label || 'Loading...'}</div>
      <div style={{ ...styles.value, ...styles.loading }}>—</div>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
}

function ErrorState({ message }: ErrorStateProps): React.ReactElement {
  return (
    <div data-liquid-type="metricKPI" style={styles.container}>
      <div style={{ ...styles.title, ...styles.error }}>Error</div>
      <div style={{ ...styles.value, fontSize: tokens.fontSize.sm }}>{message}</div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MetricKPI({ block, data }: LiquidComponentProps): React.ReactElement {
  const metricBlock = block as MetricKPIBlock;
  const rawMetricId = metricBlock.metricId || block.binding;

  // Extract string key from metricId (could be string or Binding object)
  const metricKey = typeof rawMetricId === 'string'
    ? rawMetricId
    : rawMetricId && typeof rawMetricId === 'object' && 'value' in rawMetricId
      ? (typeof rawMetricId.value === 'string' ? rawMetricId.value : '')
      : '';

  // Try to resolve metric data from context
  // The metric data should be provided in data.metrics[metricId]
  const metricsData = data as DataContext & {
    metrics?: Record<string, MetricExecutionResult>;
    metricLoading?: Record<string, boolean>;
    metricErrors?: Record<string, string>;
  };

  const metricResult = metricsData.metrics?.[metricKey];
  const isLoading = metricsData.metricLoading?.[metricKey];
  const error = metricsData.metricErrors?.[metricKey];

  // If no metric data in context, try resolving from binding
  // Convert string to Binding-like object if needed
  const bindingToResolve = typeof rawMetricId === 'string'
    ? { kind: 'field' as const, value: rawMetricId }
    : rawMetricId;
  const boundValue = bindingToResolve ? resolveBinding(bindingToResolve, data) : undefined;

  // Loading state
  if (isLoading) {
    return <LoadingState label={metricBlock.label} />;
  }

  // Error state
  if (error) {
    return <ErrorState message={error} />;
  }

  // If we have metric result from context
  if (metricResult) {
    return (
      <div data-liquid-type="metricKPI" style={styles.container}>
        <div style={styles.title}>{metricBlock.label || metricResult.name || 'Metric'}</div>
        <div style={styles.value}>{metricResult.formattedValue}</div>

        {metricBlock.showTrend && metricResult.trend !== undefined && (
          <TrendIndicator value={metricResult.trend} />
        )}

        {metricResult.executedAt && (
          <div style={styles.timestamp}>
            Updated {formatRelativeTime(metricResult.executedAt)}
            {metricResult.fromCache && ' (cached)'}
          </div>
        )}
      </div>
    );
  }

  // If we have a bound value (simple use case)
  if (boundValue !== undefined) {
    return (
      <div data-liquid-type="metricKPI" style={styles.container}>
        <div style={styles.title}>{metricBlock.label || 'Value'}</div>
        <div style={styles.value}>{formatDisplayValue(boundValue)}</div>
      </div>
    );
  }

  // No data available
  return (
    <div data-liquid-type="metricKPI" style={styles.container}>
      <div style={styles.title}>{metricBlock.label || 'Metric'}</div>
      <div style={{ ...styles.value, ...styles.loading }}>No data</div>
      <div style={styles.timestamp}>Metric not found or not yet executed</div>
    </div>
  );
}

/**
 * Static version for SSR/previews
 */
export function StaticMetricKPI({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div data-liquid-type="metricKPI" style={styles.container}>
      <div style={styles.title}>{label}</div>
      <div style={styles.value}>{value}</div>
    </div>
  );
}

export default MetricKPI;
