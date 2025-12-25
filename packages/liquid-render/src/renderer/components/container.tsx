// Container Component - Flex/Grid layout wrapper with list/repeater support
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, baseStyles, mergeStyles, getLayoutStyles } from './utils';
import type { Block } from '../../compiler/ui-emitter';
import { resolveBinding, type DataContext } from '../data-context';

// ============================================================================
// Types
// ============================================================================

type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
type FlexAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
type FlexJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
type Gap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if a block is a list/repeater (type 7 or 'list')
 * Lists render their children template once per array item
 */
function isListBlock(block: Block): boolean {
  return block.type === 'list' || block.type === '7';
}

/**
 * Check if a binding has an iterator (:.field or :.)
 */
function hasIteratorBinding(block: Block): boolean {
  return block.binding?.kind === 'iterator';
}

function getFlexDirection(block: Block): FlexDirection {
  const flex = block.layout?.flex;
  if (flex === 'row') return 'row';
  if (flex === 'column') return 'column';
  // Default to column for containers with children
  return 'column';
}

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

function getAlignValue(align: FlexAlign): string {
  const alignMap: Record<FlexAlign, string> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    stretch: 'stretch',
    baseline: 'baseline',
  };
  return alignMap[align];
}

function getJustifyValue(justify: FlexJustify): string {
  const justifyMap: Record<FlexJustify, string> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    between: 'space-between',
    around: 'space-around',
    evenly: 'space-evenly',
  };
  return justifyMap[justify];
}

// ============================================================================
// Styles
// ============================================================================

function getContainerStyles(block: Block): React.CSSProperties {
  const direction = getFlexDirection(block);
  const hasChildren = block.children && block.children.length > 0;

  const style: React.CSSProperties = {
    display: 'flex',
    flexDirection: direction,
    gap: hasChildren ? tokens.spacing.md : undefined,
  };

  // Apply layout modifiers
  const layoutStyles = getLayoutStyles(block);

  return mergeStyles(baseStyles(), style, layoutStyles);
}

// ============================================================================
// Main Component
// ============================================================================

export function Container({ block, data, children }: LiquidComponentProps): React.ReactElement {
  const style = getContainerStyles(block);

  // Normal container mode - children are pre-rendered by LiquidUI
  return (
    <div data-liquid-type="container" style={style}>
      {children}
    </div>
  );
}

// ============================================================================
// Static Container (standalone, no block context)
// ============================================================================

interface StaticContainerProps {
  children: React.ReactNode;
  direction?: FlexDirection;
  align?: FlexAlign;
  justify?: FlexJustify;
  gap?: Gap;
  wrap?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function StaticContainer({
  children,
  direction = 'column',
  align,
  justify,
  gap = 'md',
  wrap = false,
  style: customStyle,
}: StaticContainerProps): React.ReactElement {
  const style = mergeStyles(
    baseStyles(),
    {
      display: 'flex',
      flexDirection: direction,
      alignItems: align ? getAlignValue(align) : undefined,
      justifyContent: justify ? getJustifyValue(justify) : undefined,
      gap: getGapValue(gap),
      flexWrap: wrap ? 'wrap' : undefined,
    },
    customStyle
  );

  return <div style={style}>{children}</div>;
}

// ============================================================================
// Grid Container
// ============================================================================

interface GridContainerProps {
  children: React.ReactNode;
  columns?: number | string;
  gap?: Gap;
  style?: React.CSSProperties;
}

export function GridContainer({
  children,
  columns = 12,
  gap = 'md',
  style: customStyle,
}: GridContainerProps): React.ReactElement {
  const style = mergeStyles(
    baseStyles(),
    {
      display: 'grid',
      gridTemplateColumns: typeof columns === 'number'
        ? `repeat(${columns}, minmax(0, 1fr))`
        : columns,
      gap: getGapValue(gap),
    },
    customStyle
  );

  return <div style={style}>{children}</div>;
}

export default Container;
