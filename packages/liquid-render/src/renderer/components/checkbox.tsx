// Checkbox Component - Standard checkbox with label and custom styling
import React, { useState, useCallback } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, baseStyles, mergeStyles, generateId } from './utils';
import { resolveBinding } from '../data-context';
import { useLiquidContext } from '../LiquidUI';

// ============================================================================
// Types
// ============================================================================

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  label?: string;
  id?: string;
  onChange?: (checked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  style?: React.CSSProperties;
}

type CheckboxSize = 'sm' | 'md' | 'lg';

// ============================================================================
// Styles
// ============================================================================

const sizeConfig: Record<CheckboxSize, { box: number; fontSize: string }> = {
  sm: { box: 16, fontSize: tokens.fontSize.xs },
  md: { box: 20, fontSize: tokens.fontSize.sm },
  lg: { box: 24, fontSize: tokens.fontSize.base },
};

const styles = {
  wrapper: (hasError: boolean): React.CSSProperties =>
    mergeStyles(baseStyles(), {
      display: 'flex',
      flexDirection: 'column',
      gap: tokens.spacing.xs,
      color: hasError ? tokens.colors.error : tokens.colors.foreground,
    }),

  label: (disabled: boolean, size: CheckboxSize): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: sizeConfig[size].fontSize,
    fontWeight: tokens.fontWeight.normal,
    userSelect: 'none',
    opacity: disabled ? 0.5 : 1,
  }),

  inputWrapper: (size: CheckboxSize): React.CSSProperties => ({
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${sizeConfig[size].box}px`,
    height: `${sizeConfig[size].box}px`,
    flexShrink: 0,
  }),

  input: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'inherit',
    margin: 0,
  } as React.CSSProperties,

  checkmark: (checked: boolean, hasError: boolean, size: CheckboxSize): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    border: `2px solid ${hasError ? tokens.colors.error : checked ? tokens.colors.primary : tokens.colors.input}`,
    borderRadius: tokens.radius.sm,
    backgroundColor: checked ? tokens.colors.primary : tokens.colors.background,
    transition: `all ${tokens.transition.fast}`,
  }),

  checkIcon: (size: CheckboxSize): React.CSSProperties => ({
    width: `${sizeConfig[size].box * 0.6}px`,
    height: `${sizeConfig[size].box * 0.6}px`,
    color: tokens.colors.primaryForeground,
  }),

  labelText: {
    flex: 1,
  } as React.CSSProperties,

  error: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.error,
    marginTop: tokens.spacing.xs,
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

function CheckIcon({ size }: { size: CheckboxSize }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={styles.checkIcon(size)}
      aria-hidden="true"
      focusable="false"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ============================================================================
// Main Component (Block-based)
// ============================================================================

export function Checkbox({ block, data }: LiquidComponentProps): React.ReactElement {
  const { signalActions } = useLiquidContext();

  // Resolve binding for initial value
  const boundValue = block.binding ? resolveBinding(block.binding, data) : undefined;
  const initialChecked = typeof boundValue === 'boolean' ? boundValue : false;

  const [checked, setChecked] = useState(initialChecked);

  const label = block.label || '';
  const emitSignal = block.signals?.emit;
  const size: CheckboxSize = 'md'; // Default size for block-based usage

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newChecked = e.target.checked;
    setChecked(newChecked);

    // Emit signal on change if configured
    if (emitSignal?.name) {
      signalActions.emit(emitSignal.name, String(newChecked));
    }
  }, [emitSignal, signalActions]);

  const inputId = generateId('checkbox');

  return (
    <div data-liquid-type="checkbox" style={styles.wrapper(false)}>
      <label
        htmlFor={inputId}
        style={styles.label(false, size)}
      >
        <span style={styles.inputWrapper(size)}>
          <input
            id={inputId}
            type="checkbox"
            checked={checked}
            onChange={handleChange}
            style={styles.input}
            aria-checked={checked}
          />
          <span style={styles.checkmark(checked, false, size)}>
            {checked && <CheckIcon size={size} />}
          </span>
        </span>
        {label && <span style={styles.labelText}>{label}</span>}
      </label>
    </div>
  );
}

// ============================================================================
// Static Component (Standalone usage)
// ============================================================================

export function StaticCheckbox({
  checked: controlledChecked,
  defaultChecked,
  disabled = false,
  label,
  id,
  onChange,
  size = 'md',
  error,
  style,
}: CheckboxProps): React.ReactElement {
  // Controlled vs uncontrolled
  const isControlled = controlledChecked !== undefined;
  const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked || false);

  const checked = isControlled ? controlledChecked : uncontrolledChecked;
  const hasError = Boolean(error);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newChecked = e.target.checked;

    if (!isControlled) {
      setUncontrolledChecked(newChecked);
    }

    onChange?.(newChecked);
  }, [isControlled, onChange]);

  const inputId = id || generateId('checkbox');

  return (
    <div style={mergeStyles(styles.wrapper(hasError), style)}>
      <label
        htmlFor={inputId}
        style={styles.label(disabled, size)}
      >
        <span style={styles.inputWrapper(size)}>
          <input
            id={inputId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={handleChange}
            style={styles.input}
            aria-checked={checked}
            aria-invalid={hasError}
            aria-describedby={error ? `${inputId}-error` : undefined}
          />
          <span style={styles.checkmark(checked, hasError, size)}>
            {checked && <CheckIcon size={size} />}
          </span>
        </span>
        {label && <span style={styles.labelText}>{label}</span>}
      </label>
      {error && (
        <span id={`${inputId}-error`} style={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default Checkbox;
