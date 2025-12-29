// Time Component - Time picker with 12h/24h support
// DSL: Tm :binding "Label" or Tm :selectedTime

import React, { useState, useCallback } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, inputStyles, mergeStyles, generateId, buttonStyles } from './utils';
import { resolveBinding } from '../data-context';
import { useLiquidContext } from '../LiquidUI';

// ============================================================================
// Types
// ============================================================================

interface TimeValue {
  hours: number;   // 0-23 (internal always 24h)
  minutes: number; // 0-59
  seconds: number; // 0-59
}

type TimeFormat = '12h' | '24h';
type Period = 'AM' | 'PM';

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.sm,
  } as React.CSSProperties,

  label: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
  } as React.CSSProperties,

  inputsWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  } as React.CSSProperties,

  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  } as React.CSSProperties,

  spinButton: mergeStyles(buttonStyles('ghost', 'sm'), {
    width: '2rem',
    height: '1.5rem',
    padding: 0,
    minWidth: 'unset',
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),

  numberInput: mergeStyles(inputStyles(), {
    width: '3rem',
    textAlign: 'center',
    padding: `${tokens.spacing.xs} ${tokens.spacing.xs}`,
    fontSize: tokens.fontSize.base,
    fontVariantNumeric: 'tabular-nums',
  }),

  separator: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.foreground,
    userSelect: 'none',
    padding: `0 ${tokens.spacing.xs}`,
  } as React.CSSProperties,

  periodWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginLeft: tokens.spacing.sm,
  } as React.CSSProperties,

  periodButton: mergeStyles(buttonStyles('outline', 'sm'), {
    width: '2.5rem',
    height: '1.75rem',
    padding: 0,
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.medium,
  }),

  periodButtonActive: mergeStyles(buttonStyles('default', 'sm'), {
    width: '2.5rem',
    height: '1.75rem',
    padding: 0,
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.medium,
  }),

  nativeInput: mergeStyles(inputStyles(), {
    cursor: 'pointer',
    colorScheme: 'light dark',
    width: 'auto',
  }),
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse time from binding value to TimeValue
 */
function parseTime(value: unknown): TimeValue {
  // Default time
  const defaultTime: TimeValue = { hours: 12, minutes: 0, seconds: 0 };

  if (value === null || value === undefined) {
    return defaultTime;
  }

  // Handle Date object
  if (value instanceof Date) {
    return {
      hours: value.getHours(),
      minutes: value.getMinutes(),
      seconds: value.getSeconds(),
    };
  }

  // Handle string time format (HH:MM or HH:MM:SS)
  if (typeof value === 'string') {
    const match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
      return {
        hours: Math.min(23, Math.max(0, parseInt(match[1] ?? '0', 10))),
        minutes: Math.min(59, Math.max(0, parseInt(match[2] ?? '0', 10))),
        seconds: match[3] ? Math.min(59, Math.max(0, parseInt(match[3], 10))) : 0,
      };
    }
  }

  // Handle object with hours, minutes, seconds
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('hours' in obj || 'hour' in obj) {
      return {
        hours: Math.min(23, Math.max(0, Number(obj.hours ?? obj.hour ?? 0))),
        minutes: Math.min(59, Math.max(0, Number(obj.minutes ?? obj.minute ?? 0))),
        seconds: Math.min(59, Math.max(0, Number(obj.seconds ?? obj.second ?? 0))),
      };
    }
  }

  return defaultTime;
}

/**
 * Format TimeValue to string (HH:MM or HH:MM:SS)
 */
function formatTimeToString(time: TimeValue, includeSeconds: boolean): string {
  const hours = String(time.hours).padStart(2, '0');
  const minutes = String(time.minutes).padStart(2, '0');
  if (includeSeconds) {
    const seconds = String(time.seconds).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }
  return `${hours}:${minutes}`;
}

/**
 * Convert 24h to 12h format
 */
