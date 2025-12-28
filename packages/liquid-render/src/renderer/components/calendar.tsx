// Calendar Component - Full calendar view with month navigation
// DSL: Ca :binding "Label" or Ca :selectedDate

import React, { useState, useCallback, useMemo } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, mergeStyles, generateId, formatDisplayValue, fieldToLabel } from './utils';
import { resolveBinding } from '../data-context';
import { useLiquidContext } from '../LiquidUI';

// ============================================================================
// Types
// ============================================================================

interface CalendarDate {
  year: number;
  month: number; // 0-11
  day: number;   // 1-31
}

type SelectionMode = 'single' | 'multiple' | 'range';

interface DateRange {
  start: CalendarDate | null;
  end: CalendarDate | null;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.sm,
    width: 'fit-content',
  } as React.CSSProperties,

  label: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
  } as React.CSSProperties,

  container: {
    backgroundColor: tokens.colors.background,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    boxShadow: tokens.shadow.sm,
  } as React.CSSProperties,

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.sm,
  } as React.CSSProperties,

  navButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2rem',
    height: '2rem',
    padding: 0,
    border: 'none',
    borderRadius: tokens.radius.md,
    backgroundColor: 'transparent',
    color: tokens.colors.foreground,
    cursor: 'pointer',
    transition: `all ${tokens.transition.fast}`,
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
  } as React.CSSProperties,

  navButtonHover: {
    backgroundColor: tokens.colors.accent,
  } as React.CSSProperties,

  monthYearLabel: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.foreground,
    userSelect: 'none',
  } as React.CSSProperties,

  weekdaysRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 2rem)',
    gap: tokens.spacing.xs,
    marginBottom: tokens.spacing.xs,
  } as React.CSSProperties,

  weekday: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '2rem',
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.mutedForeground,
    userSelect: 'none',
  } as React.CSSProperties,

  daysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 2rem)',
    gap: tokens.spacing.xs,
  } as React.CSSProperties,

  dayCell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2rem',
    height: '2rem',
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.normal,
    color: tokens.colors.foreground,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: tokens.radius.md,
    cursor: 'pointer',
    transition: `all ${tokens.transition.fast}`,
    userSelect: 'none',
  } as React.CSSProperties,

  dayCellHover: {
    backgroundColor: tokens.colors.accent,
  } as React.CSSProperties,

  dayCellOutside: {
    color: tokens.colors.mutedForeground,
    opacity: 0.5,
  } as React.CSSProperties,

  dayCellToday: {
    backgroundColor: tokens.colors.accent,
    fontWeight: tokens.fontWeight.medium,
  } as React.CSSProperties,

  dayCellSelected: {
    backgroundColor: tokens.colors.primary,
    color: tokens.colors.primaryForeground,
    fontWeight: tokens.fontWeight.medium,
  } as React.CSSProperties,

  dayCellRangeMiddle: {
    backgroundColor: tokens.colors.accent,
    borderRadius: 0,
  } as React.CSSProperties,

  dayCellRangeStart: {
    backgroundColor: tokens.colors.primary,
    color: tokens.colors.primaryForeground,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  } as React.CSSProperties,

  dayCellRangeEnd: {
    backgroundColor: tokens.colors.primary,
    color: tokens.colors.primaryForeground,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  } as React.CSSProperties,

  dayCellDisabled: {
    color: tokens.colors.mutedForeground,
    opacity: 0.5,
    cursor: 'not-allowed',
  } as React.CSSProperties,

  displayValue: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.mutedForeground,
    marginTop: tokens.spacing.xs,
  } as React.CSSProperties,

  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.lg,
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Get the number of days in a month
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get the day of week for the first day of a month (0 = Sunday)
 */
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/**
 * Check if two dates are the same day
 */
