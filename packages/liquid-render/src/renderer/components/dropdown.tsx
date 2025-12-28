// Dropdown Component - Menu-focused dropdown with keyboard navigation and submenus
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, buttonStyles, generateId, isBrowser } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

export interface DropdownItem {
  label: string;
  value?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  separator?: boolean;
  /** Nested submenu items */
  items?: DropdownItem[];
  /** Item type: regular item, checkbox, or radio */
  type?: 'item' | 'checkbox' | 'radio';
  /** Whether checkbox/radio is checked */
  checked?: boolean;
  /** Radio group name for grouping radio items */
  group?: string;
  /** Callback when item is clicked (for standalone usage) */
  onClick?: () => void;
}

export interface StaticDropdownProps {
  items: DropdownItem[];
  trigger?: React.ReactNode;
  label?: string;
  placeholder?: string;
  defaultOpen?: boolean;
  disabled?: boolean;
  onSelect?: (value: string, item: DropdownItem) => void;
  /** Callback when checkbox/radio item is toggled */
  onCheckedChange?: (value: string, checked: boolean, item: DropdownItem) => void;
  style?: React.CSSProperties;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: {
    position: 'relative' as const,
    display: 'inline-block',
    fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
  } as React.CSSProperties,

  trigger: mergeStyles(
    buttonStyles('outline', 'md'),
    {
      display: 'inline-flex',
      alignItems: 'center',
      gap: tokens.spacing.sm,
      minWidth: '8rem',
      justifyContent: 'space-between',
    }
  ),

  triggerDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    pointerEvents: 'none' as const,
  } as React.CSSProperties,

  chevron: {
    width: '1rem',
    height: '1rem',
    transition: `transform ${tokens.transition.fast}`,
  } as React.CSSProperties,

  chevronOpen: {
    transform: 'rotate(180deg)',
  } as React.CSSProperties,

  menu: mergeStyles(
    cardStyles(),
    {
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      marginTop: tokens.spacing.xs,
      minWidth: '100%',
      maxHeight: '20rem',
      overflowY: 'auto' as const,
      zIndex: 50,
      padding: tokens.spacing.xs,
    }
  ),

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
  } as React.CSSProperties,

  itemHover: {
    backgroundColor: tokens.colors.accent,
  } as React.CSSProperties,

  itemFocused: {
    backgroundColor: tokens.colors.accent,
    outline: `2px solid ${tokens.colors.ring}`,
    outlineOffset: '-2px',
  } as React.CSSProperties,

  itemDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    pointerEvents: 'none' as const,
  } as React.CSSProperties,

  itemIcon: {
    width: '1rem',
    height: '1rem',
    flexShrink: 0,
  } as React.CSSProperties,

  separator: {
    height: '1px',
    backgroundColor: tokens.colors.border,
    margin: `${tokens.spacing.xs} 0`,
  } as React.CSSProperties,

  empty: {
    padding: tokens.spacing.md,
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    textAlign: 'center' as const,
  } as React.CSSProperties,

  // Checkbox/Radio styles
  itemCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  } as React.CSSProperties,

  checkboxIndicator: {
    width: '1rem',
    height: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderRadius: tokens.radius.sm,
    border: `1px solid ${tokens.colors.border}`,
    backgroundColor: 'transparent',
    transition: `all ${tokens.transition.fast}`,
  } as React.CSSProperties,

  checkboxIndicatorChecked: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  } as React.CSSProperties,

  radioIndicator: {
    width: '1rem',
    height: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderRadius: tokens.radius.full,
    border: `1px solid ${tokens.colors.border}`,
    backgroundColor: 'transparent',
    transition: `all ${tokens.transition.fast}`,
  } as React.CSSProperties,

  radioIndicatorChecked: {
    borderColor: tokens.colors.primary,
  } as React.CSSProperties,

  radioInnerDot: {
    width: '0.5rem',
    height: '0.5rem',
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.primary,
  } as React.CSSProperties,

  // Submenu styles
  itemWithSubmenu: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as React.CSSProperties,

  submenuArrow: {
    width: '1rem',
    height: '1rem',
    marginLeft: 'auto',
    flexShrink: 0,
  } as React.CSSProperties,

  submenuWrapper: {
    position: 'relative' as const,
  } as React.CSSProperties,

  submenu: mergeStyles(
    cardStyles(),
    {
      position: 'absolute' as const,
      left: '100%',
      top: 0,
      marginLeft: tokens.spacing.xs,
      minWidth: '10rem',
      maxHeight: '20rem',
      overflowY: 'auto' as const,
      zIndex: 51,
      padding: tokens.spacing.xs,
    }
  ),

  submenuLeft: {
    left: 'auto',
    right: '100%',
    marginLeft: 0,
    marginRight: tokens.spacing.xs,
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract dropdown items from block children
 */
function extractDropdownItems(block: LiquidComponentProps['block']): DropdownItem[] {
  if (!block.children || block.children.length === 0) {
    return [];
  }

  return block.children.map(child => ({
    label: child.label || '',
    value: child.binding?.value as string || child.label || '',
    disabled: child.style?.color === 'disabled',
    separator: child.type === 'separator',
  }));
}

/**
 * Chevron down icon
 */
function ChevronDownIcon({ style }: { style?: React.CSSProperties }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/**
 * Chevron right icon for submenu indicators
 */
function ChevronRightIcon({ style }: { style?: React.CSSProperties }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/**
 * Check icon for checkbox items
 */
function CheckIcon({ style }: { style?: React.CSSProperties }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: '0.75rem', height: '0.75rem', color: tokens.colors.primaryForeground, ...style }}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/**
 * Render checkbox indicator
 */
function CheckboxIndicator({ checked }: { checked: boolean }): React.ReactElement {
  const indicatorStyle = mergeStyles(
    styles.checkboxIndicator,
    checked ? styles.checkboxIndicatorChecked : undefined
  );

  return (
    <span style={indicatorStyle} aria-hidden="true">
      {checked && <CheckIcon />}
    </span>
  );
}

/**
 * Render radio indicator
 */
function RadioIndicator({ checked }: { checked: boolean }): React.ReactElement {
  const indicatorStyle = mergeStyles(
    styles.radioIndicator,
    checked ? styles.radioIndicatorChecked : undefined
  );

  return (
    <span style={indicatorStyle} aria-hidden="true">
      {checked && <span style={styles.radioInnerDot} />}
    </span>
  );
}

/**
 * Check if item has a submenu
 */
function hasSubmenu(item: DropdownItem): boolean {
  return !!(item.items && item.items.length > 0);
}

/**
 * Check if item is a checkbox
 */
function isCheckboxItem(item: DropdownItem): boolean {
  return item.type === 'checkbox';
}

/**
 * Check if item is a radio
 */
function isRadioItem(item: DropdownItem): boolean {
  return item.type === 'radio';
}

/**
 * Check if item is checkable (checkbox or radio)
 */
function isCheckableItem(item: DropdownItem): boolean {
  return isCheckboxItem(item) || isRadioItem(item);
}

/**
 * Calculate if submenu should open to the left to avoid viewport overflow
 */
function shouldOpenLeft(element: HTMLElement | null): boolean {
  if (!isBrowser || !element) return false;

  const rect = element.getBoundingClientRect();
  const submenuWidth = 160; // Approximate submenu width (10rem)
  const viewportWidth = window.innerWidth;

  // Check if there's not enough space on the right
  return rect.right + submenuWidth > viewportWidth;
}

// ============================================================================
// Sub-components
// ============================================================================

/** Delay in ms before opening submenu on hover */
const SUBMENU_OPEN_DELAY = 150;

interface SubmenuProps {
  items: DropdownItem[];
  parentElement: HTMLElement | null;
  onSelect: (item: DropdownItem) => void;
  onClose: () => void;
  depth?: number;
}

/**
 * Recursive submenu component with keyboard navigation
 */
function Submenu({
  items,
  parentElement,
  onSelect,
  onClose,
  depth = 1,
}: SubmenuProps): React.ReactElement {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState<number | null>(null);
  const [openLeft, setOpenLeft] = useState(false);
  const submenuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const submenuId = generateId(`submenu-${depth}`);

  // Filter out separators for navigation
  const navigableIndices = items
    .map((item, index) => (item.separator ? -1 : index))
    .filter(index => index !== -1);

  // Calculate submenu position on mount
  useEffect(() => {
    if (parentElement) {
      setOpenLeft(shouldOpenLeft(parentElement));
    }
  }, [parentElement]);

  // Focus first item on mount
  useEffect(() => {
    if (navigableIndices.length > 0) {
      const firstIndex = navigableIndices[0]!;
      setFocusedIndex(firstIndex);
      setTimeout(() => {
        itemRefs.current[firstIndex]?.focus();
      }, 0);
    }
  }, []);

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleItemHover = useCallback((index: number, item: DropdownItem) => {
    // Clear any pending hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    setFocusedIndex(index);

    if (hasSubmenu(item)) {
      // Delay opening submenu
      hoverTimeoutRef.current = setTimeout(() => {
        setOpenSubmenuIndex(index);
      }, SUBMENU_OPEN_DELAY);
    } else {
      // Close any open submenu when hovering non-submenu item
      setOpenSubmenuIndex(null);
    }
  }, []);

  const handleItemLeave = useCallback(() => {
    // Clear pending hover timeout when leaving item
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentNavIndex = navigableIndices.indexOf(focusedIndex);
    const currentItem = items[focusedIndex];

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        e.stopPropagation();
        const nextNavIndex = currentNavIndex + 1;
        if (nextNavIndex < navigableIndices.length) {
          const nextIndex = navigableIndices[nextNavIndex]!;
          setFocusedIndex(nextIndex);
          setOpenSubmenuIndex(null);
          itemRefs.current[nextIndex]?.focus();
        }
        break;
      }

      case 'ArrowUp': {
        e.preventDefault();
        e.stopPropagation();
        const prevNavIndex = currentNavIndex - 1;
        if (prevNavIndex >= 0) {
          const prevIndex = navigableIndices[prevNavIndex]!;
          setFocusedIndex(prevIndex);
          setOpenSubmenuIndex(null);
          itemRefs.current[prevIndex]?.focus();
        }
        break;
      }

      case 'ArrowRight': {
        e.preventDefault();
        e.stopPropagation();
        // If current item has submenu, open it
        if (currentItem && hasSubmenu(currentItem)) {
          setOpenSubmenuIndex(focusedIndex);
        }
        break;
      }

      case 'ArrowLeft': {
        e.preventDefault();
        e.stopPropagation();
        // Close this submenu and return to parent
        onClose();
        break;
      }

      case 'Enter':
      case ' ': {
        e.preventDefault();
        e.stopPropagation();
        if (currentItem && !currentItem.separator && !currentItem.disabled) {
          if (hasSubmenu(currentItem)) {
            setOpenSubmenuIndex(focusedIndex);
          } else {
            onSelect(currentItem);
          }
        }
        break;
      }

      case 'Escape': {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        break;
      }
    }
  }, [focusedIndex, navigableIndices, items, onSelect, onClose]);

  const submenuStyle = mergeStyles(
    styles.submenu,
    openLeft ? styles.submenuLeft : undefined
  );

  return (
    <div
      ref={submenuRef}
      id={submenuId}
      role="menu"
      style={submenuStyle}
      onKeyDown={handleKeyDown}
    >
      {items.map((item, index) => {
        if (item.separator) {
          return <div key={index} style={styles.separator} role="separator" />;
        }

        const isFocused = index === focusedIndex;
        const itemHasSubmenu = hasSubmenu(item);
        const isSubmenuOpen = openSubmenuIndex === index;
        const isCheckbox = isCheckboxItem(item);
        const isRadio = isRadioItem(item);
        const isCheckable = isCheckbox || isRadio;

        // Determine aria role based on item type
        const role = isCheckbox ? 'menuitemcheckbox' : isRadio ? 'menuitemradio' : 'menuitem';

        const itemStyle = mergeStyles(
          styles.item,
          itemHasSubmenu ? styles.itemWithSubmenu : undefined,
          isCheckable ? styles.itemCheckbox : undefined,
          isFocused ? styles.itemFocused : undefined,
          item.disabled ? styles.itemDisabled : undefined
        );

        return (
          <div key={index} style={styles.submenuWrapper}>
            <button
              ref={el => { itemRefs.current[index] = el; }}
              type="button"
              role={role}
              tabIndex={isFocused ? 0 : -1}
              disabled={item.disabled}
              style={itemStyle}
              aria-haspopup={itemHasSubmenu ? 'menu' : undefined}
              aria-expanded={itemHasSubmenu ? isSubmenuOpen : undefined}
              aria-checked={isCheckable ? item.checked : undefined}
              onClick={() => {
                if (!item.disabled && !itemHasSubmenu) {
                  onSelect(item);
                } else if (itemHasSubmenu) {
                  setOpenSubmenuIndex(isSubmenuOpen ? null : index);
                }
              }}
              onMouseEnter={() => handleItemHover(index, item)}
              onMouseLeave={handleItemLeave}
              onFocus={() => setFocusedIndex(index)}
            >
              {/* Checkbox/Radio indicator */}
              {isCheckbox && <CheckboxIndicator checked={!!item.checked} />}
              {isRadio && <RadioIndicator checked={!!item.checked} />}
              {/* Icon (if not checkbox/radio) */}
              {!isCheckable && item.icon && <span style={styles.itemIcon}>{item.icon}</span>}
              <span style={{ flex: 1 }}>{item.label}</span>
              {itemHasSubmenu && <ChevronRightIcon style={styles.submenuArrow} />}
            </button>

            {/* Render nested submenu */}
            {itemHasSubmenu && isSubmenuOpen && (
              <Submenu
                items={item.items!}
                parentElement={itemRefs.current[index] ?? null}
                onSelect={onSelect}
                onClose={() => {
                  setOpenSubmenuIndex(null);
                  itemRefs.current[index]?.focus();
                }}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface DropdownMenuItemProps {
  item: DropdownItem;
  index: number;
  focusedIndex: number;
  onSelect: (item: DropdownItem) => void;
  onFocus: (index: number) => void;
  onSubmenuOpen: (index: number | null) => void;
  openSubmenuIndex: number | null;
  itemRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
}

function DropdownMenuItem({
  item,
  index,
  focusedIndex,
  onSelect,
  onFocus,
  onSubmenuOpen,
  openSubmenuIndex,
  itemRefs,
}: DropdownMenuItemProps): React.ReactElement {
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const itemRef = useRef<HTMLButtonElement | null>(null);

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  if (item.separator) {
    return <div style={styles.separator} role="separator" />;
  }

  const isFocused = index === focusedIndex;
  const itemHasSubmenu = hasSubmenu(item);
  const isSubmenuOpen = openSubmenuIndex === index;
  const isCheckbox = isCheckboxItem(item);
  const isRadio = isRadioItem(item);
  const isCheckable = isCheckbox || isRadio;

  // Determine aria role based on item type
  const role = isCheckbox ? 'menuitemcheckbox' : isRadio ? 'menuitemradio' : 'menuitem';

  const itemStyle = mergeStyles(
    styles.item,
    itemHasSubmenu ? styles.itemWithSubmenu : undefined,
    isCheckable ? styles.itemCheckbox : undefined,
    isFocused ? styles.itemFocused : undefined,
    item.disabled ? styles.itemDisabled : undefined
  );

  const handleMouseEnter = () => {
    onFocus(index);

    // Clear any pending timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    if (itemHasSubmenu) {
      // Delay opening submenu
      hoverTimeoutRef.current = setTimeout(() => {
        onSubmenuOpen(index);
      }, SUBMENU_OPEN_DELAY);
    } else {
      // Close any open submenu
      onSubmenuOpen(null);
    }
  };

  const handleMouseLeave = () => {
    // Clear pending timeout when leaving
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleClick = () => {
    if (item.disabled) return;

    if (itemHasSubmenu) {
      onSubmenuOpen(isSubmenuOpen ? null : index);
    } else {
      onSelect(item);
    }
  };

  return (
    <div style={styles.submenuWrapper}>
      <button
        ref={el => {
          itemRefs.current[index] = el;
          itemRef.current = el;
        }}
        type="button"
        role={role}
        tabIndex={isFocused ? 0 : -1}
        disabled={item.disabled}
        style={itemStyle}
        aria-haspopup={itemHasSubmenu ? 'menu' : undefined}
        aria-expanded={itemHasSubmenu ? isSubmenuOpen : undefined}
        aria-checked={isCheckable ? item.checked : undefined}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={() => onFocus(index)}
      >
        {/* Checkbox/Radio indicator */}
        {isCheckbox && <CheckboxIndicator checked={!!item.checked} />}
        {isRadio && <RadioIndicator checked={!!item.checked} />}
        {/* Icon (if not checkbox/radio) */}
        {!isCheckable && item.icon && <span style={styles.itemIcon}>{item.icon}</span>}
        <span style={{ flex: 1 }}>{item.label}</span>
        {itemHasSubmenu && <ChevronRightIcon style={styles.submenuArrow} />}
      </button>

      {/* Render nested submenu */}
      {itemHasSubmenu && isSubmenuOpen && (
        <Submenu
          items={item.items!}
          parentElement={itemRef.current}
          onSelect={onSelect}
          onClose={() => {
            onSubmenuOpen(null);
            itemRefs.current[index]?.focus();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Dropdown({ block, data }: LiquidComponentProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = generateId('dropdown-menu');

  // Get trigger label from block
  const label = block.label || 'Select...';

  // Resolve bound items or use children
  const boundData = resolveBinding(block.binding, data);
  let items: DropdownItem[];

  if (Array.isArray(boundData)) {
    // Data binding provided array of items
    items = boundData.map((item: unknown) => {
      if (typeof item === 'string') {
        return { label: item, value: item };
      }
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        return {
          label: String(obj.label || obj.name || obj.title || ''),
          value: String(obj.value || obj.id || obj.label || ''),
          disabled: Boolean(obj.disabled),
          separator: Boolean(obj.separator),
          items: Array.isArray(obj.items) ? obj.items as DropdownItem[] : undefined,
        };
      }
      return { label: String(item), value: String(item) };
    });
  } else {
    // Use block children
    items = extractDropdownItems(block);
  }

  // Filter out separators for navigation
  const navigableIndices = items
    .map((item, index) => (item.separator ? -1 : index))
    .filter(index => index !== -1);

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
        setOpenSubmenuIndex(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setFocusedIndex(-1);
        setOpenSubmenuIndex(null);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Focus first item when menu opens
  useEffect(() => {
    if (isOpen && navigableIndices.length > 0) {
      const firstIndex = navigableIndices[0]!;
      setFocusedIndex(firstIndex);
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        itemRefs.current[firstIndex]?.focus();
      }, 0);
    }
  }, [isOpen, navigableIndices.length]);

  // Reset submenu state when menu closes
  useEffect(() => {
    if (!isOpen) {
      setOpenSubmenuIndex(null);
    }
  }, [isOpen]);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleSelect = useCallback((item: DropdownItem) => {
    if (item.disabled) return;

    // Handle checkbox/radio items - don't close menu
    if (isCheckableItem(item)) {
      item.onClick?.();
      return;
    }

    // Regular item selection
    setIsOpen(false);
    setFocusedIndex(-1);
    setOpenSubmenuIndex(null);
    triggerRef.current?.focus();
    item.onClick?.();
    // Selection could emit signal here if needed
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const currentNavIndex = navigableIndices.indexOf(focusedIndex);
    const currentItem = items[focusedIndex];

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const nextNavIndex = currentNavIndex + 1;
        if (nextNavIndex < navigableIndices.length) {
          const nextIndex = navigableIndices[nextNavIndex]!;
          setFocusedIndex(nextIndex);
          setOpenSubmenuIndex(null);
          itemRefs.current[nextIndex]?.focus();
        }
        break;
      }

      case 'ArrowUp': {
        e.preventDefault();
        const prevNavIndex = currentNavIndex - 1;
        if (prevNavIndex >= 0) {
          const prevIndex = navigableIndices[prevNavIndex]!;
          setFocusedIndex(prevIndex);
          setOpenSubmenuIndex(null);
          itemRefs.current[prevIndex]?.focus();
        }
        break;
      }

      case 'ArrowRight': {
        // If current item has submenu, open it
        if (currentItem && hasSubmenu(currentItem)) {
          e.preventDefault();
          setOpenSubmenuIndex(focusedIndex);
        }
        break;
      }

      case 'ArrowLeft': {
        // Close any open submenu
        if (openSubmenuIndex !== null) {
          e.preventDefault();
          setOpenSubmenuIndex(null);
          itemRefs.current[focusedIndex]?.focus();
        }
        break;
      }

      case 'Home': {
        e.preventDefault();
        if (navigableIndices.length > 0) {
          const firstIndex = navigableIndices[0]!;
          setFocusedIndex(firstIndex);
          setOpenSubmenuIndex(null);
          itemRefs.current[firstIndex]?.focus();
        }
        break;
      }

      case 'End': {
        e.preventDefault();
        if (navigableIndices.length > 0) {
          const lastIndex = navigableIndices[navigableIndices.length - 1]!;
          setFocusedIndex(lastIndex);
          setOpenSubmenuIndex(null);
          itemRefs.current[lastIndex]?.focus();
        }
        break;
      }

      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (focusedIndex >= 0 && currentItem && !currentItem.separator) {
          if (hasSubmenu(currentItem)) {
            setOpenSubmenuIndex(focusedIndex);
          } else {
            handleSelect(currentItem);
          }
        }
        break;
      }

      case 'Tab': {
        setIsOpen(false);
        setFocusedIndex(-1);
        setOpenSubmenuIndex(null);
        break;
      }
    }
  }, [isOpen, focusedIndex, navigableIndices, items, openSubmenuIndex, handleSelect]);

  const chevronStyle = mergeStyles(
    styles.chevron,
    isOpen ? styles.chevronOpen : undefined
  );

  const menuStyle = mergeStyles(
    styles.menu,
    !isOpen ? styles.menuHidden : undefined
  );

  // Empty state
  if (items.length === 0) {
    return (
      <div data-liquid-type="dropdown" ref={wrapperRef} style={styles.wrapper}>
        <button
          ref={triggerRef}
          type="button"
          style={mergeStyles(styles.trigger, styles.triggerDisabled)}
          disabled
        >
          <span>{label}</span>
          <ChevronDownIcon style={styles.chevron} />
        </button>
      </div>
    );
  }

  return (
    <div
      data-liquid-type="dropdown"
      ref={wrapperRef}
      style={styles.wrapper}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        style={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
      >
        <span>{label}</span>
        <ChevronDownIcon style={chevronStyle} />
      </button>

      <div
        id={menuId}
        role="menu"
        aria-label={label}
        style={menuStyle}
      >
        {items.map((item, index) => (
          <DropdownMenuItem
            key={index}
            item={item}
            index={index}
            focusedIndex={focusedIndex}
            onSelect={handleSelect}
            onFocus={setFocusedIndex}
            onSubmenuOpen={setOpenSubmenuIndex}
            openSubmenuIndex={openSubmenuIndex}
            itemRefs={itemRefs}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

export function StaticDropdown({
  items,
  trigger,
  label = 'Select...',
  placeholder,
  defaultOpen = false,
  disabled = false,
  onSelect,
  onCheckedChange,
  style: customStyle,
}: StaticDropdownProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = generateId('dropdown-menu');

  // Filter out separators for navigation
  const navigableIndices = items
    .map((item, index) => (item.separator ? -1 : index))
    .filter(index => index !== -1);

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
        setOpenSubmenuIndex(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setFocusedIndex(-1);
        setOpenSubmenuIndex(null);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Focus first item when menu opens
  useEffect(() => {
    if (isOpen && navigableIndices.length > 0) {
      const firstIndex = navigableIndices[0]!;
      setFocusedIndex(firstIndex);
      setTimeout(() => {
        itemRefs.current[firstIndex]?.focus();
      }, 0);
    }
  }, [isOpen, navigableIndices.length]);

  // Reset submenu state when menu closes
  useEffect(() => {
    if (!isOpen) {
      setOpenSubmenuIndex(null);
    }
  }, [isOpen]);

  const toggleOpen = useCallback(() => {
    if (!disabled) {
      setIsOpen(prev => !prev);
    }
  }, [disabled]);

  const handleSelect = useCallback((item: DropdownItem) => {
    if (item.disabled) return;

    // Handle checkbox/radio items
    if (isCheckableItem(item)) {
      const newChecked = !item.checked;
      onCheckedChange?.(item.value || item.label, newChecked, item);
      // Call onClick if provided
      item.onClick?.();
      // Don't close menu for checkbox/radio items - let parent control state
      return;
    }

    // Regular item selection
    setIsOpen(false);
    setFocusedIndex(-1);
    setOpenSubmenuIndex(null);
    triggerRef.current?.focus();
    item.onClick?.();
    onSelect?.(item.value || item.label, item);
  }, [onSelect, onCheckedChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const currentNavIndex = navigableIndices.indexOf(focusedIndex);
    const currentItem = items[focusedIndex];

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const nextNavIndex = currentNavIndex + 1;
        if (nextNavIndex < navigableIndices.length) {
          const nextIndex = navigableIndices[nextNavIndex]!;
          setFocusedIndex(nextIndex);
          setOpenSubmenuIndex(null);
          itemRefs.current[nextIndex]?.focus();
        }
        break;
      }

      case 'ArrowUp': {
        e.preventDefault();
        const prevNavIndex = currentNavIndex - 1;
        if (prevNavIndex >= 0) {
          const prevIndex = navigableIndices[prevNavIndex]!;
          setFocusedIndex(prevIndex);
          setOpenSubmenuIndex(null);
          itemRefs.current[prevIndex]?.focus();
        }
        break;
      }

      case 'ArrowRight': {
        // If current item has submenu, open it
        if (currentItem && hasSubmenu(currentItem)) {
          e.preventDefault();
          setOpenSubmenuIndex(focusedIndex);
        }
        break;
      }

      case 'ArrowLeft': {
        // Close any open submenu
        if (openSubmenuIndex !== null) {
          e.preventDefault();
          setOpenSubmenuIndex(null);
          itemRefs.current[focusedIndex]?.focus();
        }
        break;
      }

      case 'Home': {
        e.preventDefault();
        if (navigableIndices.length > 0) {
          const firstIndex = navigableIndices[0]!;
          setFocusedIndex(firstIndex);
          setOpenSubmenuIndex(null);
          itemRefs.current[firstIndex]?.focus();
        }
        break;
      }

      case 'End': {
        e.preventDefault();
        if (navigableIndices.length > 0) {
          const lastIndex = navigableIndices[navigableIndices.length - 1]!;
          setFocusedIndex(lastIndex);
          setOpenSubmenuIndex(null);
          itemRefs.current[lastIndex]?.focus();
        }
        break;
      }

      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (focusedIndex >= 0 && currentItem && !currentItem.separator) {
          if (hasSubmenu(currentItem)) {
            setOpenSubmenuIndex(focusedIndex);
          } else {
            handleSelect(currentItem);
          }
        }
        break;
      }

      case 'Tab': {
        setIsOpen(false);
        setFocusedIndex(-1);
        setOpenSubmenuIndex(null);
        break;
      }
    }
  }, [disabled, isOpen, focusedIndex, navigableIndices, items, openSubmenuIndex, handleSelect]);

  const wrapperStyle = mergeStyles(styles.wrapper, customStyle);

  const triggerStyle = mergeStyles(
    styles.trigger,
    disabled ? styles.triggerDisabled : undefined
  );

  const chevronStyle = mergeStyles(
    styles.chevron,
    isOpen ? styles.chevronOpen : undefined
  );

  const menuStyle = mergeStyles(
    styles.menu,
    !isOpen ? styles.menuHidden : undefined
  );

  const displayLabel = placeholder || label;

  return (
    <div
      ref={wrapperRef}
      style={wrapperStyle}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        style={triggerStyle}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
      >
        {trigger || (
          <>
            <span>{displayLabel}</span>
            <ChevronDownIcon style={chevronStyle} />
          </>
        )}
      </button>

      <div
        id={menuId}
        role="menu"
        aria-label={displayLabel}
        style={menuStyle}
      >
        {items.length === 0 ? (
          <div style={styles.empty}>No options available</div>
        ) : (
          items.map((item, index) => (
            <DropdownMenuItem
              key={index}
              item={item}
              index={index}
              focusedIndex={focusedIndex}
              onSelect={handleSelect}
              onFocus={setFocusedIndex}
              onSubmenuOpen={setOpenSubmenuIndex}
              openSubmenuIndex={openSubmenuIndex}
              itemRefs={itemRefs}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default Dropdown;
