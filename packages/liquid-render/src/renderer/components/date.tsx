// Date Component - Single date picker
// DSL: Dt :binding "Label" or Dt :selectedDate

import React, { useState, useCallback } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, inputStyles, mergeStyles, generateId } from './utils';
import { resolveBinding } from '../data-context';
import { useLiquidContext } from '../LiquidUI';

// ============================================================================
// Types
// ============================================================================

interface DateValue {
  year: number;
  month: number; // 0-11
  day: number;   // 1-31
}

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

  selectWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,

  select: mergeStyles(inputStyles(), {
    appearance: 'none',
    paddingRight: '2rem',
    cursor: 'pointer',
    backgroundImage: 'none',
    minWidth: '4rem',
  }),

  monthSelect: mergeStyles(inputStyles(), {
    appearance: 'none',
    paddingRight: '2rem',
    cursor: 'pointer',
    backgroundImage: 'none',
    minWidth: '7rem',
  }),

  chevron: {
    position: 'absolute',
    right: tokens.spacing.sm,
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.xs,
  } as React.CSSProperties,

  nativeInput: mergeStyles(inputStyles(), {
    cursor: 'pointer',
    colorScheme: 'light dark',
  }),

  displayValue: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.mutedForeground,
    marginTop: tokens.spacing.xs,
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Generate array of years (current - 10 to current + 10)
 */
function generateYears(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = currentYear - 10; i <= currentYear + 10; i++) {
    years.push(i);
  }
  return years;
}

/**
 * Generate array of days for a given month/year
 */
function generateDays(month: number, year: number): number[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: number[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  return days;
}

/**
 * Parse date from binding value to DateValue
 */
function parseDate(value: unknown): DateValue {
  // Handle Date object
  if (value instanceof Date) {
    return {
      year: value.getFullYear(),
      month: value.getMonth(),
      day: value.getDate(),
    };
  }

  // Handle ISO string (YYYY-MM-DD)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
      };
    }
  }

  // Handle object with year, month, day
  if (value && typeof value === 'object' && 'year' in value) {
    const obj = value as { year: number; month: number; day: number };
    return {
      year: Number(obj.year),
      month: Number(obj.month),
      day: Number(obj.day),
    };
  }

  // Default to today
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    day: now.getDate(),
  };
}

/**
 * Format DateValue to ISO string (YYYY-MM-DD)
 */
