// KPI Card Component - Displays metric values with labels and trend indicators
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, formatDisplayValue, fieldToLabel, getBlockColor } from './utils';
import { resolveBinding, formatValue, type DataContext } from '../data-context';
import type { Block } from '../../compiler/ui-emitter';

// ============================================================================
// Types
// ============================================================================

interface KPIValue {
  value: unknown;
  label: string;
  trend?: 'up' | 'down' | 'neutral';
  change?: number;
}

// ============================================================================
// Helpers
// ============================================================================

function isNumeric(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function extractKPIValues(value: unknown, label?: string): KPIValue[] {
  // Object with multiple numeric fields -> expand to multiple KPIs
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const numericFields = Object.entries(obj).filter(([_, v]) => isNumeric(v));

    if (numericFields.length > 0) {
      return numericFields.map(([fieldName, fieldValue]) => ({
        value: fieldValue,
        label: fieldToLabel(fieldName),
      }));
    }
  }

  // Single value
  return [{
    value,
    label: label || '',
  }];
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: {
    display: 'flex',
    gap: tokens.spacing.md,
    flexWrap: 'wrap' as const,
  },

  card: (color?: string): React.CSSProperties => mergeStyles(
    cardStyles(),
    {
      padding: tokens.spacing.md,
      flex: '1 1 150px',
      minWidth: '150px',
      backgroundColor: color ? `${color}10` : tokens.colors.card,
      borderLeft: color ? `4px solid ${color}` : undefined,
    }
  ),

  label: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.mutedForeground,
    marginBottom: tokens.spacing.xs,
    fontWeight: tokens.fontWeight.medium,
  } as React.CSSProperties,

  value: {
    fontSize: tokens.fontSize['3xl'],
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.foreground,
    lineHeight: 1.2,
  } as React.CSSProperties,

  trend: (direction: 'up' | 'down' | 'neutral'): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    fontSize: tokens.fontSize.xs,
    marginTop: tokens.spacing.xs,
    color: direction === 'up' ? tokens.colors.success
         : direction === 'down' ? tokens.colors.error
         : tokens.colors.mutedForeground,
  }),

  trendIcon: {
    width: '12px',
    height: '12px',
  } as React.CSSProperties,
};

// ============================================================================
// Sub-components
// ============================================================================

interface SingleKPIProps {
  kpi: KPIValue;
  color?: string;
}

function SingleKPI({ kpi, color }: SingleKPIProps): React.ReactElement {
  const formattedValue = formatDisplayValue(kpi.value);

  return (
    <div style={styles.card(color)} data-liquid-type="kpi">
      <div style={styles.label}>{kpi.label}</div>
      <div style={styles.value}>{formattedValue}</div>
      {kpi.trend && kpi.change !== undefined && (
        <div style={styles.trend(kpi.trend)}>
          {kpi.trend === 'up' && (
            <svg style={styles.trendIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 14l5-5 5 5H7z" />
            </svg>
          )}
          {kpi.trend === 'down' && (
            <svg style={styles.trendIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 10l5 5 5-5H7z" />
            </svg>
          )}
          <span>{Math.abs(kpi.change).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function KPICard({ block, data }: LiquidComponentProps): React.ReactElement {
  const value = resolveBinding(block.binding, data);
  const label = block.label || '';
  const color = getBlockColor(block);

  const kpis = extractKPIValues(value, label);

  // Single KPI
  if (kpis.length === 1) {
    return <SingleKPI kpi={kpis[0]!} color={color} />;
  }

  // Multiple KPIs (expanded from object)
  return (
    <div style={styles.container} data-liquid-type="kpi-group">
      {kpis.map((kpi, i) => (
        <SingleKPI key={i} kpi={kpi} color={color} />
      ))}
    </div>
  );
}

export default KPICard;
