// Grid Component - CSS Grid layout container
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, baseStyles, mergeStyles, getLayoutStyles } from './utils';

// ============================================================================
// Types
// ============================================================================

type GapSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type AlignItems = 'start' | 'center' | 'end' | 'stretch';
type JustifyItems = 'start' | 'center' | 'end' | 'stretch';
type ColumnSpec = number | 'auto' | 'auto-fit' | 'auto-fill';

interface GridLayoutConfig {
  columns?: ColumnSpec;
  gap?: GapSize;
  align?: AlignItems;
  justify?: JustifyItems;
  minChildWidth?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert gap size token to CSS value
 */
function getGapValue(gap: GapSize): string {
  const gapMap: Record<GapSize, string> = {
    xs: tokens.spacing.xs,
    sm: tokens.spacing.sm,
    md: tokens.spacing.md,
    lg: tokens.spacing.lg,
    xl: tokens.spacing.xl,
    '2xl': tokens.spacing['2xl'],
  };
  return gapMap[gap];
}

/**
 * Convert align value to CSS align-items
 */
function getAlignValue(align: AlignItems): string {
  const alignMap: Record<AlignItems, string> = {
    start: 'start',
    center: 'center',
    end: 'end',
    stretch: 'stretch',
  };
  return alignMap[align];
}

/**
 * Convert justify value to CSS justify-items
 */
function getJustifyValue(justify: JustifyItems): string {
  const justifyMap: Record<JustifyItems, string> = {
    start: 'start',
    center: 'center',
    end: 'end',
    stretch: 'stretch',
  };
  return justifyMap[justify];
}

/**
 * Generate grid-template-columns value based on column specification
 */
function getGridTemplateColumns(
  columns: ColumnSpec,
  minChildWidth: string = '200px'
): string {
  if (typeof columns === 'number') {
    // Explicit column count with equal distribution within grid
    return `repeat(${columns}, minmax(0, 1fr))`;
  }

  switch (columns) {
    case 'auto':
      // Auto columns based on content
      return 'repeat(auto-fit, minmax(0, 1fr))';
    case 'auto-fit':
      // Auto-fit: responsive columns that expand to fill space
      return `repeat(auto-fit, minmax(${minChildWidth}, 1fr))`;
    case 'auto-fill':
      // Auto-fill: responsive columns that maintain size
      return `repeat(auto-fill, minmax(${minChildWidth}, 1fr))`;
    default:
      return 'repeat(12, minmax(0, 1fr))';
  }
}

/**
 * Extract grid configuration from block.layout
 */
function extractGridConfig(
  layout?: Record<string, unknown>
): GridLayoutConfig {
  if (!layout) {
    return { columns: 12, gap: 'md', align: 'stretch' };
  }

  return {
    columns: (layout.columns as ColumnSpec) ?? 12,
    gap: (layout.gap as GapSize) ?? 'md',
    align: (layout.align as AlignItems) ?? 'stretch',
    justify: layout.justify as JustifyItems | undefined,
    minChildWidth: layout.minChildWidth as string | undefined,
  };
}

// ============================================================================
// Styles
// ============================================================================

function getGridStyles(config: GridLayoutConfig): React.CSSProperties {
  const {
    columns = 12,
    gap = 'md',
    align = 'stretch',
    justify,
    minChildWidth,
  } = config;

  const style: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: getGridTemplateColumns(columns, minChildWidth),
    gap: getGapValue(gap),
    alignItems: getAlignValue(align),
    width: '100%',
  };

  if (justify) {
    style.justifyItems = getJustifyValue(justify);
  }

  return mergeStyles(baseStyles(), style);
}

const styles = {
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.lg,
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    fontStyle: 'italic' as const,
    minHeight: '100px',
    border: `1px dashed ${tokens.colors.border}`,
    borderRadius: tokens.radius.md,
  } as React.CSSProperties,
};

// ============================================================================
// Main Component
// ============================================================================

