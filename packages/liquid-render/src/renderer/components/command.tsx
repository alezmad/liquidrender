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
  /** Optional keywords/aliases for fuzzy search */
  keywords?: string[];
}

export interface CommandGroup {
  heading: string;
  items: CommandItem[];
}

/** Result of fuzzy matching with score and match indices */
interface FuzzyMatchResult {
  matches: boolean;
  score: number;
  /** Indices of matched characters in the original string */
  matchedIndices: number[];
}

/** Item with fuzzy search score for ranking */
interface ScoredItem {
  item: CommandItem;
  score: number;
  labelMatches: number[];
  descriptionMatches: number[];
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

  // Fuzzy match highlight styles
  matchHighlight: {
    color: tokens.colors.primary,
    fontWeight: tokens.fontWeight.semibold,
    backgroundColor: 'transparent',
  } as React.CSSProperties,

  matchHighlightSelected: {
    color: tokens.colors.accentForeground,
    fontWeight: tokens.fontWeight.semibold,
    backgroundColor: 'transparent',
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
 * Fuzzy match algorithm that tolerates typos and partial matches.
 * Uses a scoring system that rewards:
 * - Consecutive character matches
 * - Matches at word boundaries
 * - Matches at the start of the string
 * - Exact substring matches
 *
 * @param text The text to search in
 * @param query The search query
 * @returns Match result with score and matched indices
 */
function fuzzyMatch(text: string, query: string): FuzzyMatchResult {
  if (!query) {
    return { matches: true, score: 0, matchedIndices: [] };
  }

  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  // Quick check: if query is longer than text, no match possible
  if (queryLower.length > textLower.length) {
    return { matches: false, score: 0, matchedIndices: [] };
  }

  // Exact match gets highest score
  if (textLower === queryLower) {
    return {
      matches: true,
      score: 1000,
      matchedIndices: Array.from({ length: text.length }, (_, i) => i),
    };
  }

  // Check for exact substring match (very high score)
  const substringIndex = textLower.indexOf(queryLower);
  if (substringIndex !== -1) {
    const matchedIndices = Array.from(
      { length: queryLower.length },
      (_, i) => substringIndex + i
    );
    // Bonus for match at start
    const startBonus = substringIndex === 0 ? 200 : 0;
    // Bonus for match at word boundary
    const prevChar = substringIndex > 0 ? text[substringIndex - 1] : undefined;
    const wordBoundaryBonus =
      substringIndex === 0 || (prevChar !== undefined && /[\s\-_]/.test(prevChar)) ? 100 : 0;

    return {
      matches: true,
      score: 500 + startBonus + wordBoundaryBonus,
      matchedIndices,
    };
  }

  // Fuzzy matching with scoring
  const matchedIndices: number[] = [];
  let queryIndex = 0;
  let score = 0;
  let lastMatchIndex = -1;
  let consecutiveMatches = 0;

  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      matchedIndices.push(i);

      // Consecutive match bonus
      if (lastMatchIndex === i - 1) {
        consecutiveMatches++;
        score += 10 * consecutiveMatches; // Increasing bonus for longer sequences
      } else {
        consecutiveMatches = 1;
        score += 5;
      }

      // Word boundary bonus (matches at start of words)
      const prevCharForWord = i > 0 ? text[i - 1] : undefined;
      if (i === 0 || (prevCharForWord !== undefined && /[\s\-_]/.test(prevCharForWord))) {
        score += 30;
      }

      // Camel case boundary bonus
      const currentChar = text[i];
      const prevCharForCamel = i > 0 ? text[i - 1] : undefined;
      if (i > 0 && currentChar && prevCharForCamel &&
          currentChar === currentChar.toUpperCase() &&
          prevCharForCamel === prevCharForCamel.toLowerCase()) {
        score += 20;
      }

      // Start of string bonus
      if (i === 0) {
        score += 50;
      }

      // Penalty for gaps (but less severe for small gaps)
      if (lastMatchIndex !== -1 && i > lastMatchIndex + 1) {
        const gap = i - lastMatchIndex - 1;
        score -= Math.min(gap * 2, 20); // Cap the penalty
      }

      lastMatchIndex = i;
      queryIndex++;
    }
  }