function formatDateToISO(date: DateValue): string {
  const year = date.year;
  const month = String(date.month + 1).padStart(2, '0');
  const day = String(date.day).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format DateValue for locale display
 */
function formatDateForDisplay(date: DateValue): string {
  const d = new Date(date.year, date.month, date.day);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Clamp day to valid range for month/year
 */
function clampDay(day: number, month: number, year: number): number {
  const maxDay = new Date(year, month + 1, 0).getDate();
  return Math.min(Math.max(1, day), maxDay);
}

// ============================================================================
// Main Component
// ============================================================================

export function DatePicker({ block, data }: LiquidComponentProps): React.ReactElement {
  const { signalActions } = useLiquidContext();
  const initialValue = parseDate(resolveBinding(block.binding, data));
  const [dateValue, setDateValue] = useState<DateValue>(initialValue);

  const label = block.label;
  const emitSignal = block.signals?.emit;
  const labelId = generateId('date-label');

  const years = generateYears();
  const days = generateDays(dateValue.month, dateValue.year);

  const emitChange = useCallback((newDate: DateValue) => {
    if (emitSignal?.name) {
      signalActions.emit(emitSignal.name, formatDateToISO(newDate));
    }
  }, [emitSignal, signalActions]);

  const handleMonthChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = Number(e.target.value);
    const clampedDay = clampDay(dateValue.day, month, dateValue.year);
    const newDate = { ...dateValue, month, day: clampedDay };
    setDateValue(newDate);
    emitChange(newDate);
  }, [dateValue, emitChange]);

  const handleYearChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = Number(e.target.value);
    const clampedDay = clampDay(dateValue.day, dateValue.month, year);
    const newDate = { ...dateValue, year, day: clampedDay };
    setDateValue(newDate);
    emitChange(newDate);
  }, [dateValue, emitChange]);

  const handleDayChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const day = Number(e.target.value);
    const newDate = { ...dateValue, day };
    setDateValue(newDate);
    emitChange(newDate);
  }, [dateValue, emitChange]);

  return (
    <div style={styles.wrapper} data-liquid-type="date">
      {label && (
        <label id={labelId} style={styles.label}>
          {label}
        </label>
      )}

      <div style={styles.inputsWrapper} aria-labelledby={labelId}>
        {/* Month select */}
        <div style={styles.selectWrapper}>
          <select
            value={dateValue.month}
            onChange={handleMonthChange}
            style={styles.monthSelect}
            aria-label="Month"
          >
            {MONTHS.map((month, index) => (
              <option key={index} value={index}>
                {month}
              </option>
            ))}
          </select>
          <span style={styles.chevron}>&#9660;</span>
        </div>

        {/* Day select */}
        <div style={styles.selectWrapper}>
          <select
            value={dateValue.day}
            onChange={handleDayChange}
            style={styles.select}
            aria-label="Day"
          >
            {days.map(day => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
          <span style={styles.chevron}>&#9660;</span>
        </div>

        {/* Year select */}
        <div style={styles.selectWrapper}>
          <select
            value={dateValue.year}
            onChange={handleYearChange}
            style={styles.select}
            aria-label="Year"
          >
            {years.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <span style={styles.chevron}>&#9660;</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Native Date Input Component (Alternative)
// ============================================================================

export function NativeDatePicker({ block, data }: LiquidComponentProps): React.ReactElement {
  const { signalActions } = useLiquidContext();
  const initialValue = parseDate(resolveBinding(block.binding, data));
  const [dateValue, setDateValue] = useState<string>(formatDateToISO(initialValue));

  const label = block.label;
  const emitSignal = block.signals?.emit;
  const labelId = generateId('date-label');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDateValue(value);
    if (emitSignal?.name) {
      signalActions.emit(emitSignal.name, value);
    }
  }, [emitSignal, signalActions]);

  return (
    <div style={styles.wrapper} data-liquid-type="date">
      {label && (
        <label id={labelId} style={styles.label}>
          {label}
        </label>
      )}

      <input
        type="date"
        value={dateValue}
        onChange={handleChange}
        style={styles.nativeInput}
        aria-labelledby={labelId}
      />
    </div>
  );
}

// ============================================================================
// Static Component (Standalone)
// ============================================================================

interface StaticDatePickerProps {
  label?: string;
  value?: Date | string | DateValue;
  onChange?: (value: string) => void;
  useNative?: boolean;
  wrapperStyle?: React.CSSProperties;
}

export function StaticDatePicker({
  label,
  value,
  onChange,
  useNative = false,
  wrapperStyle,
}: StaticDatePickerProps): React.ReactElement {
  const initialValue = parseDate(value);
  const [dateValue, setDateValue] = useState<DateValue>(initialValue);

  const labelId = generateId('date-label');
  const years = generateYears();
  const days = generateDays(dateValue.month, dateValue.year);

  const handleChange = useCallback((newDate: DateValue) => {
    setDateValue(newDate);
    onChange?.(formatDateToISO(newDate));
  }, [onChange]);

  const handleMonthChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = Number(e.target.value);
    const clampedDay = clampDay(dateValue.day, month, dateValue.year);
    handleChange({ ...dateValue, month, day: clampedDay });
  }, [dateValue, handleChange]);

  const handleYearChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = Number(e.target.value);
    const clampedDay = clampDay(dateValue.day, dateValue.month, year);
    handleChange({ ...dateValue, year, day: clampedDay });
  }, [dateValue, handleChange]);

  const handleDayChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const day = Number(e.target.value);
    handleChange({ ...dateValue, day });
  }, [dateValue, handleChange]);

  const handleNativeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseDate(e.target.value);
    setDateValue(parsed);
    onChange?.(e.target.value);
  }, [onChange]);

  if (useNative) {
    return (
      <div style={mergeStyles(styles.wrapper, wrapperStyle)} data-liquid-type="date">
        {label && (
          <label id={labelId} style={styles.label}>
            {label}
          </label>
        )}

        <input
          type="date"
          value={formatDateToISO(dateValue)}
          onChange={handleNativeChange}
          style={styles.nativeInput}
          aria-labelledby={labelId}
        />
      </div>
    );
  }

  return (
    <div style={mergeStyles(styles.wrapper, wrapperStyle)} data-liquid-type="date">
      {label && (
        <label id={labelId} style={styles.label}>
          {label}
        </label>
      )}

      <div style={styles.inputsWrapper} aria-labelledby={labelId}>
        {/* Month select */}
        <div style={styles.selectWrapper}>
          <select
            value={dateValue.month}
            onChange={handleMonthChange}
            style={styles.monthSelect}
            aria-label="Month"
          >
            {MONTHS.map((month, index) => (
              <option key={index} value={index}>
                {month}
              </option>
            ))}
          </select>
          <span style={styles.chevron}>&#9660;</span>
        </div>

        {/* Day select */}
        <div style={styles.selectWrapper}>
          <select
            value={dateValue.day}
            onChange={handleDayChange}
            style={styles.select}
            aria-label="Day"
          >
            {days.map(day => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
          <span style={styles.chevron}>&#9660;</span>
        </div>

        {/* Year select */}
        <div style={styles.selectWrapper}>
          <select
            value={dateValue.year}
            onChange={handleYearChange}
            style={styles.select}
            aria-label="Year"
          >
            {years.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <span style={styles.chevron}>&#9660;</span>
        </div>
      </div>
    </div>
  );
}

export default DatePicker;
