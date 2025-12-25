// DateRange Component - Date range picker with month/year dropdowns and presets
import React, { useState, useCallback } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, inputStyles, mergeStyles, baseStyles, generateId } from './utils';
import { resolveBinding } from '../data-context';
import { useLiquidContext } from '../LiquidUI';

// ============================================================================
// Types
// ============================================================================

interface DateRangeValue {
  start: string; // ISO date string (YYYY-MM-DD)
  end: string;   // ISO date string (YYYY-MM-DD)
}

interface PresetOption {
  label: string;
  value: string;
}

interface MonthYearSelection {
  month: number; // 0-11
  year: number;
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
    gap: tokens.spacing.sm,
  } as React.CSSProperties,

  dateInput: {
    display: 'flex',
    gap: tokens.spacing.xs,
    flex: 1,
  } as React.CSSProperties,

  separator: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.mutedForeground,
    fontWeight: tokens.fontWeight.medium,
  } as React.CSSProperties,

  selectWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: 1,
  } as React.CSSProperties,

  select: mergeStyles(inputStyles(), {
    appearance: 'none',
    paddingRight: '2rem',
    cursor: 'pointer',
    backgroundImage: 'none',
    flex: 1,
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

  presetsWrapper: {
    display: 'flex',
    gap: tokens.spacing.xs,
    flexWrap: 'wrap',
  } as React.CSSProperties,

  presetButton: {
    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
    backgroundColor: tokens.colors.secondary,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.md,
    cursor: 'pointer',
    transition: `all ${tokens.transition.fast}`,
    outline: 'none',
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
 * Parse date range from binding value
 */
function parseDateRange(value: unknown): DateRangeValue {
  if (value && typeof value === 'object' && 'start' in value && 'end' in value) {
    return {
      start: String((value as DateRangeValue).start),
      end: String((value as DateRangeValue).end),
    };
  }
  // Default to current month
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse ISO date to month/year selection
 */
function parseISOToMonthYear(isoDate: string): MonthYearSelection {
  const date = new Date(isoDate);
  return {
    month: date.getMonth(),
    year: date.getFullYear(),
  };
}

/**
 * Convert month/year selection to ISO date (first day of month)
 */
function monthYearToISO(month: number, year: number): string {
  return formatDate(new Date(year, month, 1));
}

/**
 * Convert month/year selection to last day of month
 */
function monthYearToLastDay(month: number, year: number): string {
  return formatDate(new Date(year, month + 1, 0));
}

/**
 * Calculate preset date ranges
 */
function calculatePreset(value: string): DateRangeValue | null {
  const now = new Date();
  const today = formatDate(now);

  switch (value) {
    case 'today':
      return { start: today, end: today };

    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const date = formatDate(yesterday);
      return { start: date, end: date };
    }

    case 'last7d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { start: formatDate(start), end: today };
    }

    case 'last30d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return { start: formatDate(start), end: today };
    }

    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: formatDate(start), end: today };
    }

    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: formatDate(start), end: formatDate(end) };
    }

    case 'thisYear': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start: formatDate(start), end: today };
    }

    case 'lastYear': {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      return { start: formatDate(start), end: formatDate(end) };
    }

    default:
      return null;
  }
}

/**
 * Parse preset options from block children
 */
function parsePresets(block: LiquidComponentProps['block']): PresetOption[] {
  if (!block.children || block.children.length === 0) {
    return [];
  }

  return block.children
    .filter(child => child.type === 'preset')
    .map(child => ({
      label: child.label || '',
      value: typeof child.binding?.value === 'string' ? child.binding.value : '',
    }))
    .filter(preset => preset.label && preset.value);
}

// ============================================================================
// Main Component
// ============================================================================

