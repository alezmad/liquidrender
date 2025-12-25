// Tooltip Component - Hover text display
// DSL: Tl "tooltip text" [trigger] or Tl :binding [trigger]
// Example: Tl "Help info" [Ic "info"], Tl :helpText [Bt "?"]
import React, { useState, useCallback, useRef } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, mergeStyles, generateId } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: {
    position: 'relative' as const,
    display: 'inline-block',
  } as React.CSSProperties,

  trigger: {
    cursor: 'help',
    outline: 'none',
    borderRadius: tokens.radius.sm,
  } as React.CSSProperties,

  triggerFocus: {
    outline: `2px solid ${tokens.colors.ring}`,
    outlineOffset: '2px',
  } as React.CSSProperties,

  content: {
    position: 'absolute' as const,
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: tokens.spacing.xs,
    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
    backgroundColor: tokens.colors.foreground,
    color: tokens.colors.background,
    borderRadius: tokens.radius.sm,
    fontSize: tokens.fontSize.xs,
    whiteSpace: 'nowrap' as const,
    zIndex: 100,
    pointerEvents: 'none' as const,
  } as React.CSSProperties,

  contentHidden: {
    visibility: 'hidden' as const,
    opacity: 0,
  } as React.CSSProperties,

  contentVisible: {
    visibility: 'visible' as const,
    opacity: 1,
  } as React.CSSProperties,

  arrow: {
    position: 'absolute' as const,
    bottom: '-4px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '4px solid transparent',
    borderRight: '4px solid transparent',
    borderTop: `4px solid ${tokens.colors.foreground}`,
  } as React.CSSProperties,
};

// ============================================================================
// Main Component
// ============================================================================

export function Tooltip({ block, data, children }: LiquidComponentProps): React.ReactElement {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipId = generateId('tooltip');

  // Resolve tooltip text from label or binding
  const tooltipText = block.label || resolveBinding(block.binding, data) || '';

  const handleMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 200); // Delay before showing
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  const contentStyle = mergeStyles(
    styles.content,
    isVisible ? styles.contentVisible : styles.contentHidden
  );

  return (
    <span
      data-liquid-type="tooltip"
      style={styles.wrapper}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      <span style={styles.trigger} aria-describedby={tooltipId}>
        {children}
      </span>
      <span id={tooltipId} role="tooltip" style={contentStyle}>
        {String(tooltipText)}
        <span style={styles.arrow} />
      </span>
    </span>
  );
}

// ============================================================================
// Static Tooltip
// ============================================================================

export interface StaticTooltipProps {
  text: string;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  style?: React.CSSProperties;
}

export function StaticTooltip({
  text,
  children,
  placement = 'top',
  delay = 200,
  style: customStyle,
}: StaticTooltipProps): React.ReactElement {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipId = generateId('tooltip');

  const handleMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  // Placement styles
  const placementStyles: Record<string, React.CSSProperties> = {
    top: { bottom: '100%', top: 'auto', marginBottom: tokens.spacing.xs },
    bottom: { top: '100%', bottom: 'auto', marginTop: tokens.spacing.xs },
    left: { right: '100%', left: 'auto', top: '50%', transform: 'translateY(-50%)' },
    right: { left: '100%', right: 'auto', top: '50%', transform: 'translateY(-50%)' },
  };

  const contentStyle = mergeStyles(
    styles.content,
    placementStyles[placement],
    isVisible ? styles.contentVisible : styles.contentHidden,
    customStyle
  );

  return (
    <span
      style={styles.wrapper}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      <span style={styles.trigger} aria-describedby={tooltipId}>
        {children}
      </span>
      <span id={tooltipId} role="tooltip" style={contentStyle}>
        {text}
      </span>
    </span>
  );
}

export default Tooltip;
