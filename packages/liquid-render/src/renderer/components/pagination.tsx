// Pagination Component - Page navigation with smart ellipsis
import React, { useCallback } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, buttonStyles, mergeStyles, baseStyles } from './utils';
import { resolveBinding } from '../data-context';
import { useLiquidContext } from '../LiquidUI';
import type { Binding } from '../../compiler/ui-emitter';

// ============================================================================
// Types
// ============================================================================

interface PageItem {
  type: 'page' | 'ellipsis';
  value: number;
}

/** Extended block props for pagination */
interface PaginationBlockProps {
  totalPages?: Binding;
  pageSize?: Binding;
  siblingCount?: number;
  showPageInfo?: boolean;
  showPageSize?: boolean;
  pageSizeOptions?: number[];
  pageSizeSignal?: string;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: mergeStyles(baseStyles(), {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  }),

  navButton: mergeStyles(buttonStyles('outline', 'sm'), {
    minWidth: '2.25rem',
    padding: `0 ${tokens.spacing.sm}`,
  }),

  navButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    pointerEvents: 'none' as const,
  },

  pageButton: mergeStyles(buttonStyles('ghost', 'sm'), {
    minWidth: '2.25rem',
    height: '2.25rem',
    padding: 0,
  }),

  pageButtonActive: mergeStyles(buttonStyles('default', 'sm'), {
    minWidth: '2.25rem',
    height: '2.25rem',
    padding: 0,
  }),

  ellipsis: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '2.25rem',
    height: '2.25rem',
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    userSelect: 'none' as const,
  },

  pageInfo: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.mutedForeground,
    marginLeft: tokens.spacing.sm,
  },

  pageSizeSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    marginLeft: tokens.spacing.md,
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.mutedForeground,
  },

  pageSizeSelect: mergeStyles(baseStyles(), {
    height: '2rem',
    padding: `0 ${tokens.spacing.sm}`,
    fontSize: tokens.fontSize.sm,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.background,
    color: tokens.colors.foreground,
    cursor: 'pointer',
    outline: 'none',
  }),

  empty: {
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    padding: tokens.spacing.sm,
  },
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Generate page items with smart ellipsis
 * Shows: first page, last page, and pages around current
 */
function generatePageItems(
  currentPage: number,
  totalPages: number,
  siblingCount: number = 1
): PageItem[] {
  // If total pages is small, show all pages
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => ({
      type: 'page' as const,
      value: i + 1,
    }));
  }

  const items: PageItem[] = [];

  // Always show first page
  items.push({ type: 'page', value: 1 });

  // Calculate range around current page
  const leftSibling = Math.max(2, currentPage - siblingCount);
  const rightSibling = Math.min(totalPages - 1, currentPage + siblingCount);

  // Add left ellipsis if needed
  if (leftSibling > 2) {
    items.push({ type: 'ellipsis', value: -1 });
  } else if (leftSibling === 2) {
    items.push({ type: 'page', value: 2 });
  }

  // Add pages around current
  for (let i = leftSibling; i <= rightSibling; i++) {
    if (i !== 1 && i !== totalPages) {
      items.push({ type: 'page', value: i });
    }
  }

  // Add right ellipsis if needed
  if (rightSibling < totalPages - 1) {
    items.push({ type: 'ellipsis', value: -2 });
  } else if (rightSibling === totalPages - 1) {
    items.push({ type: 'page', value: totalPages - 1 });
  }

  // Always show last page
  if (totalPages > 1) {
    items.push({ type: 'page', value: totalPages });
  }

  return items;
}

// ============================================================================
// Sub-components
// ============================================================================

interface NavButtonProps {
  direction: 'prev' | 'next';
  disabled: boolean;
  onClick: () => void;
}

function NavButton({ direction, disabled, onClick }: NavButtonProps): React.ReactElement {
  const style = mergeStyles(
    styles.navButton,
    disabled ? styles.navButtonDisabled : {}
  );

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={style}
      aria-label={direction === 'prev' ? 'Go to previous page' : 'Go to next page'}
    >
      {direction === 'prev' ? '\u2039' : '\u203a'}
    </button>
  );
}

interface PageButtonProps {
  page: number;
  isActive: boolean;
  onClick: () => void;
}

function PageButton({ page, isActive, onClick }: PageButtonProps): React.ReactElement {
  const style = isActive ? styles.pageButtonActive : styles.pageButton;

  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      aria-label={`Go to page ${page}`}
      aria-current={isActive ? 'page' : undefined}
    >
      {page}
    </button>
  );
}

