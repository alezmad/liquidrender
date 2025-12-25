// Range Component - Slider input for numeric values
import React, { useCallback } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, mergeStyles, generateId } from './utils';
import { resolveBinding } from '../data-context';
import { useLiquidContext } from '../LiquidUI';

// ============================================================================
// Types
// ============================================================================

export interface RangeProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.xs,
  } as React.CSSProperties,

  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,

  label: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
  } as React.CSSProperties,

  value: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.mutedForeground,
    fontVariantNumeric: 'tabular-nums',
  } as React.CSSProperties,

  input: {
    width: '100%',
    height: '0.5rem',
    borderRadius: tokens.radius.full,
    appearance: 'none' as const,
    backgroundColor: tokens.colors.muted,
    cursor: 'pointer',
    outline: 'none',
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

function parseNumeric(value: unknown, fallback: number): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

// ============================================================================
// Main Component
// ============================================================================

export function Range({ block, data }: LiquidComponentProps): React.ReactElement {
  const { signalActions } = useLiquidContext();
  const rangeId = generateId('range');

  // Get min, max, step from block config
  const min = block.min ?? 0;
  const max = block.max ?? 100;
  const step = block.step ?? 1;

  const currentValue = parseNumeric(resolveBinding(block.binding, data), min + (max - min) / 2);
  const label = block.label;
  const emitSignal = block.signals?.emit;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (emitSignal?.name) {
      signalActions.emit(emitSignal.name, String(newValue));
    }
  }, [emitSignal, signalActions]);

  return (
    <div data-liquid-type="range" style={styles.wrapper}>
      <div style={styles.labelRow}>
        {label && <label htmlFor={rangeId} style={styles.label}>{label}</label>}
        <span style={styles.value}>{currentValue}</span>
      </div>
      <input
        type="range"
        id={rangeId}
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={handleChange}
        style={styles.input}
        aria-valuenow={currentValue}
        aria-valuemin={min}
        aria-valuemax={max}
      />
    </div>
  );
}

// ============================================================================
// Static Range
// ============================================================================

export interface StaticRangeProps {
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function StaticRange({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue = true,
  disabled = false,
  style: customStyle,
}: StaticRangeProps): React.ReactElement {
  const rangeId = generateId('range');

  return (
    <div data-liquid-type="range" style={mergeStyles(styles.wrapper, customStyle)}>
      <div style={styles.labelRow}>
        {label && <label htmlFor={rangeId} style={styles.label}>{label}</label>}
        {showValue && <span style={styles.value}>{value}</span>}
      </div>
      <input
        type="range"
        id={rangeId}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange?.(parseFloat(e.target.value))}
        disabled={disabled}
        style={styles.input}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
      />
    </div>
  );
}

export default Range;
