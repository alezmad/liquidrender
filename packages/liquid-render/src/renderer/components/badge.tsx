// Badge Component - Notification badge/dot overlay
import React, { useEffect, useRef, useState } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, baseStyles, mergeStyles, getBlockColor } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

type BadgeSize = 'xs' | 'sm' | 'md';

interface BadgeValue {
  value?: number | string | null;
  max?: number;
  dot?: boolean;
  size?: BadgeSize;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format badge value (numbers > max show "max+")
 */
function formatBadgeValue(value: number | string | null | undefined, max: number): string {
  if (value === null || value === undefined) return '';

  if (typeof value === 'number') {
    if (value <= 0) return ''; // Hide for zero/negative
    if (value > max) return `${max}+`;
    return String(value);
  }

  return String(value);
}

/**
 * Should the badge be visible?
 */
function shouldShowBadge(value: number | string | null | undefined, dot: boolean): boolean {
  if (dot) return true; // Dot-only badges always show
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'number' && value <= 0) return false;
  return true;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  badge: (size: BadgeSize, dot: boolean, color?: string): React.CSSProperties => {
    const sizeStyles: Record<BadgeSize, React.CSSProperties> = {
      xs: {
        minWidth: dot ? '6px' : '14px',
        height: dot ? '6px' : '14px',
        fontSize: tokens.fontSize.xs,
        padding: dot ? '0' : `0 ${tokens.spacing.xs}`,
        top: '-3px',
        right: '-3px',
      },
      sm: {
        minWidth: dot ? '8px' : '16px',
        height: dot ? '8px' : '16px',
        fontSize: tokens.fontSize.xs,
        padding: dot ? '0' : `0 4px`,
        top: '-4px',
        right: '-4px',
      },
      md: {
        minWidth: dot ? '10px' : '20px',
        height: dot ? '10px' : '20px',
        fontSize: tokens.fontSize.sm,
        padding: dot ? '0' : `0 ${tokens.spacing.xs}`,
        top: '-5px',
        right: '-5px',
      },
    };

    return mergeStyles(
      baseStyles(),
      {
        position: 'absolute',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: tokens.radius.full,
        backgroundColor: color || tokens.colors.destructive,
        color: '#ffffff',
        fontWeight: tokens.fontWeight.semibold,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        border: `2px solid ${tokens.colors.card}`,
        boxSizing: 'border-box',
      },
      sizeStyles[size]
    );
  },

  pulseAnimation: {
    animation: 'badge-pulse 0.3s ease-out',
  },
};

// Inject pulse animation keyframes
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes badge-pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(styleSheet);
}

// ============================================================================
// Main Component
// ============================================================================

export function Badge({ block, data }: LiquidComponentProps): React.ReactElement {
  // Resolve binding
  const rawValue = block.binding ? resolveBinding(block.binding, data) : null;

  // Extract badge configuration
  let badgeConfig: BadgeValue = {};

  if (typeof rawValue === 'object' && rawValue !== null && 'value' in rawValue) {
    // Object with explicit config: { value, max, dot, size }
    badgeConfig = rawValue as BadgeValue;
  } else {
    // Simple value (number or string)
    badgeConfig.value = rawValue as number | string | null;
  }

  const value = badgeConfig.value;
  const max = badgeConfig.max ?? 99;
  const dot = badgeConfig.dot ?? false;
  const size: BadgeSize = (badgeConfig.size as BadgeSize) ?? 'sm';

  // Get color from block style
  const color = getBlockColor(block);

  // Track previous value for pulse animation
  const prevValueRef = useRef(value);
  const [shouldPulse, setShouldPulse] = useState(false);

  useEffect(() => {
    if (prevValueRef.current !== value && value != null) {
      setShouldPulse(true);
      const timer = setTimeout(() => setShouldPulse(false), 300);
      prevValueRef.current = value;
      return () => clearTimeout(timer);
    }
    prevValueRef.current = value;
  }, [value]);

  // Hide badge if value is 0/null/empty
  if (!shouldShowBadge(value, dot)) {
    return <></>;
  }

  const displayText = dot ? '' : formatBadgeValue(value, max);

  const badgeStyle = mergeStyles(
    styles.badge(size, dot, color),
    shouldPulse ? styles.pulseAnimation : {}
  );

  return (
    <span
      data-liquid-type="badge"
      data-size={size}
      data-dot={dot.toString()}
      style={badgeStyle}
    >
      {displayText}
    </span>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

interface StaticBadgeProps {
  value?: number | string;
  max?: number;
  dot?: boolean;
  size?: BadgeSize;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function StaticBadge({
  value,
  max = 99,
  dot = false,
  size = 'sm',
  color,
  style: customStyle,
}: StaticBadgeProps): React.ReactElement {
  // Hide badge if value is 0/null/empty
  if (!shouldShowBadge(value, dot)) {
    return <></>;
  }

  const displayText = dot ? '' : formatBadgeValue(value, max);

  const badgeStyle = mergeStyles(
    styles.badge(size, dot, color),
    customStyle
  );

  return (
    <span
      data-liquid-type="badge"
      data-size={size}
      data-dot={dot.toString()}
      style={badgeStyle}
    >
      {displayText}
    </span>
  );
}

export default Badge;
