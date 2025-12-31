// Text Component - Typography with semantic variants
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, baseStyles, mergeStyles, formatDisplayValue } from './utils';
import { resolveBinding, formatValue } from '../data-context';

// ============================================================================
// Types
// ============================================================================

type TextVariant = 'body' | 'heading' | 'subheading' | 'caption' | 'label' | 'code';
type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

// ============================================================================
// Styles
// ============================================================================

const variantStyles: Record<TextVariant, React.CSSProperties> = {
  body: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.normal,
    lineHeight: 1.6,
    color: tokens.colors.foreground,
  },
  heading: {
    fontSize: tokens.fontSize['2xl'],
    fontWeight: tokens.fontWeight.bold,
    lineHeight: 1.3,
    color: tokens.colors.foreground,
  },
  subheading: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.semibold,
    lineHeight: 1.4,
    color: tokens.colors.foreground,
  },
  caption: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.normal,
    lineHeight: 1.5,
    color: tokens.colors.mutedForeground,
  },
  label: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: 1.5,
    color: tokens.colors.foreground,
  },
  code: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.normal,
    backgroundColor: tokens.colors.muted,
    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
    borderRadius: tokens.radius.sm,
    color: tokens.colors.foreground,
  },
};

const sizeStyles: Record<TextSize, React.CSSProperties> = {
  xs: { fontSize: tokens.fontSize.xs },
  sm: { fontSize: tokens.fontSize.sm },
  base: { fontSize: tokens.fontSize.base },
  lg: { fontSize: tokens.fontSize.lg },
  xl: { fontSize: tokens.fontSize.xl },
  '2xl': { fontSize: tokens.fontSize['2xl'] },
  '3xl': { fontSize: tokens.fontSize['3xl'] },
  '4xl': { fontSize: tokens.fontSize['4xl'] },
};

// ============================================================================
// Helpers
// ============================================================================

function getVariantFromBlock(block: LiquidComponentProps['block']): TextVariant {
  // Check for explicit variant in style
  const sizeHint = block.style?.size;

  if (sizeHint === 'heading' || sizeHint === 'h1' || sizeHint === 'h2') return 'heading';
  if (sizeHint === 'subheading' || sizeHint === 'h3' || sizeHint === 'h4') return 'subheading';
  if (sizeHint === 'caption' || sizeHint === 'small') return 'caption';
  if (sizeHint === 'label') return 'label';
  if (sizeHint === 'code' || sizeHint === 'mono') return 'code';

  return 'body';
}

function getSizeFromBlock(block: LiquidComponentProps['block']): TextSize | undefined {
  const size = block.style?.size;
  if (size && size in sizeStyles) {
    return size as TextSize;
  }
  return undefined;
}

function getColorStyle(color?: string): React.CSSProperties {
  if (!color) return {};

  const colorMap: Record<string, string> = {
    muted: tokens.colors.mutedForeground,
    primary: tokens.colors.primary,
    secondary: tokens.colors.secondaryForeground,
    success: tokens.colors.success,
    warning: tokens.colors.warning,
    error: tokens.colors.error,
    info: tokens.colors.info,
  };

  return { color: colorMap[color] || color };
}

// ============================================================================
// Main Component
// ============================================================================

export function Text({ block, data, children }: LiquidComponentProps): React.ReactElement {
  const value = resolveBinding(block.binding, data);

  // Check if children has actual content (not just an empty fragment)
  const hasChildren = React.Children.count(children) > 0;
  const content = hasChildren
    ? children
    : block.label || (typeof value === 'string' ? value : formatDisplayValue(value));

  const variant = getVariantFromBlock(block);
  const size = getSizeFromBlock(block);
  const color = block.style?.color;

  const style = mergeStyles(
    baseStyles(),
    variantStyles[variant],
    size ? sizeStyles[size] : {},
    getColorStyle(color)
  );

  // Use appropriate element based on variant
  const Element = variant === 'heading' ? 'h2'
               : variant === 'subheading' ? 'h3'
               : variant === 'code' ? 'code'
               : 'span';

  return (
    <Element data-liquid-type="text" style={style}>
      {content}
    </Element>
  );
}

// ============================================================================
// Static Text (standalone, no block context)
// ============================================================================

interface StaticTextProps {
  children: React.ReactNode;
  variant?: TextVariant;
  size?: TextSize;
  color?: string;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div' | 'label' | 'code';
  style?: React.CSSProperties;
}

export function StaticText({
  children,
  variant = 'body',
  size,
  color,
  as = 'span',
  style: customStyle,
}: StaticTextProps): React.ReactElement {
  const style = mergeStyles(
    baseStyles(),
    variantStyles[variant],
    size ? sizeStyles[size] : {},
    getColorStyle(color),
    customStyle
  );

  const Element = as;
  return <Element style={style}>{children}</Element>;
}

export default Text;
