// Dropdown Component - Menu-focused dropdown with keyboard navigation
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, buttonStyles, generateId } from './utils';
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
}

export interface StaticDropdownProps {
  items: DropdownItem[];
  trigger?: React.ReactNode;
  label?: string;
  placeholder?: string;
  defaultOpen?: boolean;
  disabled?: boolean;
  onSelect?: (value: string, item: DropdownItem) => void;
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

// ============================================================================
// Sub-components
// ============================================================================

interface DropdownMenuItemProps {
  item: DropdownItem;
  index: number;
  focusedIndex: number;
  onSelect: (item: DropdownItem) => void;
  onFocus: (index: number) => void;
  itemRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
}

function DropdownMenuItem({
  item,
  index,
  focusedIndex,
  onSelect,
  onFocus,
  itemRefs,
}: DropdownMenuItemProps): React.ReactElement {
  if (item.separator) {
    return <div style={styles.separator} role="separator" />;
  }

  const isFocused = index === focusedIndex;

  const itemStyle = mergeStyles(
    styles.item,
    isFocused ? styles.itemFocused : undefined,
    item.disabled ? styles.itemDisabled : undefined
  );

  return (
    <button
      ref={el => { itemRefs.current[index] = el; }}
      type="button"
      role="menuitem"
      tabIndex={isFocused ? 0 : -1}
      disabled={item.disabled}
      style={itemStyle}
      onClick={() => !item.disabled && onSelect(item)}
      onMouseEnter={() => onFocus(index)}
      onFocus={() => onFocus(index)}
    >
      {item.icon && <span style={styles.itemIcon}>{item.icon}</span>}
      <span>{item.label}</span>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Dropdown({ block, data }: LiquidComponentProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
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
        };
      }
      return { label: String(item), value: String(item) };
    });
  } else {
    // Use block children
    items = extractDropdownItems(block);
  }

  // Filter out separators for navigation
  const navigableItems = items.filter(item => !item.separator);
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

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleSelect = useCallback((item: DropdownItem) => {
    if (item.disabled) return;
    setIsOpen(false);
    setFocusedIndex(-1);
    triggerRef.current?.focus();
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

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const nextNavIndex = currentNavIndex + 1;
        if (nextNavIndex < navigableIndices.length) {
          const nextIndex = navigableIndices[nextNavIndex]!;
          setFocusedIndex(nextIndex);
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
          itemRefs.current[prevIndex]?.focus();
        }
        break;
      }

      case 'Home': {
        e.preventDefault();
        if (navigableIndices.length > 0) {
          const firstIndex = navigableIndices[0]!;
          setFocusedIndex(firstIndex);
          itemRefs.current[firstIndex]?.focus();
        }
        break;
      }

      case 'End': {
        e.preventDefault();
        if (navigableIndices.length > 0) {
          const lastIndex = navigableIndices[navigableIndices.length - 1]!;
          setFocusedIndex(lastIndex);
          itemRefs.current[lastIndex]?.focus();
        }
        break;
      }

      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (focusedIndex >= 0 && items[focusedIndex] && !items[focusedIndex].separator) {
          handleSelect(items[focusedIndex]);
        }
        break;
      }

      case 'Tab': {
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      }
    }
  }, [isOpen, focusedIndex, navigableIndices, items, handleSelect]);

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
  style: customStyle,
}: StaticDropdownProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [focusedIndex, setFocusedIndex] = useState(-1);
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

  const toggleOpen = useCallback(() => {
    if (!disabled) {
      setIsOpen(prev => !prev);
    }
  }, [disabled]);

  const handleSelect = useCallback((item: DropdownItem) => {
    if (item.disabled) return;
    setIsOpen(false);
    setFocusedIndex(-1);
    triggerRef.current?.focus();
    onSelect?.(item.value || item.label, item);
  }, [onSelect]);

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

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const nextNavIndex = currentNavIndex + 1;
        if (nextNavIndex < navigableIndices.length) {
          const nextIndex = navigableIndices[nextNavIndex]!;
          setFocusedIndex(nextIndex);
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
          itemRefs.current[prevIndex]?.focus();
        }
        break;
      }

      case 'Home': {
        e.preventDefault();
        if (navigableIndices.length > 0) {
          const firstIndex = navigableIndices[0]!;
          setFocusedIndex(firstIndex);
          itemRefs.current[firstIndex]?.focus();
        }
        break;
      }

      case 'End': {
        e.preventDefault();
        if (navigableIndices.length > 0) {
          const lastIndex = navigableIndices[navigableIndices.length - 1]!;
          setFocusedIndex(lastIndex);
          itemRefs.current[lastIndex]?.focus();
        }
        break;
      }

      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (focusedIndex >= 0 && items[focusedIndex] && !items[focusedIndex].separator) {
          handleSelect(items[focusedIndex]);
        }
        break;
      }

      case 'Tab': {
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      }
    }
  }, [disabled, isOpen, focusedIndex, navigableIndices, items, handleSelect]);

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
              itemRefs={itemRefs}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default Dropdown;