  // Check if we matched all query characters
  if (queryIndex === queryLower.length) {
    // Bonus for shorter strings (more specific matches)
    const lengthBonus = Math.max(0, 50 - (text.length - query.length) * 2);
    score += lengthBonus;

    return { matches: true, score, matchedIndices };
  }

  // Try approximate matching for typo tolerance (1 character tolerance)
  if (queryLower.length >= 3) {
    const typoResult = fuzzyMatchWithTypos(textLower, queryLower);
    if (typoResult.matches) {
      return {
        matches: true,
        score: typoResult.score * 0.7, // Penalty for typo match
        matchedIndices: typoResult.matchedIndices,
      };
    }
  }

  return { matches: false, score: 0, matchedIndices: [] };
}

/**
 * Fuzzy match with typo tolerance.
 * Allows for one character substitution, insertion, or deletion.
 */
function fuzzyMatchWithTypos(text: string, query: string): FuzzyMatchResult {
  // Try skipping each character in the query (simulates deletion in user input)
  for (let skip = 0; skip < query.length; skip++) {
    const modifiedQuery = query.slice(0, skip) + query.slice(skip + 1);
    if (modifiedQuery.length < 2) continue;

    const result = fuzzyMatch(text, modifiedQuery);
    if (result.matches && result.score > 50) {
      return result;
    }
  }

  // Try character transposition
  for (let i = 0; i < query.length - 1; i++) {
    const chars = query.split('');
    const charA = chars[i];
    const charB = chars[i + 1];
    if (charA !== undefined && charB !== undefined) {
      chars[i] = charB;
      chars[i + 1] = charA;
    }
    const transposed = chars.join('');

    const result = fuzzyMatch(text, transposed);
    if (result.matches && result.score > 50) {
      return { ...result, score: result.score * 0.9 };
    }
  }

  return { matches: false, score: 0, matchedIndices: [] };
}

/**
 * Score an item against a query, searching across label, description, and keywords
 */
function scoreItem(item: CommandItem, query: string): ScoredItem | null {
  if (!query.trim()) {
    return {
      item,
      score: 0,
      labelMatches: [],
      descriptionMatches: [],
    };
  }

  // Match against label (highest priority)
  const labelResult = fuzzyMatch(item.label, query);

  // Match against description
  const descriptionResult = item.description
    ? fuzzyMatch(item.description, query)
    : { matches: false, score: 0, matchedIndices: [] };

  // Match against keywords
  let keywordScore = 0;
  if (item.keywords) {
    for (const keyword of item.keywords) {
      const keywordResult = fuzzyMatch(keyword, query);
      if (keywordResult.matches) {
        keywordScore = Math.max(keywordScore, keywordResult.score * 0.9); // Slight penalty for keyword match
      }
    }
  }

  // Combine scores with weights
  const labelWeight = 1.0;
  const descriptionWeight = 0.6;
  const keywordWeight = 0.8;

  const totalScore =
    (labelResult.matches ? labelResult.score * labelWeight : 0) +
    (descriptionResult.matches ? descriptionResult.score * descriptionWeight : 0) +
    keywordScore * keywordWeight;

  // Return null if no match found
  if (!labelResult.matches && !descriptionResult.matches && keywordScore === 0) {
    return null;
  }

  return {
    item,
    score: totalScore,
    labelMatches: labelResult.matchedIndices,
    descriptionMatches: descriptionResult.matchedIndices,
  };
}

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

/** Scored group with sorted items */
interface ScoredGroup {
  heading: string;
  items: ScoredItem[];
}

/**
 * Filter and score groups using fuzzy search
 */
