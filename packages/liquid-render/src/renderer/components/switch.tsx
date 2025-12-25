// Switch Component - Toggle switch with state management
import React, { useCallback } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, mergeStyles, generateId } from './utils';
import { resolveBinding } from '../data-context';

// Import context hook for signal management
import { useLiquidContext } from '../LiquidUI';

// ============================================================================
// Types
// ============================================================================

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    cursor: 'pointer',
    userSelect: 'none' as const,
  } as React.CSSProperties,

  wrapperDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  } as React.CSSProperties,

  input: {
    position: 'absolute' as const,
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap' as const,
    border: '0',
  } as React.CSSProperties,

  track: {
    position: 'relative' as const,
    width: '2.75rem', // 44px
    height: '1.5rem', // 24px
    backgroundColor: tokens.colors.input,
    borderRadius: tokens.radius.full,
    transition: `background-color ${tokens.transition.normal}`,
    border: `2px solid ${tokens.colors.border}`,
  } as React.CSSProperties,

  trackChecked: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  } as React.CSSProperties,

  thumb: {
    position: 'absolute' as const,
    top: '2px',
    left: '2px',
    width: '1rem', // 16px
    height: '1rem', // 16px
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.full,
    transition: `transform ${tokens.transition.normal}`,
    boxShadow: tokens.shadow.sm,
  } as React.CSSProperties,

  thumbChecked: {
    transform: 'translateX(1.25rem)', // 20px (44px - 24px)
  } as React.CSSProperties,

  label: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.foreground,
    fontWeight: tokens.fontWeight.medium,
  } as React.CSSProperties,
};

// ============================================================================
// Main Component
// ============================================================================

export function Switch({ block, data }: LiquidComponentProps): React.ReactElement {
  const { signalActions } = useLiquidContext();
  const switchId = generateId('switch');

  // Resolve the binding to get the current value
  const boundValue = resolveBinding(block.binding, data);
  const label = block.label;

  // Convert bound value to boolean
  const isChecked = Boolean(boundValue);

  // Get signal emit configuration
  const emitSignal = block.signals?.emit;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;

    // Emit signal with boolean value
    if (emitSignal?.name) {
      signalActions.emit(emitSignal.name, String(newValue));
    }

    // Note: In a real application, you'd also update the data source
    // through a mutation or form submission mechanism
  }, [emitSignal, signalActions]);

  const wrapperStyle = mergeStyles(styles.wrapper);
  const trackStyle = mergeStyles(
    styles.track,
    isChecked ? styles.trackChecked : {}
  );
  const thumbStyle = mergeStyles(
    styles.thumb,
    isChecked ? styles.thumbChecked : {}
  );

  return (
    <label
      data-liquid-type="switch"
      htmlFor={switchId}
      style={wrapperStyle}
    >
      <input
        id={switchId}
        type="checkbox"
        role="switch"
        checked={isChecked}
        onChange={handleChange}
        style={styles.input}
        aria-checked={isChecked}
      />
      <span style={trackStyle}>
        <span style={thumbStyle} />
      </span>
      {label && <span style={styles.label}>{label}</span>}
    </label>
  );
}

// ============================================================================
// Static Switch (no signal context required)
// ============================================================================

export interface StaticSwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function StaticSwitch({
  checked,
  onChange,
  label,
  disabled = false,
  style: customStyle,
}: StaticSwitchProps): React.ReactElement {
  const switchId = generateId('switch');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled && onChange) {
      onChange(e.target.checked);
    }
  }, [disabled, onChange]);

  const wrapperStyle = mergeStyles(
    styles.wrapper,
    disabled ? styles.wrapperDisabled : {},
    customStyle
  );
  const trackStyle = mergeStyles(
    styles.track,
    checked ? styles.trackChecked : {}
  );
  const thumbStyle = mergeStyles(
    styles.thumb,
    checked ? styles.thumbChecked : {}
  );

  return (
    <label
      htmlFor={switchId}
      style={wrapperStyle}
    >
      <input
        id={switchId}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        style={styles.input}
        aria-checked={checked}
        aria-disabled={disabled}
      />
      <span style={trackStyle}>
        <span style={thumbStyle} />
      </span>
      {label && <span style={styles.label}>{label}</span>}
    </label>
  );
}

export default Switch;
