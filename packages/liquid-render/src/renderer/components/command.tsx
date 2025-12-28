// Command Component - Command palette / search interface (like Cmd+K)
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, inputStyles, generateId } from './utils';
import { resolveBinding } from '../data-context';
import { useLiquidContext } from '../LiquidUI';

// ============================================================================
// Types
// ============================================================================

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  onSelect?: () => void;
}

export interface CommandGroup {
  heading: string;
  items: CommandItem[];
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: mergeStyles(cardStyles(), {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    maxHeight: '24rem',
    width: '100%',
    maxWidth: '32rem',
  } as React.CSSProperties),

  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    borderBottom: `1px solid ${tokens.colors.border}`,
  } as React.CSSProperties,

  searchIcon: {
    flexShrink: 0,
    color: tokens.colors.mutedForeground,
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,

  input: mergeStyles(inputStyles(), {
    flex: 1,
    border: 'none',
    padding: 0,
    height: 'auto',
    fontSize: tokens.fontSize.sm,
    backgroundColor: 'transparent',
  } as React.CSSProperties),

  list: {
    flex: 1,
    overflow: 'auto',
    padding: tokens.spacing.xs,
  } as React.CSSProperties,

  empty: {
    padding: tokens.spacing.xl,
    textAlign: 'center',
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
  } as React.CSSProperties,

  group: {
    marginBottom: tokens.spacing.xs,
  } as React.CSSProperties,

  groupHeading: {
    padding: `${tokens.spacing.sm} ${tokens.spacing.sm}`,
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  } as React.CSSProperties,

  item: (isSelected: boolean, isDisabled: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: `${tokens.spacing.sm} ${tokens.spacing.sm}`,
    borderRadius: tokens.radius.md,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    backgroundColor: isSelected ? tokens.colors.accent : 'transparent',
    color: isSelected ? tokens.colors.accentForeground : tokens.colors.foreground,
    transition: `background-color ${tokens.transition.fast}`,
    outline: 'none',
  }),

  itemIcon: {
    flexShrink: 0,
    width: '1rem',
    height: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colors.mutedForeground,
  } as React.CSSProperties,

  itemContent: {
    flex: 1,
    minWidth: 0,
  } as React.CSSProperties,

  itemLabel: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.normal,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as React.CSSProperties,

  itemDescription: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as React.CSSProperties,

  shortcut: {
    display: 'flex',
    gap: tokens.spacing.xs,
    flexShrink: 0,
  } as React.CSSProperties,

  kbd: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '1.25rem',
    height: '1.25rem',
    padding: `0 ${tokens.spacing.xs}`,
    fontSize: tokens.fontSize.xs,
    fontFamily: 'var(--font-mono, monospace)',
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.mutedForeground,
    backgroundColor: tokens.colors.muted,
    borderRadius: tokens.radius.sm,
    border: `1px solid ${tokens.colors.border}`,
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse command items from block.children
 * Expects children with type 'group' containing nested 'item' children
 */
function parseCommandStructure(block: LiquidComponentProps['block']): CommandGroup[] {
  if (!block.children || block.children.length === 0) {
    return [];
  }

  const groups: CommandGroup[] = [];

  for (const child of block.children) {
    if (child.type === 'group') {
      const items: CommandItem[] = [];

      if (child.children) {
        for (const item of child.children) {
          if (item.type === 'item') {
            items.push({
              id: item.uid || generateId('cmd-item'),
              label: item.label || '',
              description: typeof item.binding?.value === 'string' ? item.binding.value : undefined,
              shortcut: item.style?.color, // Using color field for shortcut in DSL
              disabled: item.condition?.state === 'disabled',
            });
          }
        }
      }

      groups.push({
        heading: child.label || 'Commands',
        items,
      });
    } else if (child.type === 'item') {
      // Items not in a group go into a default group
      const existingDefault = groups.find(g => g.heading === '');
      if (existingDefault) {
        existingDefault.items.push({
          id: child.uid || generateId('cmd-item'),
          label: child.label || '',
          description: typeof child.binding?.value === 'string' ? child.binding.value : undefined,
          shortcut: child.style?.color,
          disabled: child.condition?.state === 'disabled',
        });
      } else {
        groups.push({
          heading: '',
          items: [{
            id: child.uid || generateId('cmd-item'),
            label: child.label || '',
            description: typeof child.binding?.value === 'string' ? child.binding.value : undefined,
            shortcut: child.style?.color,
            disabled: child.condition?.state === 'disabled',
          }],
        });
      }
    }
  }

  return groups;
}

/**
 * Filter items by search query
 */
function filterGroups(groups: CommandGroup[], query: string): CommandGroup[] {
  if (!query.trim()) return groups;

  const lowerQuery = query.toLowerCase();

  return groups
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        item.label.toLowerCase().includes(lowerQuery) ||
        (item.description && item.description.toLowerCase().includes(lowerQuery))
      ),
    }))
    .filter(group => group.items.length > 0);
}

