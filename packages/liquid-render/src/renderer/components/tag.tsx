// Tag Component - Display-only label/badge with color variants
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, baseStyles, mergeStyles, getBlockColor, formatDisplayValue } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

type TagColor = 'default' | 'primary' | 'success' | 'warning' | 'danger';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Auto-detect color based on common status values
 */
function autoDetectColor(value: unknown): TagColor | undefined {
  if (typeof value !== 'string') return undefined;

  const lower = value.toLowerCase();

  // Success states
  if (['active', 'approved', 'success', 'completed', 'done', 'enabled'].includes(lower)) {
    return 'success';
  }

  // Warning states
  if (['pending', 'warning', 'waiting', 'in progress', 'processing'].includes(lower)) {
    return 'warning';
  }

  // Danger states
  if (['error', 'failed', 'rejected', 'disabled', 'cancelled', 'blocked'].includes(lower)) {
    return 'danger';
  }

  return undefined;
}

/**
 * Map block color to tag color variant
 */
function getTagColor(block: { style?: { color?: string } }, value?: unknown): TagColor {
  const blockColor = block.style?.color;

  if (blockColor) {
    switch (blockColor) {
      case 'green':
      case 'success':
        return 'success';
      case 'yellow':
      case 'amber':
      case 'warning':
        return 'warning';
      case 'red':
      case 'error':
      case 'danger':
      case 'destructive':
        return 'danger';
      case 'blue':
      case 'primary':
        return 'primary';
      default:
        return 'default';
    }
  }

  // Auto-detect from value if no explicit color
  return autoDetectColor(value) || 'default';
}

// ============================================================================
// Styles
// ============================================================================

function getTagStyles(color: TagColor): React.CSSProperties {
  const colorStyles: Record<TagColor, React.CSSProperties> = {
    default: {
      backgroundColor: tokens.colors.muted,
      color: tokens.colors.mutedForeground,
    },
    primary: {
      backgroundColor: 'var(--info, #3b82f6)',
      color: '#ffffff',
    },
    success: {
      backgroundColor: 'var(--success, #22c55e)',
      color: '#ffffff',
    },
    warning: {
      backgroundColor: 'var(--warning, #f59e0b)',
      color: '#ffffff',
    },
    danger: {
      backgroundColor: 'var(--error, #ef4444)',
      color: '#ffffff',
    },
  };

  return mergeStyles(
    baseStyles(),
    {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
      fontSize: tokens.fontSize.xs,
      fontWeight: tokens.fontWeight.medium,
      borderRadius: tokens.radius.full,
      whiteSpace: 'nowrap',
      lineHeight: 1,
    },
    colorStyles[color]
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Tag({ block, data }: LiquidComponentProps): React.ReactElement {
  // Resolve binding
  const value = block.binding ? resolveBinding(block.binding, data) : null;

  // Use explicit label or formatted value
  const displayText = block.label || formatDisplayValue(value);

  // Determine color variant
  const color = getTagColor(block, value);

  const style = getTagStyles(color);

  return (
    <span
      data-liquid-type="tag"
      data-color={color}
      style={style}
    >
      {displayText}
    </span>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

interface StaticTagProps {
  label: string;
  color?: TagColor;
  className?: string;
  style?: React.CSSProperties;
}

export function StaticTag({
  label,
  color = 'default',
  style: customStyle,
}: StaticTagProps): React.ReactElement {
  const style = mergeStyles(
    getTagStyles(color),
    customStyle
  );

  return (
    <span
      data-liquid-type="tag"
      data-color={color}
      style={style}
    >
      {label}
    </span>
  );
}

export default Tag;
