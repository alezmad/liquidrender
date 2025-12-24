// DataTable Component - Sortable, responsive table with auto-column detection
import React, { useState, useMemo, useCallback } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, baseStyles, mergeStyles, formatDisplayValue, fieldToLabel } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: string | null;
  direction: SortDirection;
}

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: mergeStyles(cardStyles(), {
    overflow: 'hidden',
  }),

  header: {
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    fontWeight: tokens.fontWeight.medium,
    borderBottom: `1px solid ${tokens.colors.border}`,
    fontSize: tokens.fontSize.base,
  } as React.CSSProperties,

  scrollContainer: {
    overflowX: 'auto',
  } as React.CSSProperties,

  table: mergeStyles(baseStyles(), {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: tokens.fontSize.sm,
  }),

  th: (sortable: boolean): React.CSSProperties => ({
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    textAlign: 'left',
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
    backgroundColor: tokens.colors.muted,
    borderBottom: `1px solid ${tokens.colors.border}`,
    whiteSpace: 'nowrap',
    cursor: sortable ? 'pointer' : 'default',
    userSelect: sortable ? 'none' : undefined,
    transition: `background-color ${tokens.transition.fast}`,
  }),

  thHover: {
    backgroundColor: tokens.colors.accent,
  } as React.CSSProperties,

  td: {
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    color: tokens.colors.foreground,
    borderBottom: `1px solid ${tokens.colors.border}`,
    verticalAlign: 'middle',
  } as React.CSSProperties,

  tr: (isEven: boolean): React.CSSProperties => ({
    backgroundColor: isEven ? tokens.colors.muted : 'transparent',
  }),

  empty: {
    padding: tokens.spacing['2xl'],
    textAlign: 'center',
    color: tokens.colors.mutedForeground,
  } as React.CSSProperties,

  sortIcon: (active: boolean, direction: SortDirection): React.CSSProperties => ({
    display: 'inline-flex',
    marginLeft: tokens.spacing.xs,
    opacity: active ? 1 : 0.3,
    transform: direction === 'desc' ? 'rotate(180deg)' : undefined,
    transition: `transform ${tokens.transition.fast}`,
  }),
};

// ============================================================================
// Helpers
// ============================================================================

function inferColumns(data: Record<string, unknown>[]): Column[] {
  if (data.length === 0) return [];

  const firstRow = data[0]!;
  return Object.keys(firstRow).map(key => ({
    key,
    label: fieldToLabel(key),
    sortable: true,
  }));
}

function sortData<T extends Record<string, unknown>>(
  data: T[],
  column: string | null,
  direction: SortDirection
): T[] {
  if (!column || !direction) return data;

  return [...data].sort((a, b) => {
    const aVal = a[column];
    const bVal = b[column];

    // Handle nulls/undefined
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    // Compare values
    let comparison = 0;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }

    return direction === 'desc' ? -comparison : comparison;
  });
}

// ============================================================================
// Sort Icon
// ============================================================================

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }): React.ReactElement {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      style={styles.sortIcon(active, direction)}
    >
      <path d="M7 10l5-5 5 5H7z" />
    </svg>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DataTable({ block, data: context }: LiquidComponentProps): React.ReactElement {
  const [sort, setSort] = useState<SortState>({ column: null, direction: null });
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);

  // Resolve data from binding
  const rawData = resolveBinding(block.binding, context);
  const tableData = Array.isArray(rawData) ? rawData as Record<string, unknown>[] : [];

  // Get columns (from block or inferred)
  const columns = useMemo(() => {
    if (block.columns && block.columns.length > 0) {
      return block.columns.map(key => ({
        key,
        label: fieldToLabel(key),
        sortable: true,
      }));
    }
    return inferColumns(tableData);
  }, [block.columns, tableData]);

  // Sort data
  const sortedData = useMemo(
    () => sortData(tableData, sort.column, sort.direction),
    [tableData, sort.column, sort.direction]
  );

  // Handle column sort click
  const handleSort = useCallback((column: string) => {
    setSort(prev => {
      if (prev.column !== column) {
        return { column, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column, direction: 'desc' };
      }
      return { column: null, direction: null };
    });
  }, []);

  const label = block.label;

  return (
    <div data-liquid-type="table" style={styles.wrapper}>
      {label && <div style={styles.header}>{label}</div>}

      <div style={styles.scrollContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  style={mergeStyles(
                    styles.th(col.sortable !== false),
                    hoveredColumn === col.key ? styles.thHover : {}
                  )}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  onMouseEnter={() => setHoveredColumn(col.key)}
                  onMouseLeave={() => setHoveredColumn(null)}
                >
                  {col.label}
                  {col.sortable !== false && (
                    <SortIcon
                      active={sort.column === col.key}
                      direction={sort.column === col.key ? sort.direction : null}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length > 0 ? (
              sortedData.map((row, rowIndex) => (
                <tr key={rowIndex} style={styles.tr(rowIndex % 2 === 1)}>
                  {columns.map(col => (
                    <td key={col.key} style={styles.td}>
                      {formatDisplayValue(row[col.key])}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length || 1} style={styles.empty}>
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Static Table (standalone usage)
// ============================================================================

interface StaticTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns?: Column[];
  title?: string;
  sortable?: boolean;
  striped?: boolean;
  style?: React.CSSProperties;
}

export function StaticTable<T extends Record<string, unknown>>({
  data,
  columns: propColumns,
  title,
  sortable = true,
  striped = true,
  style: customStyle,
}: StaticTableProps<T>): React.ReactElement {
  const [sort, setSort] = useState<SortState>({ column: null, direction: null });

  const columns = propColumns || inferColumns(data as Record<string, unknown>[]);
  const sortedData = sortData(data as Record<string, unknown>[], sort.column, sort.direction);

  const handleSort = (column: string) => {
    if (!sortable) return;
    setSort(prev => {
      if (prev.column !== column) return { column, direction: 'asc' };
      if (prev.direction === 'asc') return { column, direction: 'desc' };
      return { column: null, direction: null };
    });
  };

  return (
    <div style={mergeStyles(styles.wrapper, customStyle)}>
      {title && <div style={styles.header}>{title}</div>}
      <div style={styles.scrollContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  style={styles.th(sortable && col.sortable !== false)}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  {sortable && col.sortable !== false && (
                    <SortIcon
                      active={sort.column === col.key}
                      direction={sort.column === col.key ? sort.direction : null}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, i) => (
              <tr key={i} style={striped ? styles.tr(i % 2 === 1) : undefined}>
                {columns.map(col => (
                  <td key={col.key} style={styles.td}>
                    {formatDisplayValue(row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
