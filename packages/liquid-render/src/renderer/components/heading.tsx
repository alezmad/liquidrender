// Heading Component - Semantic headings h1-h6
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, baseStyles, mergeStyles, formatDisplayValue } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

// ============================================================================
// Styles
// ============================================================================

const levelStyles: Record<HeadingLevel, React.CSSProperties> = {
  1: {
    fontSize: tokens.fontSize['4xl'],
    fontWeight: tokens.fontWeight.bold,
    lineHeight: 1.2,
    marginBottom: tokens.spacing.lg,
  },
  2: {
    fontSize: tokens.fontSize['3xl'],
    fontWeight: tokens.fontWeight.bold,
    lineHeight: 1.3,
    marginBottom: tokens.spacing.md,
  },
  3: {
    fontSize: tokens.fontSize['2xl'],
    fontWeight: tokens.fontWeight.semibold,
    lineHeight: 1.3,
    marginBottom: tokens.spacing.md,
  },
  4: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.semibold,
    lineHeight: 1.4,
    marginBottom: tokens.spacing.sm,
  },
  5: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: 1.4,
    marginBottom: tokens.spacing.sm,
  },
  6: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: 1.5,
    marginBottom: tokens.spacing.sm,
  },
};

// ============================================================================
// Helpers
// ============================================================================

function getLevelFromBlock(block: LiquidComponentProps['block']): HeadingLevel {
  // Check for explicit level in style.size (e.g., "1", "2", etc.) or color
  const sizeLevel = block.style?.size;
  const colorLevel = block.style?.color;

  // Try to parse level from size first, then color
  const levelStr = sizeLevel || colorLevel;
  if (levelStr) {
    const parsed = parseInt(levelStr, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 6) {
      return parsed as HeadingLevel;
    }
  }

  // Default to h2
  return 2;
}

function getColorStyle(color?: string): React.CSSProperties {
  if (!color) return { color: tokens.colors.foreground };

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

export function Heading({ block, data, children }: LiquidComponentProps): React.ReactElement {
  const value = resolveBinding(block.binding, data);
  const content = children || block.label || (typeof value === 'string' ? value : formatDisplayValue(value));

  const level = getLevelFromBlock(block);
  const color = block.style?.color;

  const style = mergeStyles(
    baseStyles(),
    levelStyles[level],
    getColorStyle(color)
  );

  // Render appropriate semantic heading element
  const HeadingTag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  return React.createElement(
    HeadingTag,
    { 'data-liquid-type': 'heading', 'data-level': level, style },
    content
  );
}

// ============================================================================
// Static Heading (standalone, no block context)
// ============================================================================

interface StaticHeadingProps {
  children: React.ReactNode;
  level?: HeadingLevel;
  color?: string;
  style?: React.CSSProperties;
}

export function StaticHeading({
  children,
  level = 2,
  color,
  style: customStyle,
}: StaticHeadingProps): React.ReactElement {
  const style = mergeStyles(
    baseStyles(),
    levelStyles[level],
    getColorStyle(color),
    customStyle
  );

  const HeadingTag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  return React.createElement(
    HeadingTag,
    { 'data-liquid-type': 'heading', 'data-level': level, style },
    children
  );
}

export default Heading;
