// ContextMenu Component - Right-click triggered menu with nested submenus
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, generateId } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

export interface ContextMenuItem {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  children?: ContextMenuItem[];
  onClick?: () => void;
}

interface MenuPosition {
  x: number;
  y: number;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: {
    position: 'relative' as const,
    display: 'inline-block',
  } as React.CSSProperties,

  menu: mergeStyles(cardStyles(), {
    position: 'fixed' as const,
    zIndex: 100,
    minWidth: '12rem',
    padding: tokens.spacing.xs,
    boxShadow: tokens.shadow.lg,
    overflow: 'hidden',
  }),

  menuHidden: {
    display: 'none',
  } as React.CSSProperties,

  item: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    width: '100%',
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.foreground,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: tokens.radius.sm,
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: `background-color ${tokens.transition.fast}`,
    outline: 'none',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  itemHover: {
    backgroundColor: tokens.colors.accent,
  } as React.CSSProperties,

  itemFocus: {
    backgroundColor: tokens.colors.accent,
    outline: `2px solid ${tokens.colors.ring}`,
    outlineOffset: '-2px',
  } as React.CSSProperties,

  itemDisabled: {
    color: tokens.colors.mutedForeground,
    cursor: 'not-allowed',
    opacity: 0.5,
  } as React.CSSProperties,

  itemDanger: {
    color: tokens.colors.destructive,
  } as React.CSSProperties,

  itemIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1rem',
    height: '1rem',
    flexShrink: 0,
    color: tokens.colors.mutedForeground,
  } as React.CSSProperties,

  itemLabel: {
    flex: 1,
  } as React.CSSProperties,

  itemShortcut: {
    marginLeft: 'auto',
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
    paddingLeft: tokens.spacing.md,
  } as React.CSSProperties,

  itemSubmenuArrow: {
    marginLeft: 'auto',
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
  } as React.CSSProperties,

  separator: {
    height: '1px',
    margin: `${tokens.spacing.xs} 0`,
    backgroundColor: tokens.colors.border,
  } as React.CSSProperties,

  submenuWrapper: {
    position: 'relative' as const,
  } as React.CSSProperties,

  submenu: mergeStyles(cardStyles(), {
    position: 'absolute' as const,
    left: '100%',
    top: 0,
    zIndex: 101,
    minWidth: '10rem',
    padding: tokens.spacing.xs,
    boxShadow: tokens.shadow.lg,
    marginLeft: tokens.spacing.xs,
  }),

  empty: {
    padding: tokens.spacing.md,
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.mutedForeground,
    textAlign: 'center' as const,
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Calculate menu position to keep it within viewport bounds
 */
function calculatePosition(
  clickX: number,
  clickY: number,
  menuWidth: number,
  menuHeight: number
): MenuPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const padding = 8;

  let x = clickX;
  let y = clickY;

  // Adjust horizontal position if menu would overflow right edge
  if (x + menuWidth + padding > viewportWidth) {
    x = viewportWidth - menuWidth - padding;
  }

  // Adjust vertical position if menu would overflow bottom edge
  if (y + menuHeight + padding > viewportHeight) {
    y = viewportHeight - menuHeight - padding;
  }

  // Ensure menu doesn't go off-screen on left or top
  x = Math.max(padding, x);
  y = Math.max(padding, y);

  return { x, y };
}

/**
 * Parse menu items from block children
 */
function parseMenuItems(block: LiquidComponentProps['block']): ContextMenuItem[] {
  if (!block.children || block.children.length === 0) {
    return [];
  }

  return block.children.map((child, index) => {
    if (child.type === 'separator') {
      return { label: '', separator: true };
    }

    // Check for disabled state via condition or style.color='disabled'
    const isDisabled = child.condition?.state === 'disabled' || child.style?.color === 'disabled';
    const isDanger = child.style?.color === 'destructive' || child.style?.color === 'error';

    const item: ContextMenuItem = {
      id: `item-${index}`,
      label: child.label || '',
      disabled: isDisabled,
      danger: isDanger,
    };

    // Parse nested children as submenu
    if (child.children && child.children.length > 0) {
      item.children = child.children.map((subChild, subIndex) => {
        if (subChild.type === 'separator') {
          return { label: '', separator: true };
        }
        const subIsDisabled = subChild.condition?.state === 'disabled' || subChild.style?.color === 'disabled';
        const subIsDanger = subChild.style?.color === 'destructive' || subChild.style?.color === 'error';
        return {
          id: `item-${index}-${subIndex}`,
          label: subChild.label || '',
          disabled: subIsDisabled,
          danger: subIsDanger,
        };
      });
    }

    return item;
  });
}

// ============================================================================
// Sub-components
// ============================================================================

interface MenuItemProps {
  item: ContextMenuItem;
  isHovered: boolean;
  isFocused: boolean;
  onHover: () => void;
  onLeave: () => void;
  onSelect: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  tabIndex: number;
}