function isSameDay(a: CalendarDate | null, b: CalendarDate | null): boolean {
  if (!a || !b) return false;
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

/**
 * Check if a date is today
 */
function isToday(date: CalendarDate): boolean {
  const today = new Date();
  return date.year === today.getFullYear() &&
         date.month === today.getMonth() &&
         date.day === today.getDate();
}

/**
 * Compare two dates: -1 if a < b, 0 if equal, 1 if a > b
 */
function compareDates(a: CalendarDate, b: CalendarDate): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

/**
 * Check if a date is within a range
 */
function isInRange(date: CalendarDate, range: DateRange): boolean {
  if (!range.start || !range.end) return false;
  const dateValue = compareDates(date, range.start);
  const dateEnd = compareDates(date, range.end);
  return dateValue >= 0 && dateEnd <= 0;
}

/**
 * Parse date from binding value to CalendarDate
 */
function parseDate(value: unknown): CalendarDate | null {
  if (!value) return null;

  // Handle Date object
  if (value instanceof Date && !isNaN(value.getTime())) {
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

  return null;
}

/**
 * Parse date range from binding value
 */
function parseDateRange(value: unknown): DateRange {
  if (value && typeof value === 'object') {
    const obj = value as { start?: unknown; end?: unknown };
    return {
      start: parseDate(obj.start),
      end: parseDate(obj.end),
    };
  }
  return { start: null, end: null };
}

/**
 * Parse multiple dates from binding value
 */
function parseMultipleDates(value: unknown): CalendarDate[] {
  if (Array.isArray(value)) {
    return value.map(parseDate).filter((d): d is CalendarDate => d !== null);
  }
  const single = parseDate(value);
  return single ? [single] : [];
}

/**
 * Format CalendarDate to ISO string (YYYY-MM-DD)
 */
function formatDateToISO(date: CalendarDate): string {
  const year = date.year;
  const month = String(date.month + 1).padStart(2, '0');
  const day = String(date.day).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format CalendarDate for locale display
 */
function formatDateForDisplay(date: CalendarDate | null): string {
  if (!date) return '';
  const d = new Date(date.year, date.month, date.day);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get calendar grid data for a month
 */
function getCalendarGrid(year: number, month: number): (CalendarDate | null)[] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Previous month days
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

  const grid: (CalendarDate | null)[] = [];

  // Add days from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    grid.push({
      year: prevYear,
      month: prevMonth,
      day: daysInPrevMonth - i,
    });
  }

  // Add days from current month
  for (let day = 1; day <= daysInMonth; day++) {
    grid.push({ year, month, day });
  }

  // Add days from next month to fill the grid (6 rows x 7 days = 42)
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const remaining = 42 - grid.length;

  for (let day = 1; day <= remaining; day++) {
    grid.push({
      year: nextYear,
      month: nextMonth,
      day,
    });
  }

  return grid;
}

// ============================================================================
// Sub-components
// ============================================================================

interface DayCellProps {
  date: CalendarDate;
  currentMonth: number;
  isSelected: boolean;
  isToday: boolean;
  isRangeStart?: boolean;
  isRangeEnd?: boolean;
  isInRange?: boolean;
  isDisabled?: boolean;
  onClick: (date: CalendarDate) => void;
}

function DayCell({
  date,
  currentMonth,
  isSelected,
  isToday: isTodayDate,
  isRangeStart,
  isRangeEnd,
  isInRange: isInRangeDate,
  isDisabled,
  onClick,
}: DayCellProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);
  const isOutside = date.month !== currentMonth;

  const cellStyle = useMemo(() => {
    let style = { ...styles.dayCell };

    if (isDisabled) {
      return mergeStyles(style, styles.dayCellDisabled);
    }

    if (isOutside) {
      style = mergeStyles(style, styles.dayCellOutside);
    }

    if (isTodayDate && !isSelected && !isRangeStart && !isRangeEnd) {
      style = mergeStyles(style, styles.dayCellToday);
    }

    if (isRangeStart) {
      style = mergeStyles(style, styles.dayCellRangeStart);
    } else if (isRangeEnd) {
      style = mergeStyles(style, styles.dayCellRangeEnd);
    } else if (isInRangeDate) {
      style = mergeStyles(style, styles.dayCellRangeMiddle);
    } else if (isSelected) {
      style = mergeStyles(style, styles.dayCellSelected);
    }

    if (isHovered && !isSelected && !isRangeStart && !isRangeEnd && !isDisabled) {
      style = mergeStyles(style, styles.dayCellHover);
    }

    return style;
  }, [isOutside, isTodayDate, isSelected, isRangeStart, isRangeEnd, isInRangeDate, isHovered, isDisabled]);

  const handleClick = useCallback(() => {
    if (!isDisabled) {
      onClick(date);
    }
  }, [date, isDisabled, onClick]);

  return (
    <button
      type="button"
      style={cellStyle}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isDisabled}
      aria-label={formatDateForDisplay(date)}
      aria-selected={isSelected || isRangeStart || isRangeEnd}
      aria-current={isTodayDate ? 'date' : undefined}
    >
      {date.day}
    </button>
  );
}

