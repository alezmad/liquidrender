// Spinner Component - Circular spinning loader with size variants
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, mergeStyles, getBlockColor } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

type SpinnerSize = 'sm' | 'md' | 'lg';

export interface StaticSpinnerProps {
  size?: SpinnerSize;
  color?: string;
  label?: string;
  className?: string;
}

// ============================================================================
// Styles
// ============================================================================

const sizeMap: Record<SpinnerSize, { spinner: string; border: string }> = {
  sm: { spinner: '16px', border: '2px' },
  md: { spinner: '24px', border: '3px' },
  lg: { spinner: '36px', border: '4px' },
};

const styles = {
  wrapper: {
    display: 'inline-flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
  } as React.CSSProperties,

  spinner: (size: SpinnerSize, color?: string): React.CSSProperties => ({
    width: sizeMap[size].spinner,
    height: sizeMap[size].spinner,
    border: `${sizeMap[size].border} solid ${tokens.colors.border}`,
    borderTopColor: color || tokens.colors.primary,
    borderRadius: tokens.radius.full,
    animation: 'liquid-spin 0.8s linear infinite',
    boxSizing: 'border-box',
  }),

  label: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.mutedForeground,
    fontWeight: tokens.fontWeight.medium,
  } as React.CSSProperties,
};

// Add keyframe animation to document head
if (typeof document !== 'undefined') {
  const styleId = 'liquid-spinner-animations';
  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = `
      @keyframes liquid-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

// ============================================================================
// Helpers
// ============================================================================

function normalizeSize(size: unknown): SpinnerSize {
  if (size === 'sm' || size === 'md' || size === 'lg') {
    return size;
  }
  return 'md';
}

function extractSpinnerData(
  value: unknown,
  blockLabel?: string,
  blockSize?: unknown
): { label?: string; size: SpinnerSize } {
  // Check if value is an object with spinner properties
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;

    const spinnerLabel = obj.label ?? obj.text ?? blockLabel;
    const spinnerSize = obj.size ?? blockSize;

    return {
      label: typeof spinnerLabel === 'string' ? spinnerLabel : blockLabel,
      size: normalizeSize(spinnerSize),
    };
  }

  // Handle direct label string
  if (typeof value === 'string') {
    return {
      label: value || blockLabel,
      size: normalizeSize(blockSize),
    };
  }

  return {
    label: blockLabel,
    size: normalizeSize(blockSize),
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function Spinner({ block, data }: LiquidComponentProps): React.ReactElement {
  const rawValue = resolveBinding(block.binding, data);
  const label = block.label;
  const color = getBlockColor(block);
  const blockSize = block.style?.size;

  const { label: spinnerLabel, size } = extractSpinnerData(rawValue, label, blockSize);

  return (
    <div data-liquid-type="spinner" style={styles.wrapper}>
      <div
        style={styles.spinner(size, color)}
        role="status"
        aria-label={spinnerLabel || 'Loading'}
      />
      {spinnerLabel && <span style={styles.label}>{spinnerLabel}</span>}
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

export function StaticSpinner({
  size = 'md',
  color,
  label,
  className,
}: StaticSpinnerProps): React.ReactElement {
  return (
    <div data-liquid-type="spinner" style={styles.wrapper} className={className}>
      <div
        style={styles.spinner(size, color)}
        role="status"
        aria-label={label || 'Loading'}
      />
      {label && <span style={styles.label}>{label}</span>}
    </div>
  );
}

export default Spinner;
