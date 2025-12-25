// Textarea Component - Multi-line text input
// DSL: Ta :binding "Label" or Ta "placeholder"

import React, { forwardRef, useState, useCallback } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, inputStyles, mergeStyles, baseStyles, generateId } from './utils';
import { resolveBinding } from '../data-context';
import { useLiquidContext } from '../LiquidUI';

// ============================================================================
// Types
// ============================================================================

type TextareaSize = 'sm' | 'md' | 'lg';

export interface StaticTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: TextareaSize;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  wrapperStyle?: React.CSSProperties;
}

// ============================================================================
// Styles
// ============================================================================

const sizeStyles: Record<TextareaSize, { minHeight: string; fontSize: string; padding: string }> = {
  sm: { minHeight: '4rem', fontSize: tokens.fontSize.xs, padding: tokens.spacing.sm },
  md: { minHeight: '5rem', fontSize: tokens.fontSize.sm, padding: tokens.spacing.sm },
  lg: { minHeight: '6rem', fontSize: tokens.fontSize.base, padding: tokens.spacing.md },
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

  textarea: (size: TextareaSize, hasError: boolean, resize: string): React.CSSProperties =>
    mergeStyles(
      inputStyles(),
      {
        height: 'auto',
        minHeight: sizeStyles[size].minHeight,
        fontSize: sizeStyles[size].fontSize,
        padding: sizeStyles[size].padding,
        resize: resize as React.CSSProperties['resize'],
        lineHeight: '1.5',
      },
      hasError ? { borderColor: tokens.colors.error } : {}
    ),

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

export function Textarea({ block, data }: LiquidComponentProps): React.ReactElement {
  const { signalActions } = useLiquidContext();

  // Resolve binding for initial value
  const boundValue = block.binding ? resolveBinding(block.binding, data) : undefined;
  const initialValue = typeof boundValue === 'string' ? boundValue : '';

  const [value, setValue] = useState(initialValue);

  const label = block.label;
  const placeholder = typeof block.binding?.value === 'string' ? block.binding.value : '';
  const emitSignal = block.signals?.emit;

  // Get rows from block.style if present (cast to access extended properties)
  const blockStyle = block.style as Record<string, unknown> | undefined;
  const rows = blockStyle?.rows;
  const rowsNumber = typeof rows === 'number' ? rows : undefined;

  // Calculate minHeight based on rows if specified
  const rowBasedMinHeight = rowsNumber ? `${rowsNumber * 1.5}em` : undefined;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    // Emit signal on change if configured
    if (emitSignal?.name) {
      signalActions.emit(emitSignal.name, newValue);
    }
  }, [emitSignal, signalActions]);

  const textareaId = generateId('textarea');

  const textareaStyle = mergeStyles(
    styles.textarea('md', false, 'vertical'),
    rowBasedMinHeight ? { minHeight: rowBasedMinHeight } : {}
  );

  return (
    <div style={styles.wrapper} data-liquid-type="textarea">
      {label && (
        <label htmlFor={textareaId} style={styles.label}>
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rowsNumber}
        style={textareaStyle}
      />
    </div>
  );
}

// ============================================================================
// Static Component (Standalone usage)
// ============================================================================

export const StaticTextarea = forwardRef<HTMLTextAreaElement, StaticTextareaProps>(
  function StaticTextarea(
    {
      label,
      error,
      hint,
      size = 'md',
      resize = 'vertical',
      id,
      wrapperStyle,
      style,
      ...props
    },
    ref
  ) {
    const textareaId = id || generateId('textarea');
    const hasError = Boolean(error);

    const textareaStyle = mergeStyles(
      styles.textarea(size, hasError, resize),
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
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          {...props}
        />
        {error && (
          <span id={`${textareaId}-error`} style={styles.error} role="alert">
            {error}
          </span>
        )}
        {hint && !error && (
          <span id={`${textareaId}-hint`} style={styles.hint}>
            {hint}
          </span>
        )}
      </div>
    );
  }
);

export default Textarea;
