// Nav Component - Navigation menu item with optional submenu
import React, { useState, useCallback } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, mergeStyles } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

interface NavItemData {
  label?: string;
  signal?: string;
  disabled?: boolean;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    width: '100%',
  } as React.CSSProperties,

  trigger: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
    textAlign: 'left' as const,
    borderRadius: tokens.radius.md,
    transition: `all ${tokens.transition.fast}`,
    outline: 'none',
  } as React.CSSProperties,

  triggerHover: {
    backgroundColor: tokens.colors.accent,
  } as React.CSSProperties,

  triggerActive: {
    backgroundColor: `color-mix(in srgb, ${tokens.colors.primary} 10%, transparent)`,
    color: tokens.colors.primary,
    fontWeight: tokens.fontWeight.semibold,
  } as React.CSSProperties,

  triggerDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  } as React.CSSProperties,

  label: {
    flex: 1,
  } as React.CSSProperties,

  chevron: {
    fontSize: tokens.fontSize.xs,
    transition: `transform ${tokens.transition.normal}`,
    marginLeft: tokens.spacing.sm,
  } as React.CSSProperties,

  chevronExpanded: {
    transform: 'rotate(180deg)',
  } as React.CSSProperties,

  submenu: {
    paddingLeft: tokens.spacing.xl,
    overflow: 'hidden',
    transition: `all ${tokens.transition.normal}`,
  } as React.CSSProperties,

  submenuCollapsed: {
    maxHeight: 0,
    opacity: 0,
  } as React.CSSProperties,

  submenuExpanded: {
    maxHeight: '1000px',
    opacity: 1,
  } as React.CSSProperties,
};

// ============================================================================
// Main Component
// ============================================================================

export function Nav({ block, data, children }: LiquidComponentProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Resolve label from binding or use explicit label
  const resolvedData = resolveBinding(block.binding, data);
  const label = block.label || (typeof resolvedData === 'string' ? resolvedData : 'Nav Item');

  // Check if this nav has children (submenu)
  const hasChildren = Boolean(children && React.Children.count(children) > 0);

  // Extract signal from block
  const signal = block.signals?.emit;

  // Check disabled state (via style.color = 'disabled')
  const disabled = block.style?.color === 'disabled';

  // Check if active (would need signal context to determine this)
  // For now, we'll use a simple check if the signal matches current context
  const isActive = false; // TODO: Check against current signal value

  const handleClick = useCallback(() => {
    if (disabled) return;

    if (hasChildren) {
      // Toggle submenu
      setIsExpanded(prev => !prev);
    } else if (signal) {
      // Emit signal (would be handled by parent context)
      // For now, just log
      console.log('Nav emit signal:', signal);
    }
  }, [disabled, hasChildren, signal]);

  // Compute trigger style
  const triggerStyle = mergeStyles(
    styles.trigger,
    isHovered && !disabled ? styles.triggerHover : {},
    isActive ? styles.triggerActive : {},
    disabled ? styles.triggerDisabled : {}
  );

  // Compute chevron style
  const chevronStyle = mergeStyles(
    styles.chevron,
    isExpanded ? styles.chevronExpanded : {}
  );

  // Compute submenu style
  const submenuStyle = mergeStyles(
    styles.submenu,
    isExpanded ? styles.submenuExpanded : styles.submenuCollapsed
  );

  return (
    <div
      data-liquid-type="nav"
      data-active={isActive}
      data-has-children={hasChildren}
      data-expanded={isExpanded}
      style={styles.wrapper}
    >
      <button
        onClick={handleClick}
        disabled={disabled}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-disabled={disabled}
        style={triggerStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span style={styles.label}>{label}</span>
        {hasChildren && <span style={chevronStyle}>▼</span>}
      </button>
      {hasChildren && (
        <div
          className="nav-submenu"
          data-expanded={isExpanded}
          style={submenuStyle}
          aria-hidden={!isExpanded}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

export interface StaticNavProps {
  label: string;
  onClick?: () => void;
  children?: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
  defaultExpanded?: boolean;
  style?: React.CSSProperties;
}

export function StaticNav({
  label,
  onClick,
  children,
  disabled = false,
  active = false,
  defaultExpanded = false,
  style: customStyle,
}: StaticNavProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isHovered, setIsHovered] = useState(false);

  const hasChildren = Boolean(children && React.Children.count(children) > 0);

  const handleClick = useCallback(() => {
    if (disabled) return;

    if (hasChildren) {
      setIsExpanded(prev => !prev);
    } else if (onClick) {
      onClick();
    }
  }, [disabled, hasChildren, onClick]);

  const triggerStyle = mergeStyles(
    styles.trigger,
    isHovered && !disabled ? styles.triggerHover : {},
    active ? styles.triggerActive : {},
    disabled ? styles.triggerDisabled : {}
  );

  const chevronStyle = mergeStyles(
    styles.chevron,
    isExpanded ? styles.chevronExpanded : {}
  );

  const submenuStyle = mergeStyles(
    styles.submenu,
    isExpanded ? styles.submenuExpanded : styles.submenuCollapsed
  );

  return (
    <div
      data-liquid-type="nav"
      data-active={active}
      data-has-children={hasChildren}
      data-expanded={isExpanded}
      style={mergeStyles(styles.wrapper, customStyle)}
    >
      <button
        onClick={handleClick}
        disabled={disabled}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-disabled={disabled}
        style={triggerStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span style={styles.label}>{label}</span>
        {hasChildren && <span style={chevronStyle}>▼</span>}
      </button>
      {hasChildren && (
        <div
          className="nav-submenu"
          data-expanded={isExpanded}
          style={submenuStyle}
          aria-hidden={!isExpanded}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default Nav;