function Ellipsis(): React.ReactElement {
  return (
    <span style={styles.ellipsis} aria-hidden="true">
      ...
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Pagination({ block, data }: LiquidComponentProps): React.ReactElement {
  const { signalActions } = useLiquidContext();

  // Get extended props from block.props
  const props = (block.props ?? {}) as PaginationBlockProps;

  // Resolve bindings
  const currentPage = Number(resolveBinding(block.binding, data)) || 1;
  const totalPages = Number(resolveBinding(props.totalPages, data)) || 1;
  const pageSize = props.pageSize ? Number(resolveBinding(props.pageSize, data)) : undefined;

  // Signal configuration for page changes
  const emitSignal = block.signals?.emit;
  const siblingCount = props.siblingCount ?? 1;
  const showPageInfo = props.showPageInfo ?? false;
  const showPageSize = props.showPageSize ?? false;
  const pageSizeOptions = props.pageSizeOptions ?? [10, 20, 50, 100];

  // Handle empty/single page state
  if (totalPages <= 0) {
    return (
      <div data-liquid-type="pagination" style={styles.container}>
        <span style={styles.empty}>No pages</span>
      </div>
    );
  }

  // Generate page items
  const pageItems = generatePageItems(currentPage, totalPages, siblingCount);

  const handlePageChange = useCallback((page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;

    if (emitSignal?.name) {
      signalActions.emit(emitSignal.name, String(page));
    }
  }, [currentPage, totalPages, emitSignal, signalActions]);

  const handlePageSizeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(e.target.value);
    const pageSizeSignalName = props.pageSizeSignal;
    if (pageSizeSignalName) {
      signalActions.emit(pageSizeSignalName, String(newSize));
    }
  }, [props.pageSizeSignal, signalActions]);

  const isPrevDisabled = currentPage <= 1;
  const isNextDisabled = currentPage >= totalPages;

  return (
    <div data-liquid-type="pagination" style={styles.container}>
      {/* Previous button */}
      <NavButton
        direction="prev"
        disabled={isPrevDisabled}
        onClick={() => handlePageChange(currentPage - 1)}
      />

      {/* Page buttons */}
      {pageItems.map((item, index) => {
        if (item.type === 'ellipsis') {
          return <Ellipsis key={`ellipsis-${index}`} />;
        }
        return (
          <PageButton
            key={item.value}
            page={item.value}
            isActive={item.value === currentPage}
            onClick={() => handlePageChange(item.value)}
          />
        );
      })}

      {/* Next button */}
      <NavButton
        direction="next"
        disabled={isNextDisabled}
        onClick={() => handlePageChange(currentPage + 1)}
      />

      {/* Page info */}
      {showPageInfo && (
        <span style={styles.pageInfo}>
          Page {currentPage} of {totalPages}
        </span>
      )}

      {/* Page size selector */}
      {showPageSize && (
        <div style={styles.pageSizeSelector}>
          <span>Show</span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            style={styles.pageSizeSelect}
          >
            {pageSizeOptions.map((size: number) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span>per page</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Static Pagination
// ============================================================================

export interface StaticPaginationProps {
  /** Current active page (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Number of sibling pages to show around current page */
  siblingCount?: number;
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  /** Show "Page X of Y" text */
  showPageInfo?: boolean;
  /** Enable page size selector */
  showPageSize?: boolean;
  /** Current page size */
  pageSize?: number;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Callback when page size changes */
  onPageSizeChange?: (size: number) => void;
  /** Custom styles */
  style?: React.CSSProperties;
}

export function StaticPagination({
  currentPage,
  totalPages,
  siblingCount = 1,
  onPageChange,
  showPageInfo = false,
  showPageSize = false,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  onPageSizeChange,
  style: customStyle,
}: StaticPaginationProps): React.ReactElement {
  // Handle empty/single page state
  if (totalPages <= 0) {
    return (
      <div
        data-liquid-type="pagination"
        style={mergeStyles(styles.container, customStyle)}
      >
        <span style={styles.empty}>No pages</span>
      </div>
    );
  }

  // Generate page items
  const pageItems = generatePageItems(currentPage, totalPages, siblingCount);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange?.(page);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(e.target.value);
    onPageSizeChange?.(newSize);
  };

  const isPrevDisabled = currentPage <= 1;
  const isNextDisabled = currentPage >= totalPages;

  return (
    <div
      data-liquid-type="pagination"
      style={mergeStyles(styles.container, customStyle)}
    >
      {/* Previous button */}
      <NavButton
        direction="prev"
        disabled={isPrevDisabled}
        onClick={() => handlePageChange(currentPage - 1)}
      />

      {/* Page buttons */}
      {pageItems.map((item, index) => {
        if (item.type === 'ellipsis') {
          return <Ellipsis key={`ellipsis-${index}`} />;
        }
        return (
          <PageButton
            key={item.value}
            page={item.value}
            isActive={item.value === currentPage}
            onClick={() => handlePageChange(item.value)}
          />
        );
      })}

      {/* Next button */}
      <NavButton
        direction="next"
        disabled={isNextDisabled}
        onClick={() => handlePageChange(currentPage + 1)}
      />

      {/* Page info */}
      {showPageInfo && (
        <span style={styles.pageInfo}>
          Page {currentPage} of {totalPages}
        </span>
      )}

      {/* Page size selector */}
      {showPageSize && (
        <div style={styles.pageSizeSelector}>
          <span>Show</span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            style={styles.pageSizeSelect}
          >
            {pageSizeOptions.map((size: number) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span>per page</span>
        </div>
      )}
    </div>
  );
}

export default Pagination;