function to12Hour(hours24: number): { hours12: number; period: Period } {
  if (hours24 === 0) {
    return { hours12: 12, period: 'AM' };
  }
  if (hours24 === 12) {
    return { hours12: 12, period: 'PM' };
  }
  if (hours24 > 12) {
    return { hours12: hours24 - 12, period: 'PM' };
  }
  return { hours12: hours24, period: 'AM' };
}

/**
 * Convert 12h to 24h format
 */
function to24Hour(hours12: number, period: Period): number {
  if (period === 'AM') {
    return hours12 === 12 ? 0 : hours12;
  }
  return hours12 === 12 ? 12 : hours12 + 12;
}

/**
 * Pad number with leading zero
 */
function padNumber(num: number, digits: number = 2): string {
  return String(num).padStart(digits, '0');
}

/**
 * Wrap number within range
 */
function wrapNumber(value: number, min: number, max: number): number {
  if (value < min) return max;
  if (value > max) return min;
  return value;
}

// ============================================================================
// Sub-components
// ============================================================================

interface SpinFieldProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  displayValue?: string;
  valueText?: string;
}

function SpinField({
  value,
  min,
  max,
  onChange,
  label,
  displayValue,
  valueText,
}: SpinFieldProps): React.ReactElement {
  const handleIncrement = useCallback(() => {
    onChange(wrapNumber(value + 1, min, max));
  }, [value, min, max, onChange]);

  const handleDecrement = useCallback(() => {
    onChange(wrapNumber(value - 1, min, max));
  }, [value, min, max, onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue)) {
      onChange(Math.min(max, Math.max(min, newValue)));
    }
  }, [min, max, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleDecrement();
    }
  }, [handleIncrement, handleDecrement]);

  return (
    <div style={styles.fieldGroup}>
      <button
        type="button"
        onClick={handleIncrement}
        style={styles.spinButton}
        aria-label={`Increase ${label}`}
        aria-hidden="true"
        tabIndex={-1}
      >
        &#9650;
      </button>
      <input
        type="text"
        role="spinbutton"
        value={displayValue ?? padNumber(value)}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        style={styles.numberInput}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueText ?? String(value)}
        inputMode="numeric"
        maxLength={2}
      />
      <button
        type="button"
        onClick={handleDecrement}
        style={styles.spinButton}
        aria-label={`Decrease ${label}`}
        aria-hidden="true"
        tabIndex={-1}
      >
        &#9660;
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Time({ block, data }: LiquidComponentProps): React.ReactElement {
  const { signalActions } = useLiquidContext();
  const initialValue = parseTime(resolveBinding(block.binding, data));
  const [timeValue, setTimeValue] = useState<TimeValue>(initialValue);
  const props = block.props ?? {};

  const label = block.label;
  const format: TimeFormat = props.format === '24h' ? '24h' : '12h';
  const showSeconds = props.showSeconds === true;
  const emitSignal = block.signals?.emit;
  const labelId = generateId('time-label');

  const { hours12, period } = to12Hour(timeValue.hours);

  const emitChange = useCallback((newTime: TimeValue) => {
    if (emitSignal?.name) {
      signalActions.emit(emitSignal.name, formatTimeToString(newTime, showSeconds));
    }
  }, [emitSignal, signalActions, showSeconds]);

  const handleHoursChange = useCallback((newHours: number) => {
    let hours24: number;
    if (format === '24h') {
      hours24 = newHours;
    } else {
      hours24 = to24Hour(newHours, period);
    }
    const newTime = { ...timeValue, hours: hours24 };
    setTimeValue(newTime);
    emitChange(newTime);
  }, [format, period, timeValue, emitChange]);

  const handleMinutesChange = useCallback((minutes: number) => {
    const newTime = { ...timeValue, minutes };
    setTimeValue(newTime);
    emitChange(newTime);
  }, [timeValue, emitChange]);

  const handleSecondsChange = useCallback((seconds: number) => {
    const newTime = { ...timeValue, seconds };
    setTimeValue(newTime);
    emitChange(newTime);
  }, [timeValue, emitChange]);

  const handlePeriodChange = useCallback((newPeriod: Period) => {
    if (newPeriod !== period) {
      const hours24 = to24Hour(hours12, newPeriod);
      const newTime = { ...timeValue, hours: hours24 };
      setTimeValue(newTime);
      emitChange(newTime);
    }
  }, [hours12, period, timeValue, emitChange]);

  return (
    <div style={styles.wrapper} data-liquid-type="time">
      {label && (
        <label id={labelId} style={styles.label}>
          {label}
        </label>
      )}

      <div
        style={styles.inputsWrapper}
        role="group"
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : 'Time picker'}
      >
        {/* Hours */}
        <SpinField
          value={format === '24h' ? timeValue.hours : hours12}
          min={format === '24h' ? 0 : 1}
          max={format === '24h' ? 23 : 12}
          onChange={handleHoursChange}
          label="Hours"
          displayValue={format === '24h' ? padNumber(timeValue.hours) : padNumber(hours12)}
          valueText={format === '24h' ? `${timeValue.hours} hours` : `${hours12} hours`}
        />

        <span style={styles.separator} aria-hidden="true">:</span>

        {/* Minutes */}
        <SpinField
          value={timeValue.minutes}
          min={0}
          max={59}
          onChange={handleMinutesChange}
          label="Minutes"
          valueText={`${timeValue.minutes} minutes`}
        />

        {/* Seconds (optional) */}
        {showSeconds && (
          <>
            <span style={styles.separator} aria-hidden="true">:</span>
            <SpinField
              value={timeValue.seconds}
              min={0}
              max={59}
              onChange={handleSecondsChange}
              label="Seconds"
              valueText={`${timeValue.seconds} seconds`}
            />
          </>
        )}

        {/* AM/PM selector for 12h format */}
        {format === '12h' && (
          <div style={styles.periodWrapper} role="radiogroup" aria-label="Time period">
            <button
              type="button"
              role="radio"
              onClick={() => handlePeriodChange('AM')}
              style={period === 'AM' ? styles.periodButtonActive : styles.periodButton}
              aria-checked={period === 'AM'}
            >
              AM
            </button>
            <button
              type="button"
              role="radio"
              onClick={() => handlePeriodChange('PM')}
              style={period === 'PM' ? styles.periodButtonActive : styles.periodButton}
              aria-checked={period === 'PM'}
            >
              PM
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Native Time Input Component (Alternative)
// ============================================================================

export function NativeTimePicker({ block, data }: LiquidComponentProps): React.ReactElement {
  const { signalActions } = useLiquidContext();
  const initialValue = parseTime(resolveBinding(block.binding, data));
  const [timeValue, setTimeValue] = useState<string>(formatTimeToString(initialValue, false));

  const label = block.label;
  const emitSignal = block.signals?.emit;
  const labelId = generateId('time-label');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTimeValue(value);
    if (emitSignal?.name) {
      signalActions.emit(emitSignal.name, value);
    }
  }, [emitSignal, signalActions]);

  return (
    <div style={styles.wrapper} data-liquid-type="time">
      {label && (
        <label id={labelId} style={styles.label}>
          {label}
        </label>
      )}

      <input
        type="time"
        value={timeValue}
        onChange={handleChange}
        style={styles.nativeInput}
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : 'Time'}
      />
    </div>
  );
}

