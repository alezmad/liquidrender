// Progress Component - Displays progress bar with percentage
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, getBlockColor } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

interface ProgressValue {
  value: number | null;
  label?: string;
}

export interface StaticProgressProps {
  value?: number | null;
  label?: string;
  color?: string;
  className?: string;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: mergeStyles(
    cardStyles(),
    {
      padding: tokens.spacing.md,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: tokens.spacing.sm,
    }
  ),

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  } as React.CSSProperties,

  label: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
  } as React.CSSProperties,

  valueText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.mutedForeground,
  } as React.CSSProperties,

  track: {
    width: '100%',
    height: '8px',
    backgroundColor: tokens.colors.secondary,
    borderRadius: tokens.radius.full,
    overflow: 'hidden',
    position: 'relative' as const,
  } as React.CSSProperties,

  bar: (percentage: number, color?: string): React.CSSProperties => ({
    height: '100%',
    width: `${percentage}%`,
    backgroundColor: color || tokens.colors.primary,
    borderRadius: tokens.radius.full,
    transition: `width ${tokens.transition.normal}`,
  }),

  indeterminateBar: (color?: string): React.CSSProperties => ({
    height: '100%',
    width: '100%',
    backgroundColor: color || tokens.colors.primary,
    borderRadius: tokens.radius.full,
    backgroundImage: `linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.2) 25%,
      transparent 25%,
      transparent 50%,
      rgba(255, 255, 255, 0.2) 50%,
      rgba(255, 255, 255, 0.2) 75%,
      transparent 75%,
      transparent
    )`,
    backgroundSize: '1rem 1rem',
    animation: 'progress-indeterminate 1s linear infinite',
  }),

  '@keyframes progress-indeterminate': {
    '0%': { backgroundPosition: '0 0' },
    '100%': { backgroundPosition: '1rem 0' },
  },
};

// Add keyframe animation to document head
if (typeof document !== 'undefined') {
  const styleId = 'liquid-progress-animations';
  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = `
      @keyframes progress-indeterminate {
        0% { background-position: 0 0; }
        100% { background-position: 1rem 0; }
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

// ============================================================================
// Helpers
// ============================================================================

function normalizeValue(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  // If it's already a number, clamp it to 0-100
  if (typeof value === 'number') {
    return Math.max(0, Math.min(100, value));
  }

  // Try to parse string numbers
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      return Math.max(0, Math.min(100, parsed));
    }
  }

  // Default to null for indeterminate
  return null;
}

function extractProgressData(value: unknown, label?: string): ProgressValue {
  // Check if value is an object with progress properties
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;

    // Look for common progress field names
    const progressValue = obj.progress ?? obj.value ?? obj.percentage ?? obj.percent;
    const progressLabel = obj.label ?? obj.name ?? label;

    return {
      value: normalizeValue(progressValue),
      label: typeof progressLabel === 'string' ? progressLabel : label,
    };
  }

  // Handle direct number or explicit value
  return {
    value: normalizeValue(value),
    label,
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function Progress({ block, data }: LiquidComponentProps): React.ReactElement {
  const rawValue = resolveBinding(block.binding, data);
  const label = block.label;
  const color = getBlockColor(block);

  const { value: progressValue, label: progressLabel } = extractProgressData(rawValue, label);

  const displayLabel = progressLabel || label;
  const isIndeterminate = progressValue === null;
  const percentage = progressValue ?? 0;

  return (
    <div data-liquid-type="progress" style={styles.wrapper}>
      {displayLabel && (
        <div style={styles.header}>
          <span style={styles.label}>{displayLabel}</span>
          {!isIndeterminate && (
            <span style={styles.valueText}>{percentage}%</span>
          )}
        </div>
      )}
      <div style={styles.track}>
        <div
          style={isIndeterminate ? styles.indeterminateBar(color) : styles.bar(percentage, color)}
          role="progressbar"
          aria-valuenow={isIndeterminate ? undefined : percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={displayLabel || 'Progress'}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

export function StaticProgress({
  value = null,
  label,
  color,
  className,
}: StaticProgressProps): React.ReactElement {
  const isIndeterminate = value === null;
  const percentage = value === null ? 0 : Math.max(0, Math.min(100, value));

  return (
    <div data-liquid-type="progress" style={styles.wrapper} className={className}>
      {label && (
        <div style={styles.header}>
          <span style={styles.label}>{label}</span>
          {!isIndeterminate && (
            <span style={styles.valueText}>{percentage}%</span>
          )}
        </div>
      )}
      <div style={styles.track}>
        <div
          style={isIndeterminate ? styles.indeterminateBar(color) : styles.bar(percentage, color)}
          role="progressbar"
          aria-valuenow={isIndeterminate ? undefined : percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label || 'Progress'}
        />
      </div>
    </div>
  );
}

export default Progress;
