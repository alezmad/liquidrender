// List Component - Repeating list/iterator
// DSL: Ls :arrayBinding [children]
// Special bindings: :. = current item, :# = current index

import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, baseStyles, mergeStyles, getLayoutStyles } from './utils';
import type { Block } from '../../compiler/ui-emitter';
import { resolveBinding, type DataContext } from '../data-context';

// ============================================================================
// Types
// ============================================================================

type FlexDirection = 'row' | 'column';
type Gap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get flex direction from block layout
 * Uses the flex property from Layout interface
 */
function getListDirection(block: Block): FlexDirection {
  const flex = block.layout?.flex;
  if (flex === 'row') return 'row';
  if (flex === 'column') return 'column';
  // Default to column (vertical list)
  return 'column';
}

/**
 * Get gap value from tokens
 */
function getGapValue(gap: Gap): string {
  const gapMap: Record<Gap, string> = {
    none: '0',
    xs: tokens.spacing.xs,
    sm: tokens.spacing.sm,
    md: tokens.spacing.md,
    lg: tokens.spacing.lg,
    xl: tokens.spacing.xl,
    '2xl': tokens.spacing['2xl'],
  };
  return gapMap[gap];
}

// ============================================================================
// Styles
// ============================================================================

function getListStyles(block: Block): React.CSSProperties {
  const direction = getListDirection(block);

  const style: React.CSSProperties = {
    display: 'flex',
    flexDirection: direction,
    gap: tokens.spacing.md,
    flexWrap: direction === 'row' ? 'wrap' : undefined,
  };

  // Apply layout modifiers
  const layoutStyles = getLayoutStyles(block);

  return mergeStyles(baseStyles(), style, layoutStyles);
}

