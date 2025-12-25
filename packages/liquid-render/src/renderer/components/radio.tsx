// Radio Component - Radio button group
import React, { useCallback } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, mergeStyles, generateId } from './utils';
import { resolveBinding } from '../data-context';
import { useLiquidContext } from '../LiquidUI';

// ============================================================================
// Types
// ============================================================================

export interface RadioOption {
  value: string;
  label: string;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  fieldset: {
    border: 'none',
    padding: 0,
    margin: 0,
  } as React.CSSProperties,

  legend: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
    marginBottom: tokens.spacing.sm,
    padding: 0,
  } as React.CSSProperties,

  optionsContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.sm,
  } as React.CSSProperties,

  option: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    cursor: 'pointer',
  } as React.CSSProperties,

  input: {
    width: '1rem',
    height: '1rem',
    margin: 0,
    accentColor: tokens.colors.primary,
    cursor: 'pointer',
  } as React.CSSProperties,

  label: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.foreground,
    cursor: 'pointer',
  } as React.CSSProperties,
};

// ============================================================================
// Main Component
// ============================================================================

export function Radio({ block, data }: LiquidComponentProps): React.ReactElement {
  const { signalActions } = useLiquidContext();
  const groupId = generateId('radio');

  const currentValue = resolveBinding(block.binding, data);
  const label = block.label;
  const emitSignal = block.signals?.emit;

  // Extract options from children (opt elements)
  const options: RadioOption[] = (block.children || [])
    .filter(child => child.type === 'option')
    .map(child => {
      const rawValue = child.binding?.value;
      const value = typeof rawValue === 'string' ? rawValue : '';
      return {
        value,
        label: child.label || value,
      };
    });

  const handleChange = useCallback((value: string) => {
    if (emitSignal?.name) {
      signalActions.emit(emitSignal.name, value);
    }
  }, [emitSignal, signalActions]);

  return (
    <fieldset data-liquid-type="radio" style={styles.fieldset}>
      {label && <legend style={styles.legend}>{label}</legend>}
      <div style={styles.optionsContainer}>
        {options.map((option, index) => {
          const optionId = `${groupId}-${index}`;
          const isSelected = String(currentValue) === option.value;

          return (
            <label key={optionId} htmlFor={optionId} style={styles.option}>
              <input
                type="radio"
                id={optionId}
                name={groupId}
                value={option.value}
                checked={isSelected}
                onChange={() => handleChange(option.value)}
                style={styles.input}
              />
              <span style={styles.label}>{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// ============================================================================
// Static Radio
// ============================================================================

export interface StaticRadioProps {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function StaticRadio({
  name,
  options,
  value,
  onChange,
  label,
  disabled = false,
  style: customStyle,
}: StaticRadioProps): React.ReactElement {
  const groupId = generateId('radio');

  return (
    <fieldset data-liquid-type="radio" style={mergeStyles(styles.fieldset, customStyle)}>
      {label && <legend style={styles.legend}>{label}</legend>}
      <div style={styles.optionsContainer}>
        {options.map((option, index) => {
          const optionId = `${groupId}-${index}`;
          return (
            <label key={optionId} htmlFor={optionId} style={styles.option}>
              <input
                type="radio"
                id={optionId}
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange?.(option.value)}
                disabled={disabled}
                style={styles.input}
              />
              <span style={styles.label}>{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default Radio;