// ============================================================================
// Static Component (Standalone)
// ============================================================================

interface StaticTimeProps {
  label?: string;
  value?: Date | string | TimeValue;
  onChange?: (value: string) => void;
  format?: TimeFormat;
  showSeconds?: boolean;
  useNative?: boolean;
  wrapperStyle?: React.CSSProperties;
}

export function StaticTime({
  label,
  value,
  onChange,
  format = '12h',
  showSeconds = false,
  useNative = false,
  wrapperStyle,
}: StaticTimeProps): React.ReactElement {
  const initialValue = parseTime(value);
  const [timeValue, setTimeValue] = useState<TimeValue>(initialValue);

  const labelId = generateId('time-label');
  const { hours12, period } = to12Hour(timeValue.hours);

  const handleChange = useCallback((newTime: TimeValue) => {
    setTimeValue(newTime);
    onChange?.(formatTimeToString(newTime, showSeconds));
  }, [onChange, showSeconds]);

  const handleHoursChange = useCallback((newHours: number) => {
    let hours24: number;
    if (format === '24h') {
      hours24 = newHours;
    } else {
      hours24 = to24Hour(newHours, period);
    }
    handleChange({ ...timeValue, hours: hours24 });
  }, [format, period, timeValue, handleChange]);

  const handleMinutesChange = useCallback((minutes: number) => {
    handleChange({ ...timeValue, minutes });
  }, [timeValue, handleChange]);

  const handleSecondsChange = useCallback((seconds: number) => {
    handleChange({ ...timeValue, seconds });
  }, [timeValue, handleChange]);

  const handlePeriodChange = useCallback((newPeriod: Period) => {
    if (newPeriod !== period) {
      const hours24 = to24Hour(hours12, newPeriod);
      handleChange({ ...timeValue, hours: hours24 });
    }
  }, [hours12, period, timeValue, handleChange]);

  const handleNativeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseTime(e.target.value);
    setTimeValue(parsed);
    onChange?.(e.target.value);
  }, [onChange]);

  if (useNative) {
    return (
      <div style={mergeStyles(styles.wrapper, wrapperStyle)} data-liquid-type="time">
        {label && (
          <label id={labelId} style={styles.label}>
            {label}
          </label>
        )}

        <input
          type="time"
          value={formatTimeToString(timeValue, false)}
          onChange={handleNativeChange}
          style={styles.nativeInput}
          aria-labelledby={label ? labelId : undefined}
          aria-label={label ? undefined : 'Time'}
        />
      </div>
    );
  }

  return (
    <div style={mergeStyles(styles.wrapper, wrapperStyle)} data-liquid-type="time">
      {label && (
        <label id={labelId} style={styles.label}>
          {label}
        </label>
      )}

      <div
        style={styles.inputsWrapper}
        role="group"
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : 'Time picker'}
      >
        {/* Hours */}
        <SpinField
          value={format === '24h' ? timeValue.hours : hours12}
          min={format === '24h' ? 0 : 1}
          max={format === '24h' ? 23 : 12}
          onChange={handleHoursChange}
          label="Hours"
          displayValue={format === '24h' ? padNumber(timeValue.hours) : padNumber(hours12)}
          valueText={format === '24h' ? `${timeValue.hours} hours` : `${hours12} hours`}
        />

        <span style={styles.separator} aria-hidden="true">:</span>

        {/* Minutes */}
        <SpinField
          value={timeValue.minutes}
          min={0}
          max={59}
          onChange={handleMinutesChange}
          label="Minutes"
          valueText={`${timeValue.minutes} minutes`}
        />

        {/* Seconds (optional) */}
        {showSeconds && (
          <>
            <span style={styles.separator} aria-hidden="true">:</span>
            <SpinField
              value={timeValue.seconds}
              min={0}
              max={59}
              onChange={handleSecondsChange}
              label="Seconds"
              valueText={`${timeValue.seconds} seconds`}
            />
          </>
        )}

        {/* AM/PM selector for 12h format */}
        {format === '12h' && (
          <div style={styles.periodWrapper} role="radiogroup" aria-label="Time period">
            <button
              type="button"
              role="radio"
              onClick={() => handlePeriodChange('AM')}
              style={period === 'AM' ? styles.periodButtonActive : styles.periodButton}
              aria-checked={period === 'AM'}
            >
              AM
            </button>
            <button
              type="button"
              role="radio"
              onClick={() => handlePeriodChange('PM')}
              style={period === 'PM' ? styles.periodButtonActive : styles.periodButton}
              aria-checked={period === 'PM'}
            >
              PM
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Time;