export function DateRange({ block, data }: LiquidComponentProps): React.ReactElement {
  const { signalActions } = useLiquidContext();
  const initialValue = parseDateRange(resolveBinding(block.binding, data));
  const [dateRange, setDateRange] = useState<DateRangeValue>(initialValue);

  const label = block.label;
  const presets = parsePresets(block);
  const emitSignal = block.signals?.emit;

  const startMonthYear = parseISOToMonthYear(dateRange.start);
  const endMonthYear = parseISOToMonthYear(dateRange.end);

  const years = generateYears();
  const labelId = generateId('daterange-label');

  const emitChange = useCallback((newRange: DateRangeValue) => {
    if (emitSignal?.name) {
      // Serialize the date range as JSON string
      signalActions.emit(emitSignal.name, JSON.stringify(newRange));
    }
  }, [emitSignal, signalActions]);

  const handleStartMonthChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = Number(e.target.value);
    const newStart = monthYearToISO(month, startMonthYear.year);
    const newRange = { start: newStart, end: dateRange.end };

    // Validate: end must be >= start
    if (new Date(newRange.end) >= new Date(newRange.start)) {
      setDateRange(newRange);
      emitChange(newRange);
    }
  }, [startMonthYear.year, dateRange.end, emitChange]);

  const handleStartYearChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = Number(e.target.value);
    const newStart = monthYearToISO(startMonthYear.month, year);
    const newRange = { start: newStart, end: dateRange.end };

    // Validate: end must be >= start
    if (new Date(newRange.end) >= new Date(newRange.start)) {
      setDateRange(newRange);
      emitChange(newRange);
    }
  }, [startMonthYear.month, dateRange.end, emitChange]);

  const handleEndMonthChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = Number(e.target.value);
    const newEnd = monthYearToLastDay(month, endMonthYear.year);
    const newRange = { start: dateRange.start, end: newEnd };

    // Validate: end must be >= start
    if (new Date(newRange.end) >= new Date(newRange.start)) {
      setDateRange(newRange);
      emitChange(newRange);
    }
  }, [endMonthYear.year, dateRange.start, emitChange]);

  const handleEndYearChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = Number(e.target.value);
    const newEnd = monthYearToLastDay(endMonthYear.month, year);
    const newRange = { start: dateRange.start, end: newEnd };

    // Validate: end must be >= start
    if (new Date(newRange.end) >= new Date(newRange.start)) {
      setDateRange(newRange);
      emitChange(newRange);
    }
  }, [endMonthYear.month, dateRange.start, emitChange]);

  const handlePresetClick = useCallback((presetValue: string) => {
    const newRange = calculatePreset(presetValue);
    if (newRange) {
      setDateRange(newRange);
      emitChange(newRange);
    }
  }, [emitChange]);

  return (
    <div style={styles.wrapper} data-liquid-type="daterange">
      {label && (
        <label id={labelId} style={styles.label}>
          {label}
        </label>
      )}

      <div style={styles.inputsWrapper} aria-labelledby={labelId}>
        {/* Start date */}
        <div style={styles.dateInput} data-testid="daterange-start">
          <div style={styles.selectWrapper}>
            <select
              value={startMonthYear.month}
              onChange={handleStartMonthChange}
              style={styles.select}
              aria-label="Start month"
            >
              {MONTHS.map((month, index) => (
                <option key={index} value={index}>
                  {month}
                </option>
              ))}
            </select>
            <span style={styles.chevron}>▼</span>
          </div>
          <div style={styles.selectWrapper}>
            <select
              value={startMonthYear.year}
              onChange={handleStartYearChange}
              style={styles.select}
              aria-label="Start year"
            >
              {years.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <span style={styles.chevron}>▼</span>
          </div>
        </div>

        <span style={styles.separator}>to</span>

        {/* End date */}
        <div style={styles.dateInput} data-testid="daterange-end">
          <div style={styles.selectWrapper}>
            <select
              value={endMonthYear.month}
              onChange={handleEndMonthChange}
              style={styles.select}
              aria-label="End month"
            >
              {MONTHS.map((month, index) => (
                <option key={index} value={index}>
                  {month}
                </option>
              ))}
            </select>
            <span style={styles.chevron}>▼</span>
          </div>
          <div style={styles.selectWrapper}>
            <select
              value={endMonthYear.year}
              onChange={handleEndYearChange}
              style={styles.select}
              aria-label="End year"
            >
              {years.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <span style={styles.chevron}>▼</span>
          </div>
        </div>
      </div>

      {/* Presets */}
      {presets.length > 0 && (
        <div style={styles.presetsWrapper} data-testid="daterange-presets">
          {presets.map((preset, index) => (
            <button
              key={`${preset.value}-${index}`}
              onClick={() => handlePresetClick(preset.value)}
              style={styles.presetButton}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Static Component (Standalone)
// ============================================================================

interface StaticDateRangeProps {
  label?: string;
  value?: DateRangeValue;
  onChange?: (value: DateRangeValue) => void;
  presets?: PresetOption[];
  wrapperStyle?: React.CSSProperties;
}

export function StaticDateRange({
  label,
  value,
  onChange,
  presets = [],
  wrapperStyle,
}: StaticDateRangeProps): React.ReactElement {
  const defaultValue = parseDateRange(value);
  const [dateRange, setDateRange] = useState<DateRangeValue>(defaultValue);

  const startMonthYear = parseISOToMonthYear(dateRange.start);
  const endMonthYear = parseISOToMonthYear(dateRange.end);

  const years = generateYears();
  const labelId = generateId('daterange-label');

  const handleChange = useCallback((newRange: DateRangeValue) => {
    setDateRange(newRange);
    onChange?.(newRange);
  }, [onChange]);

  const handleStartMonthChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = Number(e.target.value);
    const newStart = monthYearToISO(month, startMonthYear.year);
    const newRange = { start: newStart, end: dateRange.end };

    if (new Date(newRange.end) >= new Date(newRange.start)) {
      handleChange(newRange);
    }
  }, [startMonthYear.year, dateRange.end, handleChange]);

  const handleStartYearChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = Number(e.target.value);
    const newStart = monthYearToISO(startMonthYear.month, year);
    const newRange = { start: newStart, end: dateRange.end };

    if (new Date(newRange.end) >= new Date(newRange.start)) {
      handleChange(newRange);
    }
  }, [startMonthYear.month, dateRange.end, handleChange]);

  const handleEndMonthChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = Number(e.target.value);
    const newEnd = monthYearToLastDay(month, endMonthYear.year);
    const newRange = { start: dateRange.start, end: newEnd };

    if (new Date(newRange.end) >= new Date(newRange.start)) {
      handleChange(newRange);
    }
  }, [endMonthYear.year, dateRange.start, handleChange]);

  const handleEndYearChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = Number(e.target.value);
    const newEnd = monthYearToLastDay(endMonthYear.month, year);
    const newRange = { start: dateRange.start, end: newEnd };

    if (new Date(newRange.end) >= new Date(newRange.start)) {
      handleChange(newRange);
    }
  }, [endMonthYear.month, dateRange.start, handleChange]);

  const handlePresetClick = useCallback((presetValue: string) => {
    const newRange = calculatePreset(presetValue);
    if (newRange) {
      handleChange(newRange);
    }
  }, [handleChange]);

  return (
    <div style={mergeStyles(styles.wrapper, wrapperStyle)} data-liquid-type="daterange">
      {label && (
        <label id={labelId} style={styles.label}>
          {label}
        </label>
      )}

      <div style={styles.inputsWrapper} aria-labelledby={labelId}>
        <div style={styles.dateInput}>
          <div style={styles.selectWrapper}>
            <select
              value={startMonthYear.month}
              onChange={handleStartMonthChange}
              style={styles.select}
              aria-label="Start month"
            >
              {MONTHS.map((month, index) => (
                <option key={index} value={index}>
                  {month}
                </option>
              ))}
            </select>
            <span style={styles.chevron}>▼</span>
          </div>
          <div style={styles.selectWrapper}>
            <select
              value={startMonthYear.year}
              onChange={handleStartYearChange}
              style={styles.select}
              aria-label="Start year"
            >
              {years.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <span style={styles.chevron}>▼</span>
          </div>
        </div>

        <span style={styles.separator}>to</span>

        <div style={styles.dateInput}>
          <div style={styles.selectWrapper}>
            <select
              value={endMonthYear.month}
              onChange={handleEndMonthChange}
              style={styles.select}
              aria-label="End month"
            >
              {MONTHS.map((month, index) => (
                <option key={index} value={index}>
                  {month}
                </option>
              ))}
            </select>
            <span style={styles.chevron}>▼</span>
          </div>
          <div style={styles.selectWrapper}>
            <select
              value={endMonthYear.year}
              onChange={handleEndYearChange}
              style={styles.select}
              aria-label="End year"
            >
              {years.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <span style={styles.chevron}>▼</span>
          </div>
        </div>
      </div>

      {presets.length > 0 && (
        <div style={styles.presetsWrapper}>
          {presets.map((preset, index) => (
            <button
              key={`${preset.value}-${index}`}
              onClick={() => handlePresetClick(preset.value)}
              style={styles.presetButton}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default DateRange;