function MenuItem({
  item,
  isHovered,
  isFocused,
  onHover,
  onLeave,
  onSelect,
  onKeyDown,
  tabIndex,
}: MenuItemProps): React.ReactElement {
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const hasSubmenu = item.children && item.children.length > 0;

  const handleMouseEnter = useCallback(() => {
    onHover();
    if (hasSubmenu) {
      setSubmenuOpen(true);
    }
  }, [hasSubmenu, onHover]);

  const handleMouseLeave = useCallback(() => {
    onLeave();
    if (hasSubmenu) {
      setSubmenuOpen(false);
    }
  }, [hasSubmenu, onLeave]);

  const handleClick = useCallback(() => {
    if (item.disabled) return;
    if (!hasSubmenu) {
      onSelect();
      item.onClick?.();
    }
  }, [item, hasSubmenu, onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (hasSubmenu && (e.key === 'ArrowRight' || e.key === 'Enter')) {
        e.preventDefault();
        setSubmenuOpen(true);
      } else if (e.key === 'ArrowLeft' && submenuOpen) {
        e.preventDefault();
        setSubmenuOpen(false);
      } else {
        onKeyDown(e);
      }
    },
    [hasSubmenu, submenuOpen, onKeyDown]
  );

  const itemStyle = mergeStyles(
    styles.item,
    (isHovered || submenuOpen) && !item.disabled ? styles.itemHover : {},
    isFocused ? styles.itemFocus : {},
    item.disabled ? styles.itemDisabled : {},
    item.danger && !item.disabled ? styles.itemDanger : {}
  );

  return (
    <div style={styles.submenuWrapper} onMouseLeave={handleMouseLeave}>
      <button
        type="button"
        role="menuitem"
        style={itemStyle}
        disabled={item.disabled}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onKeyDown={handleKeyDown}
        tabIndex={tabIndex}
        aria-haspopup={hasSubmenu ? 'menu' : undefined}
        aria-expanded={hasSubmenu ? submenuOpen : undefined}
        aria-disabled={item.disabled}
      >
        {item.icon && <span style={styles.itemIcon}>{item.icon}</span>}
        <span style={styles.itemLabel}>{item.label}</span>
        {item.shortcut && <span style={styles.itemShortcut}>{item.shortcut}</span>}
        {hasSubmenu && <span style={styles.itemSubmenuArrow}>&#9656;</span>}
      </button>
      {hasSubmenu && submenuOpen && (
        <div role="menu" style={styles.submenu}>
          {item.children!.map((subItem, index) =>
            subItem.separator ? (
              <div key={`sep-${index}`} style={styles.separator} role="separator" />
            ) : (
              <MenuItem
                key={subItem.id || `sub-${index}`}
                item={subItem}
                isHovered={false}
                isFocused={false}
                onHover={() => {}}
                onLeave={() => {}}
                onSelect={onSelect}
                onKeyDown={() => {}}
                tabIndex={-1}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ContextMenu({ block, data, children }: LiquidComponentProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 });
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuId = generateId('contextmenu');

  const items = parseMenuItems(block);

  // Get non-separator items for keyboard navigation
  const navigableItems = items.filter((item) => !item.separator);

  // Handle context menu open
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const estimatedMenuHeight = items.length * 36 + 16;
    const estimatedMenuWidth = 192;
    const { x, y } = calculatePosition(e.clientX, e.clientY, estimatedMenuWidth, estimatedMenuHeight);
    setPosition({ x, y });
    setIsOpen(true);
    setFocusedIndex(0);
  }, [items.length]);

  // Close menu
  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
    setHoveredIndex(-1);
  }, []);

  // Handle item selection
  const handleSelect = useCallback(() => {
    closeMenu();
  }, [closeMenu]);

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    // Also close on right-click outside
    const handleContextMenuOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('contextmenu', handleContextMenuOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('contextmenu', handleContextMenuOutside);
    };
  }, [isOpen, closeMenu]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeMenu]);

  // Focus menu when opened
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const firstItem = menuRef.current.querySelector<HTMLButtonElement>('[role="menuitem"]');
      firstItem?.focus();
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < navigableItems.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev > 0 ? prev - 1 : navigableItems.length - 1
          );
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(navigableItems.length - 1);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0 && !navigableItems[focusedIndex]?.disabled) {
            navigableItems[focusedIndex]?.onClick?.();
            closeMenu();
          }
          break;
        case 'Tab':
          e.preventDefault();
          closeMenu();
          break;
      }
    },
    [isOpen, focusedIndex, navigableItems, closeMenu]
  );

  const menuStyle = mergeStyles(
    styles.menu,
    { left: position.x, top: position.y },
    !isOpen ? styles.menuHidden : {}
  );

  // Handle empty items
  if (items.length === 0) {
    return (
      <div
        data-liquid-type="contextmenu"
        ref={wrapperRef}
        style={styles.wrapper}
        onContextMenu={handleContextMenu}
      >
        {children}
        {isOpen && (
          <div ref={menuRef} role="menu" style={menuStyle} id={menuId}>
            <div style={styles.empty}>No menu items</div>
          </div>
        )}
      </div>
    );
  }

  let navigableIndex = -1;

  return (
    <div
      data-liquid-type="contextmenu"
      ref={wrapperRef}
      style={styles.wrapper}
      onContextMenu={handleContextMenu}
    >
      {children}
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          style={menuStyle}
          id={menuId}
          aria-label={block.label || 'Context menu'}
          onKeyDown={handleKeyDown}
        >
          {items.map((item, index) => {
            if (item.separator) {
              return <div key={`sep-${index}`} style={styles.separator} role="separator" />;
            }

            navigableIndex++;
            const currentIndex = navigableIndex;

            return (
              <MenuItem
                key={item.id || `item-${index}`}
                item={item}
                isHovered={hoveredIndex === currentIndex}
                isFocused={focusedIndex === currentIndex}
                onHover={() => setHoveredIndex(currentIndex)}
                onLeave={() => setHoveredIndex(-1)}
                onSelect={handleSelect}
                onKeyDown={handleKeyDown}
                tabIndex={focusedIndex === currentIndex ? 0 : -1}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Static Component
// ============================================================================

export interface StaticContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
  label?: string;
  disabled?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  style?: React.CSSProperties;
}

export function StaticContextMenu({
  items,
  children,
  label,
  disabled = false,
  onOpen,
  onClose,
  style: customStyle,
}: StaticContextMenuProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 });
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuId = generateId('contextmenu');

  const navigableItems = items.filter((item) => !item.separator);

  // Handle context menu open
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      const estimatedMenuHeight = items.length * 36 + 16;
      const estimatedMenuWidth = 192;
      const { x, y } = calculatePosition(e.clientX, e.clientY, estimatedMenuWidth, estimatedMenuHeight);
      setPosition({ x, y });
      setIsOpen(true);
      setFocusedIndex(0);
      onOpen?.();
    },
    [disabled, items.length, onOpen]
  );

  // Close menu
  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
    setHoveredIndex(-1);
    onClose?.();
  }, [onClose]);

  // Handle item selection
  const handleSelect = useCallback(() => {
    closeMenu();
  }, [closeMenu]);

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    const handleContextMenuOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('contextmenu', handleContextMenuOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('contextmenu', handleContextMenuOutside);
    };
  }, [isOpen, closeMenu]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeMenu]);

  // Focus menu when opened
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const firstItem = menuRef.current.querySelector<HTMLButtonElement>('[role="menuitem"]');
      firstItem?.focus();
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < navigableItems.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev > 0 ? prev - 1 : navigableItems.length - 1
          );
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(navigableItems.length - 1);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0 && !navigableItems[focusedIndex]?.disabled) {
            navigableItems[focusedIndex]?.onClick?.();
            closeMenu();
          }
          break;
        case 'Tab':
          e.preventDefault();
          closeMenu();
          break;
      }
    },
    [isOpen, focusedIndex, navigableItems, closeMenu]
  );

  const menuStyle = mergeStyles(
    styles.menu,
    { left: position.x, top: position.y },
    customStyle,
    !isOpen ? styles.menuHidden : {}
  );

  // Handle empty items
  if (items.length === 0) {
    return (
      <div ref={wrapperRef} style={styles.wrapper} onContextMenu={handleContextMenu}>
        {children}
        {isOpen && (
          <div ref={menuRef} role="menu" style={menuStyle} id={menuId}>
            <div style={styles.empty}>No menu items</div>
          </div>
        )}
      </div>
    );
  }

  let navigableIndex = -1;

  return (
    <div ref={wrapperRef} style={styles.wrapper} onContextMenu={handleContextMenu}>
      {children}
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          style={menuStyle}
          id={menuId}
          aria-label={label || 'Context menu'}
          onKeyDown={handleKeyDown}
        >
          {items.map((item, index) => {
            if (item.separator) {
              return <div key={`sep-${index}`} style={styles.separator} role="separator" />;
            }

            navigableIndex++;
            const currentIndex = navigableIndex;

            return (
              <MenuItem
                key={item.id || `item-${index}`}
                item={item}
                isHovered={hoveredIndex === currentIndex}
                isFocused={focusedIndex === currentIndex}
                onHover={() => setHoveredIndex(currentIndex)}
                onLeave={() => setHoveredIndex(-1)}
                onSelect={handleSelect}
                onKeyDown={handleKeyDown}
                tabIndex={focusedIndex === currentIndex ? 0 : -1}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ContextMenu;
