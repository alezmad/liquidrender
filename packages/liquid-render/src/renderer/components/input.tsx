// Input Component - Text input with variants and states
import React, { forwardRef, useState, useCallback } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, inputStyles, mergeStyles, baseStyles, generateId } from './utils';
import { resolveBinding } from '../data-context';
import { useLiquidContext } from '../LiquidUI';

// ============================================================================
// Types
// ============================================================================

type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
type InputSize = 'sm' | 'md' | 'lg';

// ============================================================================
// Styles
// ============================================================================

const sizeStyles: Record<InputSize, React.CSSProperties> = {
  sm: { height: '2rem', fontSize: tokens.fontSize.xs, padding: `0 ${tokens.spacing.sm}` },
  md: { height: '2.5rem', fontSize: tokens.fontSize.sm, padding: `0 ${tokens.spacing.md}` },
  lg: { height: '3rem', fontSize: tokens.fontSize.base, padding: `0 ${tokens.spacing.md}` },
};

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

  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,

  input: (size: InputSize, hasError: boolean, hasIcon: boolean): React.CSSProperties =>
    mergeStyles(
      inputStyles(),
      sizeStyles[size],
      hasError ? { borderColor: tokens.colors.error } : {},
      hasIcon ? { paddingLeft: '2.5rem' } : {}
    ),

  icon: {
    position: 'absolute',
    left: tokens.spacing.sm,
    display: 'flex',
    alignItems: 'center',
    color: tokens.colors.mutedForeground,
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
// Main Component (Block-based)
// ============================================================================

export function Input({ block, data }: LiquidComponentProps): React.ReactElement {
  const { signalActions } = useLiquidContext();
  const [value, setValue] = useState('');

  const label = block.label;
  const placeholder = typeof block.binding?.value === 'string' ? block.binding.value : '';
  const emitSignal = block.signals?.emit;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    // Emit signal on change if configured
    if (emitSignal?.name) {
      signalActions.emit(emitSignal.name, newValue);
    }
  }, [emitSignal, signalActions]);

  const inputId = generateId('input');

  return (
    <div style={styles.wrapper} data-liquid-type="input">
      {label && (
        <label htmlFor={inputId} style={styles.label}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        style={styles.input('md', false, false)}
      />
    </div>
  );
}

// ============================================================================
// Controlled Input (Standalone)
// ============================================================================

interface ControlledInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: InputSize;
  icon?: React.ReactNode;
  inputStyle?: React.CSSProperties;
  wrapperStyle?: React.CSSProperties;
}

export const ControlledInput = forwardRef<HTMLInputElement, ControlledInputProps>(
  function ControlledInput(
    {
      label,
      error,
      hint,
      size = 'md',
      icon,
      id,
      inputStyle,
      wrapperStyle,
      ...props
    },
    ref
  ) {
    const inputId = id || generateId('input');
    const hasError = Boolean(error);
    const hasIcon = Boolean(icon);

    return (
      <div style={mergeStyles(styles.wrapper, wrapperStyle)}>
        {label && (
          <label htmlFor={inputId} style={styles.label}>
            {label}
          </label>
        )}
        <div style={styles.inputWrapper}>
          {icon && <span style={styles.icon}>{icon}</span>}
          <input
            ref={ref}
            id={inputId}
            style={mergeStyles(styles.input(size, hasError, hasIcon), inputStyle)}
            aria-invalid={hasError}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
        </div>
        {error && (
          <span id={`${inputId}-error`} style={styles.error} role="alert">
            {error}
          </span>
        )}
        {hint && !error && (
          <span id={`${inputId}-hint`} style={styles.hint}>
            {hint}
          </span>
        )}
      </div>
    );
  }
);

// ============================================================================
// Textarea
// ============================================================================

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperStyle?: React.CSSProperties;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, hint, id, wrapperStyle, style, ...props }, ref) {
    const textareaId = id || generateId('textarea');
    const hasError = Boolean(error);

    const textareaStyle = mergeStyles(
      inputStyles(),
      {
        height: 'auto',
        minHeight: '5rem',
        resize: 'vertical',
        padding: tokens.spacing.sm,
      },
      hasError ? { borderColor: tokens.colors.error } : {},
      style
    );

    return (
      <div style={mergeStyles(styles.wrapper, wrapperStyle)}>
        {label && (
          <label htmlFor={textareaId} style={styles.label}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          style={textareaStyle}
          aria-invalid={hasError}
          {...props}
        />
        {error && (
          <span style={styles.error} role="alert">
            {error}
          </span>
        )}
        {hint && !error && <span style={styles.hint}>{hint}</span>}
      </div>
    );
  }
);

// ============================================================================
// Search Input
// ============================================================================

interface SearchInputProps extends Omit<ControlledInputProps, 'icon' | 'type'> {
  onSearch?: (value: string) => void;
}

export function SearchInput({ onSearch, ...props }: SearchInputProps): React.ReactElement {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(e.currentTarget.value);
    }
  };

  const searchIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );

  return (
    <ControlledInput
      type="search"
      icon={searchIcon}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

export default Input;