/**
 * Get flat list of all selectable items
 */
function getFlatItems(groups: CommandGroup[]): CommandItem[] {
  return groups.flatMap(group => group.items.filter(item => !item.disabled));
}

/**
 * Parse keyboard shortcut string into array of keys
 */
function parseShortcut(shortcut: string): string[] {
  return shortcut.split('+').map(key => key.trim());
}

// ============================================================================
// Sub-components
// ============================================================================

function SearchIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

interface CommandItemRowProps {
  item: CommandItem;
  isSelected: boolean;
  onSelect: (item: CommandItem) => void;
  onHover: () => void;
}

function CommandItemRow({
  item,
  isSelected,
  onSelect,
  onHover,
}: CommandItemRowProps): React.ReactElement {
  const handleClick = useCallback(() => {
    if (!item.disabled) {
      onSelect(item);
    }
  }, [item, onSelect]);

  return (
    <div
      role="option"
      aria-selected={isSelected}
      aria-disabled={item.disabled}
      style={styles.item(isSelected, Boolean(item.disabled))}
      onClick={handleClick}
      onMouseEnter={onHover}
    >
      {item.icon && (
        <span style={styles.itemIcon}>{item.icon}</span>
      )}
      <div style={styles.itemContent}>
        <div style={styles.itemLabel}>{item.label}</div>
        {item.description && (
          <div style={styles.itemDescription}>{item.description}</div>
        )}
      </div>
      {item.shortcut && (
        <div style={styles.shortcut}>
          {parseShortcut(item.shortcut).map((key, i) => (
            <kbd key={i} style={styles.kbd}>{key}</kbd>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Command({ block, data }: LiquidComponentProps): React.ReactElement {
  const { signalActions } = useLiquidContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Resolve initial search value from binding
  const initialValue = resolveBinding(block.binding, data);
  const [searchValue, setSearchValue] = useState(
    typeof initialValue === 'string' ? initialValue : ''
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const placeholder = block.label || 'Type a command or search...';
  const emitSignal = block.signals?.emit;

  // Parse command structure from block children
  const allGroups = useMemo(() => parseCommandStructure(block), [block]);

  // Filter groups based on search
  const filteredGroups = useMemo(
    () => filterGroups(allGroups, searchValue),
    [allGroups, searchValue]
  );

  // Get flat list of selectable items for keyboard navigation
  const selectableItems = useMemo(
    () => getFlatItems(filteredGroups),
    [filteredGroups]
  );

  // Reset selection when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchValue]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  }, []);

  const handleSelect = useCallback((item: CommandItem) => {
    // Execute item callback if provided
    if (item.onSelect) {
      item.onSelect();
    }

    // Emit signal with selected item
    if (emitSignal?.name) {
      signalActions.emit(emitSignal.name, item.id);
    }
  }, [emitSignal, signalActions]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (selectableItems.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < selectableItems.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : selectableItems.length - 1
        );
        break;

      case 'Enter':
        e.preventDefault();
        const selectedItem = selectableItems[selectedIndex];
        if (selectedItem && !selectedItem.disabled) {
          handleSelect(selectedItem);
        }
        break;

      case 'Home':
        e.preventDefault();
        setSelectedIndex(0);
        break;

      case 'End':
        e.preventDefault();
        setSelectedIndex(selectableItems.length - 1);
        break;
    }
  }, [selectableItems, selectedIndex, handleSelect]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current || selectableItems.length === 0) return;

    const selectedItem = selectableItems[selectedIndex];
    if (!selectedItem) return;

    const itemElement = listRef.current.querySelector(
      `[data-item-id="${selectedItem.id}"]`
    );
    if (itemElement) {
      itemElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, selectableItems]);

  // Track which item index corresponds to each item in filteredGroups
  let flatIndex = -1;

  return (
    <div data-liquid-type="command" style={styles.wrapper}>
      <div style={styles.inputWrapper}>
        <span style={styles.searchIcon}>
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={searchValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={styles.input}
          role="combobox"
          aria-expanded="true"
          aria-controls="command-list"
          aria-autocomplete="list"
        />
      </div>

      <div
        ref={listRef}
        id="command-list"
        role="listbox"
        style={styles.list}
      >
        {filteredGroups.length === 0 ? (
          <div style={styles.empty}>No results found.</div>
        ) : (
          filteredGroups.map((group, groupIndex) => (
            <div key={groupIndex} style={styles.group}>
              {group.heading && (
                <div style={styles.groupHeading}>{group.heading}</div>
              )}
              {group.items.map(item => {
                // Only increment for non-disabled items
                if (!item.disabled) {
                  flatIndex++;
                }
                const currentIndex = item.disabled ? -1 : flatIndex;
                const isSelected = currentIndex === selectedIndex;

                return (
                  <div key={item.id} data-item-id={item.id}>
                    <CommandItemRow
                      item={item}
                      isSelected={isSelected}
                      onSelect={handleSelect}
                      onHover={() => {
                        if (!item.disabled && currentIndex >= 0) {
                          setSelectedIndex(currentIndex);
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

interface StaticCommandProps {
  groups: CommandGroup[];
  placeholder?: string;
  onSelect?: (item: CommandItem) => void;
  onSearchChange?: (value: string) => void;
  emptyMessage?: string;
  style?: React.CSSProperties;
}

export function StaticCommand({
  groups,
  placeholder = 'Type a command or search...',
  onSelect,
  onSearchChange,
  emptyMessage = 'No results found.',
  style: customStyle,
}: StaticCommandProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [searchValue, setSearchValue] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter groups based on search
  const filteredGroups = useMemo(
    () => filterGroups(groups, searchValue),
    [groups, searchValue]
  );

  // Get flat list of selectable items for keyboard navigation
  const selectableItems = useMemo(
    () => getFlatItems(filteredGroups),
    [filteredGroups]
  );

  // Reset selection when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchValue]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    onSearchChange?.(newValue);
  }, [onSearchChange]);

  const handleSelect = useCallback((item: CommandItem) => {
    // Execute item callback if provided
    if (item.onSelect) {
      item.onSelect();
    }

    // Call parent onSelect handler
    onSelect?.(item);
  }, [onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (selectableItems.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < selectableItems.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : selectableItems.length - 1
        );
        break;

      case 'Enter':
        e.preventDefault();
        const selectedItem = selectableItems[selectedIndex];
        if (selectedItem && !selectedItem.disabled) {
          handleSelect(selectedItem);
        }
        break;

      case 'Home':
        e.preventDefault();
        setSelectedIndex(0);
        break;

      case 'End':
        e.preventDefault();
        setSelectedIndex(selectableItems.length - 1);
        break;
    }
  }, [selectableItems, selectedIndex, handleSelect]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current || selectableItems.length === 0) return;

    const selectedItem = selectableItems[selectedIndex];
    if (!selectedItem) return;

    const itemElement = listRef.current.querySelector(
      `[data-item-id="${selectedItem.id}"]`
    );
    if (itemElement) {
      itemElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, selectableItems]);

  // Track which item index corresponds to each item in filteredGroups
  let flatIndex = -1;

  return (
    <div
      data-liquid-type="command"
      style={mergeStyles(styles.wrapper, customStyle)}
    >
      <div style={styles.inputWrapper}>
        <span style={styles.searchIcon}>
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={searchValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={styles.input}
          role="combobox"
          aria-expanded="true"
          aria-controls="command-list"
          aria-autocomplete="list"
        />
      </div>

      <div
        ref={listRef}
        id="command-list"
        role="listbox"
        style={styles.list}
      >
        {filteredGroups.length === 0 ? (
          <div style={styles.empty}>{emptyMessage}</div>
        ) : (
          filteredGroups.map((group, groupIndex) => (
            <div key={groupIndex} style={styles.group}>
              {group.heading && (
                <div style={styles.groupHeading}>{group.heading}</div>
              )}
              {group.items.map(item => {
                // Only increment for non-disabled items
                if (!item.disabled) {
                  flatIndex++;
                }
                const currentIndex = item.disabled ? -1 : flatIndex;
                const isSelected = currentIndex === selectedIndex;

                return (
                  <div key={item.id} data-item-id={item.id}>
                    <CommandItemRow
                      item={item}
                      isSelected={isSelected}
                      onSelect={handleSelect}
                      onHover={() => {
                        if (!item.disabled && currentIndex >= 0) {
                          setSelectedIndex(currentIndex);
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Command Dialog (for Cmd+K style usage)
// ============================================================================

interface CommandDialogProps {
  isOpen: boolean;
  onClose: () => void;
  groups: CommandGroup[];
  placeholder?: string;
  onSelect?: (item: CommandItem) => void;
  onSearchChange?: (value: string) => void;
  emptyMessage?: string;
}

export function CommandDialog({
  isOpen,
  onClose,
  groups,
  placeholder,
  onSelect,
  onSearchChange,
  emptyMessage,
}: CommandDialogProps): React.ReactElement | null {
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = useCallback((item: CommandItem) => {
    onSelect?.(item);
    onClose();
  }, [onSelect, onClose]);

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '15vh',
    zIndex: 50,
    backdropFilter: 'blur(2px)',
  };

  return (
    <div
      style={overlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <StaticCommand
        groups={groups}
        placeholder={placeholder}
        onSelect={handleSelect}
        onSearchChange={onSearchChange}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}

// ============================================================================
// useCommand Hook
// ============================================================================

interface UseCommandReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useCommand(initialOpen = false): UseCommandReturn {
  const [isOpen, setIsOpen] = useState(initialOpen);

  // Register global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: useCallback(() => setIsOpen(true), []),
    close: useCallback(() => setIsOpen(false), []),
    toggle: useCallback(() => setIsOpen(prev => !prev), []),
  };
}

export default Command;
