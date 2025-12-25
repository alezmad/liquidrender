// Sidebar Component - Vertical navigation container with collapsible support
import React, { useState, useCallback } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, mergeStyles, generateId, baseStyles } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

interface NavItem {
  label: string;
  value?: unknown;
  children?: NavItem[];
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: {
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    backgroundColor: tokens.colors.card,
    borderRight: `1px solid ${tokens.colors.border}`,
    transition: `width ${tokens.transition.normal}`,
    overflow: 'hidden',
  } as React.CSSProperties,

  wrapperLeft: {
    borderRight: `1px solid ${tokens.colors.border}`,
    borderLeft: 'none',
  } as React.CSSProperties,

  wrapperRight: {
    borderLeft: `1px solid ${tokens.colors.border}`,
    borderRight: 'none',
  } as React.CSSProperties,

  wrapperCollapsed: {
    width: '60px',
  } as React.CSSProperties,

  wrapperExpanded: {
    width: '240px',
  } as React.CSSProperties,

  content: {
    flex: 1,
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
  } as React.CSSProperties,

  nav: {
    display: 'flex',
    flexDirection: 'column' as const,
    padding: tokens.spacing.sm,
    gap: tokens.spacing.xs,
  } as React.CSSProperties,

  navItem: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: tokens.spacing.sm,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: tokens.radius.md,
    cursor: 'pointer',
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
    textAlign: 'left' as const,
    transition: `all ${tokens.transition.fast}`,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
  } as React.CSSProperties,

  navItemHover: {
    backgroundColor: tokens.colors.accent,
  } as React.CSSProperties,

  navItemActive: {
    backgroundColor: tokens.colors.primary,
    color: tokens.colors.primaryForeground,
  } as React.CSSProperties,

  navItemCollapsed: {
    justifyContent: 'center',
    padding: tokens.spacing.sm,
  } as React.CSSProperties,

  navItemLabel: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as React.CSSProperties,

  navItemChevron: {
    marginLeft: 'auto',
    fontSize: tokens.fontSize.xs,
    transition: `transform ${tokens.transition.normal}`,
  } as React.CSSProperties,

  navItemChevronExpanded: {
    transform: 'rotate(90deg)',
  } as React.CSSProperties,

  nestedNav: {
    marginLeft: tokens.spacing.md,
    borderLeft: `1px solid ${tokens.colors.border}`,
    paddingLeft: tokens.spacing.sm,
  } as React.CSSProperties,

  nestedNavCollapsed: {
    display: 'none',
  } as React.CSSProperties,

  toggleButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: tokens.spacing.sm,
    backgroundColor: 'transparent',
    border: 'none',
    borderTop: `1px solid ${tokens.colors.border}`,
    cursor: 'pointer',
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
    transition: `all ${tokens.transition.fast}`,
  } as React.CSSProperties,

  toggleButtonHover: {
    backgroundColor: tokens.colors.accent,
    color: tokens.colors.foreground,
  } as React.CSSProperties,

  toggleIcon: {
    transition: `transform ${tokens.transition.normal}`,
  } as React.CSSProperties,

  toggleIconCollapsed: {
    transform: 'rotate(180deg)',
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert children blocks to nav items
 */
function extractNavItems(children: React.ReactNode): NavItem[] {
  const items: NavItem[] = [];

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      const props = child.props as LiquidComponentProps;
      const label = props.block?.label || String(resolveBinding(props.block?.binding, props.data) || 'Item');

      // Extract value for signal emission
      const value = props.block?.signals?.emit?.value;

      // Extract nested nav items
      const nestedItems = props.children ? extractNavItems(props.children) : undefined;

      items.push({ label, value, children: nestedItems });
    }
  });

  return items;
}

// ============================================================================
// Sub-components
// ============================================================================

interface NavItemComponentProps {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  onSelect: (value: unknown) => void;
  level?: number;
}