function fuzzyFilterGroups(groups: CommandGroup[], query: string): ScoredGroup[] {
  if (!query.trim()) {
    return groups.map(group => ({
      heading: group.heading,
      items: group.items.map(item => ({
        item,
        score: 0,
        labelMatches: [],
        descriptionMatches: [],
      })),
    }));
  }

  const result: ScoredGroup[] = [];

  for (const group of groups) {
    const scoredItems: ScoredItem[] = [];

    for (const item of group.items) {
      const scored = scoreItem(item, query);
      if (scored !== null) {
        scoredItems.push(scored);
      }
    }

    if (scoredItems.length > 0) {
      // Sort items by score (highest first)
      scoredItems.sort((a, b) => b.score - a.score);
      result.push({
        heading: group.heading,
        items: scoredItems,
      });
    }
  }

  // Sort groups by their best item's score
  result.sort((a, b) => {
    const aTopScore = a.items[0]?.score ?? 0;
    const bTopScore = b.items[0]?.score ?? 0;
    return bTopScore - aTopScore;
  });

  return result;
}

/**
 * Legacy filter function for backward compatibility
 * @deprecated Use fuzzyFilterGroups instead
 */
function filterGroups(groups: CommandGroup[], query: string): CommandGroup[] {
  const scored = fuzzyFilterGroups(groups, query);
  return scored.map(g => ({
    heading: g.heading,
    items: g.items.map(s => s.item),
  }));
}

/**
 * Get flat list of all selectable items from scored groups
 */
function getFlatScoredItems(groups: ScoredGroup[]): ScoredItem[] {
  return groups.flatMap(group => group.items.filter(si => !si.item.disabled));
}

/**
 * Get flat list of all selectable items (legacy)
 */
function getFlatItems(groups: CommandGroup[]): CommandItem[] {
  return groups.flatMap(group => group.items.filter(item => !item.disabled));
}

/**
 * Custom hook for debouncing a value
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
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

/**
 * Renders text with fuzzy match highlights
 */
interface HighlightedTextProps {
  text: string;
  matchedIndices: number[];
  isSelected: boolean;
}

function HighlightedText({
  text,
  matchedIndices,
  isSelected,
}: HighlightedTextProps): React.ReactElement {
  if (matchedIndices.length === 0 || text.length === 0) {
    return <>{text}</>;
  }

  const matchSet = new Set(matchedIndices);
  const parts: React.ReactNode[] = [];
  let currentRun = '';
  let isCurrentlyMatched = false;

  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    const isMatched = matchSet.has(i);

    if (i === 0) {
      isCurrentlyMatched = isMatched;
      currentRun = char;
    } else if (isMatched === isCurrentlyMatched) {
      currentRun += char;
    } else {
      // State changed, push current run
      if (isCurrentlyMatched) {
        parts.push(
          <span
            key={parts.length}
            style={isSelected ? styles.matchHighlightSelected : styles.matchHighlight}
          >
            {currentRun}
          </span>
        );
      } else {
        parts.push(currentRun);
      }
      currentRun = char;
      isCurrentlyMatched = isMatched;
    }
  }

  // Push final run
  if (currentRun) {
    if (isCurrentlyMatched) {
      parts.push(
        <span
          key={parts.length}
          style={isSelected ? styles.matchHighlightSelected : styles.matchHighlight}
        >
          {currentRun}
        </span>
      );
    } else {
      parts.push(currentRun);
    }
  }

  return <>{parts}</>;
}

interface CommandItemRowProps {
  item: CommandItem;
  isSelected: boolean;
  onSelect: (item: CommandItem) => void;
  onHover: () => void;
  labelMatches?: number[];
  descriptionMatches?: number[];
}