export function Grid({ block, data, children }: LiquidComponentProps): React.ReactElement {
  // Extract grid configuration from block layout
  const gridConfig = extractGridConfig(block.layout as Record<string, unknown> | undefined);

  // Get base grid styles
  const gridStyles = getGridStyles(gridConfig);

  // Apply any additional layout styles (like span)
  const layoutStyles = getLayoutStyles(block);
  const combinedStyles = mergeStyles(gridStyles, layoutStyles);

  // Handle empty children state
  const hasChildren = React.Children.count(children) > 0 || (block.children && block.children.length > 0);

  if (!hasChildren) {
    return (
      <div data-liquid-type="grid" style={combinedStyles}>
        <div style={styles.empty}>No grid items</div>
      </div>
    );
  }

  return (
    <div data-liquid-type="grid" style={combinedStyles}>
      {children}
    </div>
  );
}

// ============================================================================
// Static Grid (standalone usage without block context)
// ============================================================================

interface StaticGridProps {
  children: React.ReactNode;
  /** Number of columns (1-12), or 'auto'/'auto-fit'/'auto-fill' for responsive */
  columns?: ColumnSpec;
  /** Gap between grid items */
  gap?: GapSize;
  /** Vertical alignment of items */
  align?: AlignItems;
  /** Horizontal alignment of items */
  justify?: JustifyItems;
  /** Minimum width for auto-fit/auto-fill columns */
  minChildWidth?: string;
  /** Additional custom styles */
  style?: React.CSSProperties;
  /** CSS class name */
  className?: string;
}

export function StaticGrid({
  children,
  columns = 12,
  gap = 'md',
  align = 'stretch',
  justify,
  minChildWidth = '200px',
  style: customStyle,
  className,
}: StaticGridProps): React.ReactElement {
  const gridStyles = getGridStyles({
    columns,
    gap,
    align,
    justify,
    minChildWidth,
  });

  const combinedStyles = mergeStyles(gridStyles, customStyle);

  return (
    <div
      data-liquid-type="grid"
      style={combinedStyles}
      className={className}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Grid Item (optional wrapper for explicit span control)
// ============================================================================

interface GridItemProps {
  children: React.ReactNode;
  /** Column span (1-12) or 'full' for full width */
  span?: number | 'full' | 'half';
  /** Row span */
  rowSpan?: number;
  /** Column start position */
  colStart?: number;
  /** Row start position */
  rowStart?: number;
  /** Additional custom styles */
  style?: React.CSSProperties;
  /** CSS class name */
  className?: string;
}

export function GridItem({
  children,
  span,
  rowSpan,
  colStart,
  rowStart,
  style: customStyle,
  className,
}: GridItemProps): React.ReactElement {
  const itemStyles: React.CSSProperties = {};

  // Handle column span
  if (span !== undefined) {
    if (span === 'full') {
      itemStyles.gridColumn = '1 / -1';
    } else if (span === 'half') {
      itemStyles.gridColumn = 'span 6';
    } else if (typeof span === 'number') {
      itemStyles.gridColumn = `span ${span}`;
    }
  }

  // Handle row span
  if (rowSpan !== undefined) {
    itemStyles.gridRow = `span ${rowSpan}`;
  }

  // Handle explicit positioning
  if (colStart !== undefined) {
    itemStyles.gridColumnStart = colStart;
  }
  if (rowStart !== undefined) {
    itemStyles.gridRowStart = rowStart;
  }

  const combinedStyles = mergeStyles(baseStyles(), itemStyles, customStyle);

  return (
    <div style={combinedStyles} className={className}>
      {children}
    </div>
  );
}

// ============================================================================
// Responsive Grid (convenience component for common patterns)
// ============================================================================

interface ResponsiveGridProps {
  children: React.ReactNode;
  /** Minimum width of each item before wrapping */
  minItemWidth?: string;
  /** Gap between items */
  gap?: GapSize;
  /** Additional custom styles */
  style?: React.CSSProperties;
  /** CSS class name */
  className?: string;
}

export function ResponsiveGrid({
  children,
  minItemWidth = '250px',
  gap = 'md',
  style: customStyle,
  className,
}: ResponsiveGridProps): React.ReactElement {
  const gridStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`,
    gap: getGapValue(gap),
    // Don't force width: 100% - let parent container control sizing
  };

  const combinedStyles = mergeStyles(baseStyles(), gridStyles, customStyle);

  return (
    <div
      data-liquid-type="grid"
      style={combinedStyles}
      className={className}
    >
      {children}
    </div>
  );
}

export default Grid;