const styles = {
  emptyState: {
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    padding: tokens.spacing.md,
    textAlign: 'center' as const,
  },
  listItem: {
    // Minimal wrapper for each item
  },
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * List/Repeater component for rendering arrays.
 *
 * The List component iterates over an array (resolved from block.binding)
 * and renders block.children for each item. The children receive a modified
 * data context where:
 * - `$` = the current item
 * - `#` = the current index
 *
 * Children can access item fields using iterator bindings:
 * - `:.` = the whole current item
 * - `:.fieldName` = a field of the current item
 * - `:#` = the current index
 *
 * @example DSL Usage
 * ```liquid
 * Ls :items [Cd :.name]      # List of cards showing item.name
 * Ls :users [Tx :.email]     # List of text showing user emails
 * Ls :products [             # Nested children per item
 *   Tx :.title
 *   Tx :.price
 * ]
 * ```
 */
export function List({ block, data, children }: LiquidComponentProps): React.ReactElement {
  // Resolve the binding to get the array data
  const arrayData = resolveBinding(block.binding, data);

  // Get container styles
  const containerStyle = getListStyles(block);

  // Handle non-array or empty data
  if (!Array.isArray(arrayData) || arrayData.length === 0) {
    const emptyMessage = block.label || 'No items';
    return (
      <div data-liquid-type="list" role="list" style={containerStyle}>
        <div role="listitem" style={styles.emptyState}>
          {emptyMessage === 'No items' ? emptyMessage : `No ${emptyMessage.toLowerCase()}`}
        </div>
      </div>
    );
  }

  // If children are passed (pre-rendered by LiquidUI), we need to handle differently
  // In this case, LiquidUI has already done the iteration and passed rendered children
  if (children) {
    return (
      <div data-liquid-type="list" role="list" style={containerStyle}>
        {children}
      </div>
    );
  }

  // Note: In normal usage, children are rendered by LiquidUI's BlockRenderer
  // which handles the iteration and context injection. This component serves
  // as a container that provides the correct layout and empty state handling.
  // The actual iteration logic lives in LiquidUI.tsx's BlockRenderer.

  return (
    <div data-liquid-type="list" role="list" style={containerStyle}>
      {/* Children will be injected by LiquidUI BlockRenderer */}
    </div>
  );
}

// ============================================================================
// Static List (standalone usage without LiquidUI)
// ============================================================================

interface StaticListProps<T = unknown> {
  /** Array of items to render */
  items: T[];
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Key extractor function */
  keyExtractor?: (item: T, index: number) => string | number;
  /** Direction of the list */
  direction?: FlexDirection;
  /** Gap between items */
  gap?: Gap;
  /** Custom styles */
  style?: React.CSSProperties;
  /** Empty state message or component */
  emptyState?: React.ReactNode;
  /** Optional className */
  className?: string;
}

/**
 * Static List component for standalone usage outside LiquidUI.
 *
 * @example
 * ```tsx
 * <StaticList
 *   items={users}
 *   renderItem={(user) => <UserCard key={user.id} user={user} />}
 *   direction="column"
 *   gap="md"
 * />
 * ```
 */
export function StaticList<T = unknown>({
  items,
  renderItem,
  keyExtractor,
  direction = 'column',
  gap = 'md',
  style: customStyle,
  emptyState = 'No items',
  className,
}: StaticListProps<T>): React.ReactElement {
  const containerStyle = mergeStyles(
    baseStyles(),
    {
      display: 'flex',
      flexDirection: direction,
      gap: getGapValue(gap),
      flexWrap: direction === 'row' ? 'wrap' : undefined,
    },
    customStyle
  );

  // Handle empty state
  if (!items || items.length === 0) {
    return (
      <div data-liquid-type="list" role="list" style={containerStyle} className={className}>
        {typeof emptyState === 'string' ? (
          <div role="listitem" style={styles.emptyState}>{emptyState}</div>
        ) : (
          emptyState
        )}
      </div>
    );
  }

  return (
    <div data-liquid-type="list" role="list" style={containerStyle} className={className}>
      {items.map((item, index) => {
        const key = keyExtractor ? keyExtractor(item, index) : index;
        return (
          <div key={key} role="listitem" data-list-item-index={index}>
            {renderItem(item, index)}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Grid List variant
// ============================================================================

interface GridListProps<T = unknown> extends Omit<StaticListProps<T>, 'direction'> {
  /** Number of columns */
  columns?: number | 'auto';
  /** Minimum item width for auto columns */
  minItemWidth?: string;
}

/**
 * Grid variant of StaticList for grid layouts.
 *
 * @example
 * ```tsx
 * <GridList
 *   items={products}
 *   columns={3}
 *   gap="lg"
 *   renderItem={(product) => <ProductCard product={product} />}
 * />
 * ```
 */
export function GridList<T = unknown>({
  items,
  renderItem,
  keyExtractor,
  columns = 3,
  minItemWidth = '250px',
  gap = 'md',
  style: customStyle,
  emptyState = 'No items',
  className,
}: GridListProps<T>): React.ReactElement {
  const gridTemplate =
    columns === 'auto'
      ? `repeat(auto-fill, minmax(${minItemWidth}, 1fr))`
      : `repeat(${columns}, minmax(0, 1fr))`;

  const containerStyle = mergeStyles(
    baseStyles(),
    {
      display: 'grid',
      gridTemplateColumns: gridTemplate,
      gap: getGapValue(gap),
    },
    customStyle
  );

  // Handle empty state
  if (!items || items.length === 0) {
    return (
      <div data-liquid-type="list" data-list-variant="grid" role="list" style={containerStyle} className={className}>
        {typeof emptyState === 'string' ? (
          <div role="listitem" style={{ ...styles.emptyState, gridColumn: '1 / -1' }}>{emptyState}</div>
        ) : (
          emptyState
        )}
      </div>
    );
  }

  return (
    <div data-liquid-type="list" data-list-variant="grid" role="list" style={containerStyle} className={className}>
      {items.map((item, index) => {
        const key = keyExtractor ? keyExtractor(item, index) : index;
        return (
          <div key={key} role="listitem" data-list-item-index={index}>
            {renderItem(item, index)}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default List;
