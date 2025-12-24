// Shared utilities and design tokens for Liquid components
// Inspired by shadcn/ui design system

import type { Block } from '../../compiler/ui-emitter';
import type { DataContext } from '../data-context';

// ============================================================================
// Component Props Interface
// ============================================================================

export interface LiquidComponentProps {
  block: Block;
  data: DataContext;
  children?: React.ReactNode;
  className?: string;
}

// ============================================================================
// Design Tokens (shadcn-inspired)
// ============================================================================

export const tokens = {
  // Colors - CSS variable references for theming
  colors: {
    background: 'var(--background, #ffffff)',
    foreground: 'var(--foreground, #0a0a0a)',
    card: 'var(--card, #ffffff)',
    cardForeground: 'var(--card-foreground, #0a0a0a)',
    primary: 'var(--primary, #171717)',
    primaryForeground: 'var(--primary-foreground, #fafafa)',
    secondary: 'var(--secondary, #f5f5f5)',
    secondaryForeground: 'var(--secondary-foreground, #171717)',
    muted: 'var(--muted, #f5f5f5)',
    mutedForeground: 'var(--muted-foreground, #737373)',
    accent: 'var(--accent, #f5f5f5)',
    accentForeground: 'var(--accent-foreground, #171717)',
    destructive: 'var(--destructive, #ef4444)',
    destructiveForeground: 'var(--destructive-foreground, #fafafa)',
    border: 'var(--border, #e5e5e5)',
    input: 'var(--input, #e5e5e5)',
    ring: 'var(--ring, #0a0a0a)',
    // Semantic colors
    success: 'var(--success, #22c55e)',
    warning: 'var(--warning, #f59e0b)',
    error: 'var(--error, #ef4444)',
    info: 'var(--info, #3b82f6)',
  },

  // Spacing
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
  },

  // Border radius
  radius: {
    none: '0',
    sm: '0.25rem',   // 4px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    full: '9999px',
  },

  // Typography
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Shadows
  shadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },

  // Transitions
  transition: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// ============================================================================
// Chart Colors (consistent palette)
// ============================================================================

export const chartColors = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
] as const;

// ============================================================================
// Style Utilities
// ============================================================================

export type CSSProperties = React.CSSProperties;

/**
 * Merge multiple style objects
 */
export function mergeStyles(...styles: (CSSProperties | undefined)[]): CSSProperties {
  return Object.assign({}, ...styles.filter(Boolean));
}

/**
 * Create base styles for a component
 */
export function baseStyles(overrides?: CSSProperties): CSSProperties {
  return mergeStyles(
    {
      fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
      boxSizing: 'border-box',
    },
    overrides
  );
}

/**
 * Create card-like container styles
 */
export function cardStyles(overrides?: CSSProperties): CSSProperties {
  return mergeStyles(
    baseStyles(),
    {
      backgroundColor: tokens.colors.card,
      border: `1px solid ${tokens.colors.border}`,
      borderRadius: tokens.radius.lg,
      boxShadow: tokens.shadow.sm,
    },
    overrides
  );
}

/**
 * Create button styles with variants
 */
export function buttonStyles(
  variant: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' = 'default',
  size: 'sm' | 'md' | 'lg' = 'md'
): CSSProperties {
  const sizeStyles: Record<string, CSSProperties> = {
    sm: { height: '2rem', padding: '0 0.75rem', fontSize: tokens.fontSize.xs },
    md: { height: '2.5rem', padding: '0 1rem', fontSize: tokens.fontSize.sm },
    lg: { height: '2.75rem', padding: '0 1.5rem', fontSize: tokens.fontSize.base },
  };

  const variantStyles: Record<string, CSSProperties> = {
    default: {
      backgroundColor: tokens.colors.primary,
      color: tokens.colors.primaryForeground,
      border: 'none',
    },
    secondary: {
      backgroundColor: tokens.colors.secondary,
      color: tokens.colors.secondaryForeground,
      border: 'none',
    },
    outline: {
      backgroundColor: 'transparent',
      color: tokens.colors.foreground,
      border: `1px solid ${tokens.colors.border}`,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: tokens.colors.foreground,
      border: 'none',
    },
    destructive: {
      backgroundColor: tokens.colors.destructive,
      color: tokens.colors.destructiveForeground,
      border: 'none',
    },
  };

  return mergeStyles(
    baseStyles(),
    {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: tokens.radius.md,
      fontWeight: tokens.fontWeight.medium,
      cursor: 'pointer',
      transition: `all ${tokens.transition.fast}`,
      outline: 'none',
    },
    sizeStyles[size],
    variantStyles[variant]
  );
}

/**
 * Create input styles
 */
export function inputStyles(overrides?: CSSProperties): CSSProperties {
  return mergeStyles(
    baseStyles(),
    {
      display: 'flex',
      height: '2.5rem',
      width: '100%',
      borderRadius: tokens.radius.md,
      border: `1px solid ${tokens.colors.input}`,
      backgroundColor: tokens.colors.background,
      padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
      fontSize: tokens.fontSize.sm,
      color: tokens.colors.foreground,
      outline: 'none',
      transition: `border-color ${tokens.transition.fast}`,
    },
    overrides
  );
}

// ============================================================================
// Layout Utilities
// ============================================================================

/**
 * Get flex/grid layout styles from block
 */
export function getLayoutStyles(block: Block): CSSProperties {
  const styles: CSSProperties = {};

  if (!block.layout) return styles;

  // Flex direction
  if (block.layout.flex) {
    styles.display = 'flex';
    switch (block.layout.flex) {
      case 'row':
        styles.flexDirection = 'row';
        break;
      case 'column':
        styles.flexDirection = 'column';
        break;
      case 'grow':
        styles.flex = 1;
        break;
      case 'shrink':
        styles.flexShrink = 1;
        break;
    }
  }

  // Grid span
  if (block.layout.span) {
    const span = block.layout.span;
    if (typeof span === 'number') {
      styles.gridColumn = `span ${span}`;
    } else if (span === 'full') {
      styles.gridColumn = '1 / -1';
    } else if (span === 'half') {
      styles.gridColumn = 'span 6';
    }
  }

  return styles;
}

/**
 * Get color from block style
 */
export function getBlockColor(block: Block): string | undefined {
  const colorName = block.style?.color;
  if (!colorName) return undefined;

  // Map common color names to CSS variables or hex
  const colorMap: Record<string, string> = {
    primary: tokens.colors.primary,
    secondary: tokens.colors.secondary,
    success: tokens.colors.success,
    warning: tokens.colors.warning,
    error: tokens.colors.error,
    info: tokens.colors.info,
    // Direct colors
    red: '#ef4444',
    green: '#22c55e',
    blue: '#3b82f6',
    yellow: '#f59e0b',
    purple: '#8b5cf6',
    pink: '#ec4899',
    orange: '#f97316',
    cyan: '#06b6d4',
    gray: '#6b7280',
  };

  return colorMap[colorName] || colorName;
}

// ============================================================================
// Data Utilities
// ============================================================================

/**
 * Format a value for display
 */
export function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    // Format large numbers with abbreviations
    if (Math.abs(value) >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }
    // Format with reasonable precision
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}

/**
 * Convert field name to display label
 */
export function fieldToLabel(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// ============================================================================
// Component Helpers
// ============================================================================

/**
 * Generate unique ID for accessibility
 */
let idCounter = 0;
export function generateId(prefix = 'liquid'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Check if we're in browser environment
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
