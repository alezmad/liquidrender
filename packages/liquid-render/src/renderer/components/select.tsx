// Select Component - Dropdown select with options
import React, { useState, useCallback } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, inputStyles, mergeStyles, baseStyles, generateId } from './utils';
import { resolveBinding } from '../data-context';
import { useLiquidContext } from '../LiquidUI';

// ============================================================================
// Types
// ============================================================================

interface SelectOption {
  value: string;
  label: string;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.xs,
  } as React.CSSProperties,

  label: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
  } as React.CSSProperties,

  selectWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,

  select: (hasError: boolean): React.CSSProperties =>
    mergeStyles(
      inputStyles(),
      {
        appearance: 'none',
        paddingRight: '2.5rem',
        cursor: 'pointer',
        backgroundImage: 'none',
        outline: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      },
      hasError ? { borderColor: tokens.colors.error } : {}
    ),

  selectFocus: {
    borderColor: tokens.colors.ring,
    boxShadow: `0 0 0 2px ${tokens.colors.ring}40`,
  } as React.CSSProperties,

  chevron: {
    position: 'absolute',
    right: tokens.spacing.md,
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.xs,
  } as React.CSSProperties,

  error: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.error,
    marginTop: tokens.spacing.xs,
  } as React.CSSProperties,

  hint: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse options from block.children with type 'option'
 * Each option has: value (string) and label (string)
 */
function parseOptions(block: LiquidComponentProps['block']): SelectOption[] {
  if (!block.children || block.children.length === 0) {
    return [];
  }

  return block.children
    .filter(child => child.type === 'option')
    .map(child => {
      // Options are parsed as children with type 'option'
      // The binding.value contains the option value
      // The label contains the display text
      const value = typeof child.binding?.value === 'string' ? child.binding.value : '';
      const label = child.label || value;
      return { value, label };
    });
}

// ============================================================================
// Main Component (Block-based)
// ============================================================================

export function Select({ block, data }: LiquidComponentProps): React.ReactElement {
  const { signalActions } = useLiquidContext();
  const initialValue = resolveBinding(block.binding, data);
  const [value, setValue] = useState(String(initialValue || ''));

  const label = block.label;
  const options = parseOptions(block);
  const emitSignal = block.signals?.emit;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newValue = e.target.value;
      setValue(newValue);

      // Emit signal on change if configured
      if (emitSignal?.name) {
        signalActions.emit(emitSignal.name, newValue);
      }
    },
    [emitSignal, signalActions]
  );

  const selectId = generateId('select');

  // Handle empty options
  if (options.length === 0) {
    return (
      <div style={styles.wrapper} data-liquid-type="select">
        {label && (
          <label htmlFor={selectId} style={styles.label}>
            {label}
          </label>
        )}
        <select
          id={selectId}
          value={value}
          onChange={handleChange}
          style={styles.select(false)}
          disabled
          aria-disabled="true"
        >
          <option value="">No options available</option>
        </select>
        <span style={styles.chevron} aria-hidden="true">▼</span>
      </div>
    );
  }

  return (
    <div style={styles.wrapper} data-liquid-type="select">
      {label && (
        <label htmlFor={selectId} style={styles.label}>
          {label}
        </label>
      )}
      <div style={styles.selectWrapper}>
        <select
          id={selectId}
          value={value}
          onChange={handleChange}
          style={styles.select(false)}
        >
          {options.map((option, index) => (
            <option key={`${option.value}-${index}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span style={styles.chevron} aria-hidden="true">▼</span>
      </div>
    </div>
  );
}

// ============================================================================
// Static Component (Standalone)
// ============================================================================

interface StaticSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
  placeholder?: string;
  selectStyle?: React.CSSProperties;
  wrapperStyle?: React.CSSProperties;
}

export function StaticSelect({
  label,
  options,
  error,
  hint,
  placeholder,
  id,
  selectStyle,
  wrapperStyle,
  ...props
}: StaticSelectProps): React.ReactElement {
  const selectId = id || generateId('select');
  const hasError = Boolean(error);

  return (
    <div style={mergeStyles(styles.wrapper, wrapperStyle)}>
      {label && (
        <label htmlFor={selectId} style={styles.label}>
          {label}
        </label>
      )}
      <div style={styles.selectWrapper}>
        <select
          id={selectId}
          style={mergeStyles(styles.select(hasError), selectStyle)}
          aria-invalid={hasError}
          aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option, index) => (
            <option key={`${option.value}-${index}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span style={styles.chevron} aria-hidden="true">▼</span>
      </div>
      {error && (
        <span id={`${selectId}-error`} style={styles.error} role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={`${selectId}-hint`} style={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  );
}

export default Select;