function NavItemComponent({
  item,
  isActive,
  isCollapsed,
  onSelect,
  level = 0,
}: NavItemComponentProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = useCallback(() => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    } else {
      onSelect(item.value ?? item.label);
    }
  }, [hasChildren, isExpanded, item.value, item.label, onSelect]);

  const itemStyle = mergeStyles(
    styles.navItem,
    isCollapsed ? styles.navItemCollapsed : {},
    isActive ? styles.navItemActive : {}
  );

  const chevronStyle = mergeStyles(
    styles.navItemChevron,
    isExpanded ? styles.navItemChevronExpanded : {}
  );

  const nestedNavStyle = mergeStyles(
    styles.nestedNav,
    (isCollapsed || !isExpanded) ? styles.nestedNavCollapsed : {}
  );

  return (
    <>
      <button
        onClick={handleClick}
        style={itemStyle}
        aria-current={isActive ? 'page' : undefined}
      >
        {!isCollapsed && (
          <span style={styles.navItemLabel}>{item.label}</span>
        )}
        {isCollapsed && (
          <span>{item.label.charAt(0).toUpperCase()}</span>
        )}
        {hasChildren && !isCollapsed && (
          <span style={chevronStyle}>▶</span>
        )}
      </button>
      {hasChildren && !isCollapsed && isExpanded && (
        <div style={nestedNavStyle}>
          {item.children!.map((child, idx) => (
            <NavItemComponent
              key={idx}
              item={child}
              isActive={false}
              isCollapsed={false}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Sidebar({ block, data, children }: LiquidComponentProps): React.ReactElement {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoverToggle, setHoverToggle] = useState(false);

  // Resolve active value from signal binding
  const activeValue = resolveBinding(block.binding, data);

  // Check if sidebar should start collapsed from flex modifier
  const startCollapsed = block.layout?.flex === 'collapse';
  React.useEffect(() => {
    if (startCollapsed !== undefined) {
      setIsCollapsed(startCollapsed);
    }
  }, [startCollapsed]);

  // Extract position (default: left)
  const position = block.layout?.flex === 'right' ? 'right' : 'left';

  // Extract nav items from children
  const navItems = React.useMemo(() => extractNavItems(children), [children]);

  // Handle nav item selection
  const handleSelect = useCallback((value: unknown) => {
    // Signal emission would be handled by parent context
    // For now, just log the selection
    console.log('Nav item selected:', value);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const wrapperStyle = mergeStyles(
    styles.wrapper,
    position === 'left' ? styles.wrapperLeft : styles.wrapperRight,
    isCollapsed ? styles.wrapperCollapsed : styles.wrapperExpanded
  );

  const toggleButtonStyle = mergeStyles(
    styles.toggleButton,
    hoverToggle ? styles.toggleButtonHover : {}
  );

  const toggleIconStyle = mergeStyles(
    styles.toggleIcon,
    isCollapsed ? styles.toggleIconCollapsed : {}
  );

  return (
    <aside
      data-liquid-type="sidebar"
      data-collapsed={isCollapsed}
      data-position={position}
      style={wrapperStyle}
    >
      <div style={styles.content}>
        <nav style={styles.nav} role="navigation">
          {navItems.map((item, idx) => (
            <NavItemComponent
              key={idx}
              item={item}
              isActive={activeValue === item.value || activeValue === item.label}
              isCollapsed={isCollapsed}
              onSelect={handleSelect}
            />
          ))}
        </nav>
      </div>
      <button
        onClick={toggleCollapsed}
        onMouseEnter={() => setHoverToggle(true)}
        onMouseLeave={() => setHoverToggle(false)}
        style={toggleButtonStyle}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!isCollapsed}
      >
        <span style={toggleIconStyle}>▶</span>
      </button>
    </aside>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

export interface StaticSidebarProps {
  items: Array<{
    label: string;
    value?: unknown;
    children?: Array<{ label: string; value?: unknown }>;
  }>;
  activeValue?: unknown;
  collapsed?: boolean;
  position?: 'left' | 'right';
  width?: number | string;
  onSelect?: (value: unknown) => void;
  onToggle?: (collapsed: boolean) => void;
  style?: React.CSSProperties;
}

export function StaticSidebar({
  items,
  activeValue,
  collapsed = false,
  position = 'left',
  width = 240,
  onSelect,
  onToggle,
  style: customStyle,
}: StaticSidebarProps): React.ReactElement {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [hoverToggle, setHoverToggle] = useState(false);

  const handleToggle = useCallback(() => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onToggle?.(newCollapsed);
  }, [isCollapsed, onToggle]);

  const handleSelect = useCallback((value: unknown) => {
    onSelect?.(value);
  }, [onSelect]);

  const wrapperStyle = mergeStyles(
    styles.wrapper,
    position === 'left' ? styles.wrapperLeft : styles.wrapperRight,
    isCollapsed ? styles.wrapperCollapsed : { width: typeof width === 'number' ? `${width}px` : width },
    customStyle
  );

  const toggleButtonStyle = mergeStyles(
    styles.toggleButton,
    hoverToggle ? styles.toggleButtonHover : {}
  );

  const toggleIconStyle = mergeStyles(
    styles.toggleIcon,
    isCollapsed ? styles.toggleIconCollapsed : {}
  );

  return (
    <aside
      data-liquid-type="sidebar"
      data-collapsed={isCollapsed}
      data-position={position}
      style={wrapperStyle}
    >
      <div style={styles.content}>
        <nav style={styles.nav} role="navigation">
          {items.map((item, idx) => (
            <NavItemComponent
              key={idx}
              item={item}
              isActive={activeValue === item.value || activeValue === item.label}
              isCollapsed={isCollapsed}
              onSelect={handleSelect}
            />
          ))}
        </nav>
      </div>
      <button
        onClick={handleToggle}
        onMouseEnter={() => setHoverToggle(true)}
        onMouseLeave={() => setHoverToggle(false)}
        style={toggleButtonStyle}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!isCollapsed}
      >
        <span style={toggleIconStyle}>▶</span>
      </button>
    </aside>
  );
}

export default Sidebar;