function CommandItemRow({
  item,
  isSelected,
  onSelect,
  onHover,
  labelMatches = [],
  descriptionMatches = [],
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
        <div style={styles.itemLabel}>
          <HighlightedText
            text={item.label}
            matchedIndices={labelMatches}
            isSelected={isSelected}
          />
        </div>
        {item.description && (
          <div style={styles.itemDescription}>
            <HighlightedText
              text={item.description}
              matchedIndices={descriptionMatches}
              isSelected={isSelected}
            />
          </div>
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

/** Default debounce delay for fuzzy search (in ms) */
const FUZZY_SEARCH_DEBOUNCE_MS = 150;

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

  // Debounce search for performance with large lists
  const debouncedSearchValue = useDebounce(searchValue, FUZZY_SEARCH_DEBOUNCE_MS);

  const placeholder = block.label || 'Type a command or search...';
  const emitSignal = block.signals?.emit;

  // Parse command structure from block children
  const allGroups = useMemo(() => parseCommandStructure(block), [block]);

  // Filter and score groups using fuzzy search
  const scoredGroups = useMemo(
    () => fuzzyFilterGroups(allGroups, debouncedSearchValue),
    [allGroups, debouncedSearchValue]
  );

  // Get flat list of selectable items for keyboard navigation
  const selectableItems = useMemo(
    () => getFlatScoredItems(scoredGroups),
    [scoredGroups]
  );

  // Reset selection when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedSearchValue]);

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
        const selectedScoredItem = selectableItems[selectedIndex];
        if (selectedScoredItem && !selectedScoredItem.item.disabled) {
          handleSelect(selectedScoredItem.item);
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

    const selectedScoredItem = selectableItems[selectedIndex];
    if (!selectedScoredItem) return;

    const itemElement = listRef.current.querySelector(
      `[data-item-id="${selectedScoredItem.item.id}"]`
    );
    if (itemElement) {
      itemElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, selectableItems]);

  // Track which item index corresponds to each item in scoredGroups
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
        {scoredGroups.length === 0 ? (
          <div style={styles.empty}>No results found.</div>
        ) : (
          scoredGroups.map((group, groupIndex) => (
            <div key={groupIndex} style={styles.group}>
              {group.heading && (
                <div style={styles.groupHeading}>{group.heading}</div>
              )}
              {group.items.map(scoredItem => {
                const item = scoredItem.item;
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
                      labelMatches={scoredItem.labelMatches}
                      descriptionMatches={scoredItem.descriptionMatches}
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
  /** Debounce delay in ms for fuzzy search (default: 150) */
  debounceMs?: number;
}

export function StaticCommand({
  groups,
  placeholder = 'Type a command or search...',
  onSelect,
  onSearchChange,
  emptyMessage = 'No results found.',
  style: customStyle,
  debounceMs = FUZZY_SEARCH_DEBOUNCE_MS,
}: StaticCommandProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [searchValue, setSearchValue] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Debounce search for performance with large lists
  const debouncedSearchValue = useDebounce(searchValue, debounceMs);

  // Filter and score groups using fuzzy search
  const scoredGroups = useMemo(
    () => fuzzyFilterGroups(groups, debouncedSearchValue),
    [groups, debouncedSearchValue]
  );

  // Get flat list of selectable items for keyboard navigation
  const selectableItems = useMemo(
    () => getFlatScoredItems(scoredGroups),
    [scoredGroups]
  );

  // Reset selection when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedSearchValue]);

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
        const selectedScoredItem = selectableItems[selectedIndex];
        if (selectedScoredItem && !selectedScoredItem.item.disabled) {
          handleSelect(selectedScoredItem.item);
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

    const selectedScoredItem = selectableItems[selectedIndex];
    if (!selectedScoredItem) return;

    const itemElement = listRef.current.querySelector(
      `[data-item-id="${selectedScoredItem.item.id}"]`
    );
    if (itemElement) {
      itemElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, selectableItems]);

  // Track which item index corresponds to each item in scoredGroups
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
        {scoredGroups.length === 0 ? (
          <div style={styles.empty}>{emptyMessage}</div>
        ) : (
          scoredGroups.map((group, groupIndex) => (
            <div key={groupIndex} style={styles.group}>
              {group.heading && (
                <div style={styles.groupHeading}>{group.heading}</div>
              )}
              {group.items.map(scoredItem => {
                const item = scoredItem.item;
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
                      labelMatches={scoredItem.labelMatches}
                      descriptionMatches={scoredItem.descriptionMatches}
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

// ============================================================================
// Exported Utilities
// ============================================================================

/**
 * Fuzzy match utility for custom implementations
 * @param text The text to search in
 * @param query The search query
 * @returns Match result with score and matched character indices
 */
export { fuzzyMatch };

/**
 * Types for fuzzy search results
 */
export type { FuzzyMatchResult, ScoredItem, ScoredGroup };

export default Command;
