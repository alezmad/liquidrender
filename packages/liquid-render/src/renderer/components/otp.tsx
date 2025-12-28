// OTP Component - One-Time Password input with configurable length
import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, mergeStyles, generateId } from './utils';
import { useLiquidContext } from '../LiquidUI';

// ============================================================================
// Types
// ============================================================================

type OTPLength = 4 | 5 | 6 | 7 | 8;

interface OTPSlotState {
  char: string;
  isActive: boolean;
  hasFakeCaret: boolean;
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

  label: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
  } as React.CSSProperties,

  container: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  } as React.CSSProperties,

  group: {
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,

  slot: (isActive: boolean, hasError: boolean, isFirst: boolean, isLast: boolean): React.CSSProperties => ({
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.5rem', // 40px
    height: '2.5rem', // 40px
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
    backgroundColor: tokens.colors.background,
    borderTop: `1px solid ${hasError ? tokens.colors.error : isActive ? tokens.colors.ring : tokens.colors.input}`,
    borderBottom: `1px solid ${hasError ? tokens.colors.error : isActive ? tokens.colors.ring : tokens.colors.input}`,
    borderRight: `1px solid ${hasError ? tokens.colors.error : isActive ? tokens.colors.ring : tokens.colors.input}`,
    borderLeft: isFirst ? `1px solid ${hasError ? tokens.colors.error : isActive ? tokens.colors.ring : tokens.colors.input}` : 'none',
    borderTopLeftRadius: isFirst ? tokens.radius.md : 0,
    borderBottomLeftRadius: isFirst ? tokens.radius.md : 0,
    borderTopRightRadius: isLast ? tokens.radius.md : 0,
    borderBottomRightRadius: isLast ? tokens.radius.md : 0,
    boxShadow: isActive ? `0 0 0 3px ${tokens.colors.ring}20` : tokens.shadow.sm,
    transition: `all ${tokens.transition.fast}`,
    zIndex: isActive ? 10 : 1,
    outline: 'none',
  }),

  caret: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none' as const,
  } as React.CSSProperties,

  caretBlink: {
    width: '1px',
    height: '1rem',
    backgroundColor: tokens.colors.foreground,
    animation: 'otp-caret-blink 1s step-end infinite',
  } as React.CSSProperties,

  separator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `0 ${tokens.spacing.xs}`,
    color: tokens.colors.mutedForeground,
  } as React.CSSProperties,

  separatorIcon: {
    width: '1rem',
    height: '2px',
    backgroundColor: tokens.colors.mutedForeground,
    borderRadius: tokens.radius.full,
  } as React.CSSProperties,

  hiddenInput: {
    position: 'absolute' as const,
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap' as const,
    border: 0,
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

// Keyframe animation for caret blink (injected once)
const caretBlinkStyle = `
  @keyframes otp-caret-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
`;

// ============================================================================
// Helpers
// ============================================================================

function injectCaretAnimation(): void {
  if (typeof document === 'undefined') return;

  const styleId = 'liquid-otp-caret-animation';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = caretBlinkStyle;
  document.head.appendChild(style);
}

function getSlotStates(value: string, activeIndex: number, length: number): OTPSlotState[] {
  return Array.from({ length }, (_, i) => ({
    char: value[i] || '',
    isActive: i === activeIndex,
    hasFakeCaret: i === activeIndex && !value[i],
  }));
}

// ============================================================================
// Sub-components
// ============================================================================

interface OTPSlotProps {
  state: OTPSlotState;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  hasError: boolean;
  onClick: () => void;
}

function OTPSlot({ state, isFirst, isLast, hasError, onClick }: OTPSlotProps): React.ReactElement {
  const { char, isActive, hasFakeCaret } = state;

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      style={styles.slot(isActive, hasError, isFirst, isLast)}
      onClick={onClick}
    >
      {char}
      {hasFakeCaret && (
        <div style={styles.caret}>
          <div style={styles.caretBlink} />
        </div>
      )}
    </div>
  );
}