interface NavButtonProps {
  direction: 'prev' | 'next';
  onClick: () => void;
  ariaLabel: string;
}

function NavButton({ direction, onClick, ariaLabel }: NavButtonProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      style={mergeStyles(styles.navButton, isHovered ? styles.navButtonHover : undefined)}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={ariaLabel}
    >
      {direction === 'prev' ? '\u2039' : '\u203A'}
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Calendar({ block, data }: LiquidComponentProps): React.ReactElement {
  const { signalActions } = useLiquidContext();

  // Determine selection mode from block config (via props or default to single)
  const mode: SelectionMode = (block.props?.mode as SelectionMode) || 'single';

  // Parse initial values based on mode
  const boundValue = resolveBinding(block.binding, data);

  const initialSelected = useMemo(() => {
    if (mode === 'range') {
      return parseDateRange(boundValue);
    } else if (mode === 'multiple') {
      return parseMultipleDates(boundValue);
    } else {
      const date = parseDate(boundValue);
      return date ? [date] : [];
    }
  }, [boundValue, mode]);

  // State
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(() => {
    if (mode === 'range' && (initialSelected as DateRange).start) {
      return (initialSelected as DateRange).start!.month;
    } else if (Array.isArray(initialSelected) && initialSelected.length > 0 && initialSelected[0]) {
      return initialSelected[0].month;
    }
    return today.getMonth();
  });

  const [viewYear, setViewYear] = useState(() => {
    if (mode === 'range' && (initialSelected as DateRange).start) {
      return (initialSelected as DateRange).start!.year;
    } else if (Array.isArray(initialSelected) && initialSelected.length > 0 && initialSelected[0]) {
      return initialSelected[0].year;
    }
    return today.getFullYear();
  });

  const [selectedDates, setSelectedDates] = useState<CalendarDate[]>(
    Array.isArray(initialSelected) ? initialSelected : []
  );

  const [dateRange, setDateRange] = useState<DateRange>(
    mode === 'range' ? (initialSelected as DateRange) : { start: null, end: null }
  );

  const label = block.label;
  const emitSignal = block.signals?.emit;
  const labelId = generateId('calendar-label');

  // Calendar grid
  const calendarGrid = useMemo(() => getCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  // Navigation handlers
  const goToPreviousMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  }, [viewMonth]);

  const goToNextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  }, [viewMonth]);

  // Emit signal helper
  const emitChange = useCallback((value: unknown) => {
    if (emitSignal?.name) {
      if (typeof value === 'object') {
        signalActions.emit(emitSignal.name, JSON.stringify(value));
      } else {
        signalActions.emit(emitSignal.name, String(value));
      }
    }
  }, [emitSignal, signalActions]);

  // Date selection handler
  const handleDateClick = useCallback((date: CalendarDate) => {
    if (mode === 'single') {
      setSelectedDates([date]);
      emitChange(formatDateToISO(date));
    } else if (mode === 'multiple') {
      setSelectedDates(prev => {
        const exists = prev.some(d => isSameDay(d, date));
        const newDates = exists
          ? prev.filter(d => !isSameDay(d, date))
          : [...prev, date];
        emitChange(newDates.map(formatDateToISO));
        return newDates;
      });
    } else if (mode === 'range') {
      setDateRange(prev => {
        if (!prev.start || (prev.start && prev.end)) {
          // Start new range
          const newRange = { start: date, end: null };
          emitChange({ start: formatDateToISO(date), end: null });
          return newRange;
        } else {
          // Complete range
          const newRange = compareDates(date, prev.start) >= 0
            ? { start: prev.start, end: date }
            : { start: date, end: prev.start };
          emitChange({
            start: formatDateToISO(newRange.start!),
            end: formatDateToISO(newRange.end!),
          });
          return newRange;
        }
      });
    }
  }, [mode, emitChange]);

  // Check if a date is selected
  const isDateSelected = useCallback((date: CalendarDate): boolean => {
    if (mode === 'range') {
      return isSameDay(date, dateRange.start) || isSameDay(date, dateRange.end);
    }
    return selectedDates.some(d => isSameDay(d, date));
  }, [mode, selectedDates, dateRange]);

  return (
    <div style={styles.wrapper} data-liquid-type="calendar">
      {label && (
        <label id={labelId} style={styles.label}>
          {label}
        </label>
      )}

      <div style={styles.container} role="application" aria-labelledby={labelId}>
        {/* Header with navigation */}
        <div style={styles.header}>
          <NavButton
            direction="prev"
            onClick={goToPreviousMonth}
            ariaLabel="Previous month"
          />
          <span style={styles.monthYearLabel}>
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <NavButton
            direction="next"
            onClick={goToNextMonth}
            ariaLabel="Next month"
          />
        </div>

        {/* Weekday headers */}
        <div style={styles.weekdaysRow} role="row">
          {WEEKDAYS.map(day => (
            <div key={day} style={styles.weekday} role="columnheader">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div style={styles.daysGrid} role="grid">
          {calendarGrid.map((date, index) => (
            date && (
              <DayCell
                key={`${date.year}-${date.month}-${date.day}-${index}`}
                date={date}
                currentMonth={viewMonth}
                isSelected={isDateSelected(date)}
                isToday={isToday(date)}
                isRangeStart={mode === 'range' && isSameDay(date, dateRange.start)}
                isRangeEnd={mode === 'range' && isSameDay(date, dateRange.end)}
                isInRange={mode === 'range' && isInRange(date, dateRange)}
                onClick={handleDateClick}
              />
            )
          ))}
        </div>
      </div>

      {/* Display selected value */}
      {mode === 'single' && selectedDates.length > 0 && selectedDates[0] && (
        <div style={styles.displayValue}>
          Selected: {formatDateForDisplay(selectedDates[0])}
        </div>
      )}
      {mode === 'range' && dateRange.start && (
        <div style={styles.displayValue}>
          {dateRange.end
            ? `${formatDateForDisplay(dateRange.start)} - ${formatDateForDisplay(dateRange.end)}`
            : `From: ${formatDateForDisplay(dateRange.start)}`
          }
        </div>
      )}
      {mode === 'multiple' && selectedDates.length > 0 && (
        <div style={styles.displayValue}>
          {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Static Component (Standalone)
// ============================================================================

export interface StaticCalendarProps {
  label?: string;
  value?: Date | string | CalendarDate | CalendarDate[] | DateRange;
  onChange?: (value: string | string[] | { start: string; end: string }) => void;
  mode?: SelectionMode;
  minDate?: Date | string | CalendarDate;
  maxDate?: Date | string | CalendarDate;
  disabledDates?: (Date | string | CalendarDate)[];
  wrapperStyle?: React.CSSProperties;
}

export function StaticCalendar({
  label,
  value,
  onChange,
  mode = 'single',
  minDate,
  maxDate,
  disabledDates = [],
  wrapperStyle,
}: StaticCalendarProps): React.ReactElement {
  // Parse initial values
  const initialSelected = useMemo(() => {
    if (mode === 'range' && value && typeof value === 'object' && 'start' in value) {
      return parseDateRange(value);
    } else if (mode === 'multiple' && Array.isArray(value)) {
      return parseMultipleDates(value);
    } else {
      const date = parseDate(value);
      return date ? [date] : [];
    }
  }, [value, mode]);

  // Parse constraints
  const parsedMinDate = useMemo(() => parseDate(minDate), [minDate]);
  const parsedMaxDate = useMemo(() => parseDate(maxDate), [maxDate]);
  const parsedDisabledDates = useMemo(
    () => disabledDates.map(parseDate).filter((d): d is CalendarDate => d !== null),
    [disabledDates]
  );

  // State
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(() => {
    if (mode === 'range' && (initialSelected as DateRange).start) {
      return (initialSelected as DateRange).start!.month;
    } else if (Array.isArray(initialSelected) && initialSelected.length > 0 && initialSelected[0]) {
      return initialSelected[0].month;
    }
    return today.getMonth();
  });

  const [viewYear, setViewYear] = useState(() => {
    if (mode === 'range' && (initialSelected as DateRange).start) {
      return (initialSelected as DateRange).start!.year;
    } else if (Array.isArray(initialSelected) && initialSelected.length > 0 && initialSelected[0]) {
      return initialSelected[0].year;
    }
    return today.getFullYear();
  });

  const [selectedDates, setSelectedDates] = useState<CalendarDate[]>(
    Array.isArray(initialSelected) ? initialSelected : []
  );

  const [dateRange, setDateRange] = useState<DateRange>(
    mode === 'range' ? (initialSelected as DateRange) : { start: null, end: null }
  );

  const labelId = generateId('calendar-label');

  // Calendar grid
  const calendarGrid = useMemo(() => getCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  // Check if date is disabled
  const isDateDisabled = useCallback((date: CalendarDate): boolean => {
    // Check min/max constraints
    if (parsedMinDate && compareDates(date, parsedMinDate) < 0) return true;
    if (parsedMaxDate && compareDates(date, parsedMaxDate) > 0) return true;

    // Check disabled dates
    return parsedDisabledDates.some(d => isSameDay(d, date));
  }, [parsedMinDate, parsedMaxDate, parsedDisabledDates]);

  // Navigation handlers
  const goToPreviousMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  }, [viewMonth]);

  const goToNextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  }, [viewMonth]);

  // Date selection handler
  const handleDateClick = useCallback((date: CalendarDate) => {
    if (isDateDisabled(date)) return;

    if (mode === 'single') {
      setSelectedDates([date]);
      onChange?.(formatDateToISO(date));
    } else if (mode === 'multiple') {
      setSelectedDates(prev => {
        const exists = prev.some(d => isSameDay(d, date));
        const newDates = exists
          ? prev.filter(d => !isSameDay(d, date))
          : [...prev, date];
        onChange?.(newDates.map(formatDateToISO));
        return newDates;
      });
    } else if (mode === 'range') {
      setDateRange(prev => {
        if (!prev.start || (prev.start && prev.end)) {
          const newRange = { start: date, end: null };
          return newRange;
        } else {
          const newRange = compareDates(date, prev.start) >= 0
            ? { start: prev.start, end: date }
            : { start: date, end: prev.start };
          onChange?.({
            start: formatDateToISO(newRange.start!),
            end: formatDateToISO(newRange.end!),
          });
          return newRange;
        }
      });
    }
  }, [mode, onChange, isDateDisabled]);

  // Check if a date is selected
  const isDateSelected = useCallback((date: CalendarDate): boolean => {
    if (mode === 'range') {
      return isSameDay(date, dateRange.start) || isSameDay(date, dateRange.end);
    }
    return selectedDates.some(d => isSameDay(d, date));
  }, [mode, selectedDates, dateRange]);

  return (
    <div style={mergeStyles(styles.wrapper, wrapperStyle)} data-liquid-type="calendar">
      {label && (
        <label id={labelId} style={styles.label}>
          {label}
        </label>
      )}

      <div style={styles.container} role="application" aria-labelledby={labelId}>
        {/* Header with navigation */}
        <div style={styles.header}>
          <NavButton
            direction="prev"
            onClick={goToPreviousMonth}
            ariaLabel="Previous month"
          />
          <span style={styles.monthYearLabel}>
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <NavButton
            direction="next"
            onClick={goToNextMonth}
            ariaLabel="Next month"
          />
        </div>

        {/* Weekday headers */}
        <div style={styles.weekdaysRow} role="row">
          {WEEKDAYS.map(day => (
            <div key={day} style={styles.weekday} role="columnheader">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div style={styles.daysGrid} role="grid">
          {calendarGrid.map((date, index) => (
            date && (
              <DayCell
                key={`${date.year}-${date.month}-${date.day}-${index}`}
                date={date}
                currentMonth={viewMonth}
                isSelected={isDateSelected(date)}
                isToday={isToday(date)}
                isRangeStart={mode === 'range' && isSameDay(date, dateRange.start)}
                isRangeEnd={mode === 'range' && isSameDay(date, dateRange.end)}
                isInRange={mode === 'range' && isInRange(date, dateRange)}
                isDisabled={isDateDisabled(date)}
                onClick={handleDateClick}
              />
            )
          ))}
        </div>
      </div>

      {/* Display selected value */}
      {mode === 'single' && selectedDates.length > 0 && selectedDates[0] && (
        <div style={styles.displayValue}>
          Selected: {formatDateForDisplay(selectedDates[0])}
        </div>
      )}
      {mode === 'range' && dateRange.start && (
        <div style={styles.displayValue}>
          {dateRange.end
            ? `${formatDateForDisplay(dateRange.start)} - ${formatDateForDisplay(dateRange.end)}`
            : `From: ${formatDateForDisplay(dateRange.start)}`
          }
        </div>
      )}
      {mode === 'multiple' && selectedDates.length > 0 && (
        <div style={styles.displayValue}>
          {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
}

export default Calendar;
