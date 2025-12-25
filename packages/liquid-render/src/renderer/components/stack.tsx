// Stack Component - Flexbox stacking layout
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, baseStyles, mergeStyles, getLayoutStyles } from './utils';

// ============================================================================
// Types
// ============================================================================

type StackDirection = 'vertical' | 'horizontal';
type StackGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type StackAlign = 'start' | 'center' | 'end' | 'stretch';
type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around';

interface StackLayout {
  direction?: StackDirection;
  gap?: StackGap;
  align?: StackAlign;
  justify?: StackJustify;
  wrap?: boolean;
}

interface StackStyle {
  divider?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function getGapValue(gap: StackGap): string {
  const gapMap: Record<StackGap, string> = {
    xs: tokens.spacing.xs,
    sm: tokens.spacing.sm,
    md: tokens.spacing.md,
    lg: tokens.spacing.lg,
    xl: tokens.spacing.xl,
  };
  return gapMap[gap];
}

function getAlignValue(align: StackAlign): string {
  const alignMap: Record<StackAlign, string> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    stretch: 'stretch',
  };
  return alignMap[align];
}

function getJustifyValue(justify: StackJustify): string {
  const justifyMap: Record<StackJustify, string> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    between: 'space-between',
    around: 'space-around',
  };
  return justifyMap[justify];
}

function getFlexDirection(direction: StackDirection): 'row' | 'column' {
  return direction === 'horizontal' ? 'row' : 'column';
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  divider: (isHorizontal: boolean): React.CSSProperties => ({
    backgroundColor: tokens.colors.border,
    flexShrink: 0,
    ...(isHorizontal
      ? { width: '1px', alignSelf: 'stretch' }
      : { height: '1px', alignSelf: 'stretch' }),
  }),
};

function getStackStyles(
  direction: StackDirection,
  gap: StackGap,
  align?: StackAlign,
  justify?: StackJustify,
  wrap?: boolean
): React.CSSProperties {
  return mergeStyles(baseStyles(), {
    display: 'flex',
    flexDirection: getFlexDirection(direction),
    gap: getGapValue(gap),
    alignItems: align ? getAlignValue(align) : undefined,
    justifyContent: justify ? getJustifyValue(justify) : undefined,
    flexWrap: wrap ? 'wrap' : undefined,
  });
}

// ============================================================================
// Sub-components
// ============================================================================

interface StackDividerProps {
  isHorizontal: boolean;
}

function StackDivider({ isHorizontal }: StackDividerProps): React.ReactElement {
  return <div style={styles.divider(isHorizontal)} role="separator" />;
}

// ============================================================================
// Main Component
// ============================================================================

export function Stack({ block, children }: LiquidComponentProps): React.ReactElement {
  // Extract layout properties from block
  const layout = block.layout as StackLayout | undefined;
  const blockStyle = block.style as StackStyle | undefined;

  const direction: StackDirection = layout?.direction ?? 'vertical';
  const gap: StackGap = layout?.gap ?? 'md';
  const align = layout?.align;
  const justify = layout?.justify;
  const wrap = layout?.wrap ?? false;
  const showDivider = blockStyle?.divider ?? false;

  const isHorizontal = direction === 'horizontal';

  // Get combined styles
  const stackStyle = mergeStyles(
    getStackStyles(direction, gap, align, justify, wrap),
    getLayoutStyles(block)
  );

  // Handle empty children
  if (!children || (Array.isArray(children) && children.length === 0)) {
    return <div data-liquid-type="stack" style={stackStyle} />;
  }

  // If dividers are enabled, interleave dividers between children
  if (showDivider && Array.isArray(children)) {
    const childrenWithDividers: React.ReactNode[] = [];
    React.Children.forEach(children, (child, index) => {
      if (index > 0) {
        childrenWithDividers.push(
          <StackDivider key={`divider-${index}`} isHorizontal={isHorizontal} />
        );
      }
      childrenWithDividers.push(child);
    });

    return (
      <div data-liquid-type="stack" style={stackStyle}>
        {childrenWithDividers}
      </div>
    );
  }

  return (
    <div data-liquid-type="stack" style={stackStyle}>
      {children}
    </div>
  );
}

// ============================================================================
// Convenience Components (Aliases)
// ============================================================================

/**
 * VStack - Vertical stack (column direction)
 * Alias for Stack with direction='vertical'
 */
export function VStack({ block, data, children, className }: LiquidComponentProps): React.ReactElement {
  // Override direction to vertical
  const modifiedBlock = {
    ...block,
    layout: {
      ...block.layout,
      direction: 'vertical' as StackDirection,
    },
  };

  return <Stack block={modifiedBlock} data={data} children={children} className={className} />;
}

/**
 * HStack - Horizontal stack (row direction)
 * Alias for Stack with direction='horizontal'
 */
export function HStack({ block, data, children, className }: LiquidComponentProps): React.ReactElement {
  // Override direction to horizontal
  const modifiedBlock = {
    ...block,
    layout: {
      ...block.layout,
      direction: 'horizontal' as StackDirection,
    },
  };

  return <Stack block={modifiedBlock} data={data} children={children} className={className} />;
}

// ============================================================================
// Static Stack (standalone usage)
// ============================================================================

interface StaticStackProps {
  children: React.ReactNode;
  direction?: StackDirection;
  gap?: StackGap;
  align?: StackAlign;
  justify?: StackJustify;
  wrap?: boolean;
  divider?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function StaticStack({
  children,
  direction = 'vertical',
  gap = 'md',
  align,
  justify,
  wrap = false,
  divider = false,
  style: customStyle,
  className,
}: StaticStackProps): React.ReactElement {
  const isHorizontal = direction === 'horizontal';

  const stackStyle = mergeStyles(
    getStackStyles(direction, gap, align, justify, wrap),
    customStyle
  );

  // Handle empty children
  if (!children || (Array.isArray(children) && children.length === 0)) {
    return <div data-liquid-type="stack" style={stackStyle} className={className} />;
  }

  // If dividers are enabled, interleave dividers between children
  if (divider) {
    const childrenWithDividers: React.ReactNode[] = [];
    React.Children.forEach(children, (child, index) => {
      if (index > 0) {
        childrenWithDividers.push(
          <StackDivider key={`divider-${index}`} isHorizontal={isHorizontal} />
        );
      }
      childrenWithDividers.push(child);
    });

    return (
      <div data-liquid-type="stack" style={stackStyle} className={className}>
        {childrenWithDividers}
      </div>
    );
  }

  return (
    <div data-liquid-type="stack" style={stackStyle} className={className}>
      {children}
    </div>
  );
}

// ============================================================================
// Static Convenience Components
// ============================================================================

interface StaticVStackProps extends Omit<StaticStackProps, 'direction'> {}

export function StaticVStack(props: StaticVStackProps): React.ReactElement {
  return <StaticStack {...props} direction="vertical" />;
}

interface StaticHStackProps extends Omit<StaticStackProps, 'direction'> {}

export function StaticHStack(props: StaticHStackProps): React.ReactElement {
  return <StaticStack {...props} direction="horizontal" />;
}

export default Stack;