function OTPSeparator(): React.ReactElement {
  return (
    <div data-slot="input-otp-separator" role="separator" style={styles.separator}>
      <div style={styles.separatorIcon} />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function OTP({ block, data }: LiquidComponentProps): React.ReactElement {
  const { signalActions } = useLiquidContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  // Configuration
  const length = (block.props?.length as OTPLength) || 6;
  const label = block.label;
  const emitSignal = block.signals?.emit;
  const inputId = generateId('otp');

  // Inject caret animation
  useEffect(() => {
    injectCaretAnimation();
  }, []);

  // Slot states
  const slotStates = getSlotStates(value, isFocused ? activeIndex : -1, length);

  // Determine if we should show separator (split in middle for 6-digit codes)
  const showSeparator = length === 6;
  const separatorIndex = Math.floor(length / 2);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace(/[^0-9]/g, '').slice(0, length);
    setValue(newValue);
    setActiveIndex(Math.min(newValue.length, length - 1));

    // Emit signal when value changes
    if (emitSignal?.name) {
      signalActions.emit(emitSignal.name, newValue);
    }

    // Auto-submit when complete
    if (newValue.length === length && block.signals?.emit?.name) {
      signalActions.emit(`${emitSignal?.name || 'otp'}:complete`, newValue);
    }
  }, [length, emitSignal, signalActions, block.signals?.emit?.name]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && value.length > 0) {
      setActiveIndex(Math.max(0, value.length - 1));
    } else if (e.key === 'ArrowLeft') {
      setActiveIndex(Math.max(0, activeIndex - 1));
    } else if (e.key === 'ArrowRight') {
      setActiveIndex(Math.min(length - 1, activeIndex + 1));
    }
  }, [value.length, activeIndex, length]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setActiveIndex(Math.min(value.length, length - 1));
  }, [value.length, length]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleSlotClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  // Render slots with optional separator
  const renderSlots = () => {
    const slots: React.ReactElement[] = [];

    if (showSeparator) {
      // First group
      const firstGroup = (
        <div key="group-1" data-slot="input-otp-group" style={styles.group}>
          {slotStates.slice(0, separatorIndex).map((state, i) => (
            <OTPSlot
              key={i}
              state={state}
              index={i}
              isFirst={i === 0}
              isLast={i === separatorIndex - 1}
              hasError={false}
              onClick={handleSlotClick}
            />
          ))}
        </div>
      );
      slots.push(firstGroup);

      // Separator
      slots.push(<OTPSeparator key="separator" />);

      // Second group
      const secondGroup = (
        <div key="group-2" data-slot="input-otp-group" style={styles.group}>
          {slotStates.slice(separatorIndex).map((state, i) => (
            <OTPSlot
              key={i + separatorIndex}
              state={state}
              index={i + separatorIndex}
              isFirst={i === 0}
              isLast={i === length - separatorIndex - 1}
              hasError={false}
              onClick={handleSlotClick}
            />
          ))}
        </div>
      );
      slots.push(secondGroup);
    } else {
      // Single group
      slots.push(
        <div key="group-1" data-slot="input-otp-group" style={styles.group}>
          {slotStates.map((state, i) => (
            <OTPSlot
              key={i}
              state={state}
              index={i}
              isFirst={i === 0}
              isLast={i === length - 1}
              hasError={false}
              onClick={handleSlotClick}
            />
          ))}
        </div>
      );
    }

    return slots;
  };

  return (
    <div data-liquid-type="otp" style={styles.wrapper}>
      {label && (
        <label htmlFor={inputId} style={styles.label}>
          {label}
        </label>
      )}
      <div data-slot="input-otp" style={styles.container}>
        {renderSlots()}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={length}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={styles.hiddenInput}
          aria-label={label || 'One-time password'}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Static Component
// ============================================================================

export interface StaticOTPProps {
  /** Current OTP value */
  value?: string;
  /** Callback when value changes */
  onChange?: (value: string) => void;
  /** Callback when OTP is complete */
  onComplete?: (value: string) => void;
  /** Number of OTP digits (4-8) */
  length?: OTPLength;
  /** Label text */
  label?: string;
  /** Error message */
  error?: string;
  /** Hint text */
  hint?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Custom wrapper style */
  style?: React.CSSProperties;
}

export function StaticOTP({
  value: controlledValue,
  onChange,
  onComplete,
  length = 6,
  label,
  error,
  hint,
  disabled = false,
  style: customStyle,
}: StaticOTPProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalValue, setInternalValue] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  // Controlled vs uncontrolled
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const inputId = generateId('otp');
  const hasError = Boolean(error);

  // Inject caret animation
  useEffect(() => {
    injectCaretAnimation();
  }, []);

  // Slot states
  const slotStates = getSlotStates(value, isFocused && !disabled ? activeIndex : -1, length);

  // Determine if we should show separator
  const showSeparator = length === 6;
  const separatorIndex = Math.floor(length / 2);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    const newValue = e.target.value.replace(/[^0-9]/g, '').slice(0, length);

    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }

    setActiveIndex(Math.min(newValue.length, length - 1));
    onChange?.(newValue);

    // Auto-complete callback
    if (newValue.length === length) {
      onComplete?.(newValue);
    }
  }, [length, controlledValue, onChange, onComplete, disabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace' && value.length > 0) {
      setActiveIndex(Math.max(0, value.length - 1));
    } else if (e.key === 'ArrowLeft') {
      setActiveIndex(Math.max(0, activeIndex - 1));
    } else if (e.key === 'ArrowRight') {
      setActiveIndex(Math.min(length - 1, activeIndex + 1));
    }
  }, [value.length, activeIndex, length, disabled]);

  const handleFocus = useCallback(() => {
    if (disabled) return;
    setIsFocused(true);
    setActiveIndex(Math.min(value.length, length - 1));
  }, [value.length, length, disabled]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleSlotClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  // Render slots with optional separator
  const renderSlots = () => {
    const slots: React.ReactElement[] = [];

    if (showSeparator) {
      // First group
      const firstGroup = (
        <div key="group-1" data-slot="input-otp-group" style={styles.group}>
          {slotStates.slice(0, separatorIndex).map((state, i) => (
            <OTPSlot
              key={i}
              state={state}
              index={i}
              isFirst={i === 0}
              isLast={i === separatorIndex - 1}
              hasError={hasError}
              onClick={handleSlotClick}
            />
          ))}
        </div>
      );
      slots.push(firstGroup);

      // Separator
      slots.push(<OTPSeparator key="separator" />);

      // Second group
      const secondGroup = (
        <div key="group-2" data-slot="input-otp-group" style={styles.group}>
          {slotStates.slice(separatorIndex).map((state, i) => (
            <OTPSlot
              key={i + separatorIndex}
              state={state}
              index={i + separatorIndex}
              isFirst={i === 0}
              isLast={i === length - separatorIndex - 1}
              hasError={hasError}
              onClick={handleSlotClick}
            />
          ))}
        </div>
      );
      slots.push(secondGroup);
    } else {
      // Single group
      slots.push(
        <div key="group-1" data-slot="input-otp-group" style={styles.group}>
          {slotStates.map((state, i) => (
            <OTPSlot
              key={i}
              state={state}
              index={i}
              isFirst={i === 0}
              isLast={i === length - 1}
              hasError={hasError}
              onClick={handleSlotClick}
            />
          ))}
        </div>
      );
    }

    return slots;
  };

  const wrapperStyle = mergeStyles(
    styles.wrapper,
    disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {},
    customStyle
  );

  return (
    <div data-liquid-type="otp" style={wrapperStyle}>
      {label && (
        <label htmlFor={inputId} style={styles.label}>
          {label}
        </label>
      )}
      <div data-slot="input-otp" style={styles.container}>
        {renderSlots()}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={length}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          style={styles.hiddenInput}
          aria-label={label || 'One-time password'}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
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

export default OTP;
