// Tabs Component - Tabbed interface with keyboard navigation
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, mergeStyles, generateId } from './utils';
import { resolveBinding } from '../data-context';
import { useLiquidContext } from '../LiquidUI';

// ============================================================================
// Types
// ============================================================================

export interface TabItem {
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface StaticTabsProps {
  tabs: TabItem[];
  activeIndex?: number;
  onChange?: (index: number) => void;
  variant?: 'line' | 'pills' | 'boxed';
  className?: string;
  style?: React.CSSProperties;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.md,
    fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
  } as React.CSSProperties,

  tablist: {
    display: 'flex',
    gap: tokens.spacing.xs,
    borderBottom: `1px solid ${tokens.colors.border}`,
  } as React.CSSProperties,

  tablistPills: {
    padding: tokens.spacing.xs,
    backgroundColor: tokens.colors.muted,
    borderRadius: tokens.radius.lg,
    border: 'none',
  } as React.CSSProperties,

  tablistBoxed: {
    gap: tokens.spacing.sm,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.xs,
    backgroundColor: tokens.colors.card,
  } as React.CSSProperties,

  tab: {
    position: 'relative' as const,
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.mutedForeground,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: tokens.radius.none,
    cursor: 'pointer',
    transition: `all ${tokens.transition.fast}`,
    outline: 'none',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  tabActive: {
    color: tokens.colors.foreground,
  } as React.CSSProperties,

  tabDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    pointerEvents: 'none' as const,
  } as React.CSSProperties,

  tabHover: {
    color: tokens.colors.foreground,
  } as React.CSSProperties,

  // Line variant indicator
  tabIndicatorLine: {
    position: 'absolute' as const,
    bottom: '-1px',
    left: 0,
    right: 0,
    height: '2px',
    backgroundColor: tokens.colors.primary,
  } as React.CSSProperties,

  // Pills variant styling
  tabPills: {
    borderRadius: tokens.radius.md,
  } as React.CSSProperties,

  tabActivePills: {
    backgroundColor: tokens.colors.background,
    boxShadow: tokens.shadow.sm,
  } as React.CSSProperties,

  // Boxed variant styling
  tabBoxed: {
    borderRadius: tokens.radius.md,
  } as React.CSSProperties,

  tabActiveBoxed: {
    backgroundColor: tokens.colors.primary,
    color: tokens.colors.primaryForeground,
  } as React.CSSProperties,

  panels: {
    flex: 1,
  } as React.CSSProperties,

  panel: {
    outline: 'none',
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract tab metadata from block children
 * Content is rendered by LiquidUI and passed via children prop
 */
function extractTabMetadata(block: LiquidComponentProps['block']): Array<{
  label: string;
  disabled: boolean;
}> {
  if (!block.children || block.children.length === 0) {
    return [];
  }

  return block.children
    .filter(child => child.type === 'tab')
    .map(child => ({
      label: child.label || 'Tab',
      // Check for disabled via style color (e.g., #disabled) or condition
      disabled: child.style?.color === 'disabled' || Boolean(child.condition?.state === 'disabled'),
    }));
}

// ============================================================================
// Main Component
// ============================================================================

export function Tabs({ block, data, children }: LiquidComponentProps): React.ReactElement {
  const { signalActions } = useLiquidContext();
  const tabsId = generateId('tabs');

  // Resolve binding to get active tab index
  const boundValue = resolveBinding(block.binding, data);
  const initialIndex = typeof boundValue === 'number' ? boundValue : 0;

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Get variant from block style color or default to 'line'
  // DSL uses #pills or #boxed modifiers which map to style.color
  const getVariant = (color?: string): 'line' | 'pills' | 'boxed' => {
    if (color === 'pills') return 'pills';
    if (color === 'boxed') return 'boxed';
    return 'line';
  };
  const variant = getVariant(block.style?.color);

  // Extract tab metadata from block children (labels, disabled state)
  const tabMetadata = extractTabMetadata(block);

  // Children are pre-rendered tab contents from LiquidUI
  const childArray = React.Children.toArray(children);

  // Get signal emit configuration
  const emitSignal = block.signals?.emit;

  // Update active index when bound value changes
  useEffect(() => {
    if (typeof boundValue === 'number' && boundValue !== activeIndex) {
      setActiveIndex(boundValue);
    }
  }, [boundValue, activeIndex]);

  const handleTabClick = useCallback((index: number) => {
    if (tabMetadata[index]?.disabled) return;

    setActiveIndex(index);

    // Emit signal with new index
    if (emitSignal?.name) {
      signalActions.emit(emitSignal.name, String(index));
    }
  }, [tabMetadata, emitSignal, signalActions]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        nextIndex = index - 1;
        if (nextIndex < 0) nextIndex = tabMetadata.length - 1;
        // Skip disabled tabs
        while (tabMetadata[nextIndex]?.disabled && nextIndex !== index) {
          nextIndex--;
          if (nextIndex < 0) nextIndex = tabMetadata.length - 1;
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        nextIndex = index + 1;
        if (nextIndex >= tabMetadata.length) nextIndex = 0;
        // Skip disabled tabs
        while (tabMetadata[nextIndex]?.disabled && nextIndex !== index) {
          nextIndex++;
          if (nextIndex >= tabMetadata.length) nextIndex = 0;
        }
        break;

      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        // Skip disabled tabs
        while (tabMetadata[nextIndex]?.disabled && nextIndex < tabMetadata.length) {
          nextIndex++;
        }
        break;

      case 'End':
        e.preventDefault();
        nextIndex = tabMetadata.length - 1;
        // Skip disabled tabs
        while (tabMetadata[nextIndex]?.disabled && nextIndex >= 0) {
          nextIndex--;
        }
        break;

      default:
        return;
    }

    if (nextIndex !== index && !tabMetadata[nextIndex]?.disabled) {
      handleTabClick(nextIndex);
      tabRefs.current[nextIndex]?.focus();
    }
  }, [tabMetadata, handleTabClick]);

  if (tabMetadata.length === 0) {
    return (
      <div data-liquid-type="tabs" style={styles.wrapper}>
        <div style={{ color: tokens.colors.mutedForeground, fontSize: tokens.fontSize.sm }}>
          No tabs defined
        </div>
      </div>
    );
  }

  const tablistStyle = mergeStyles(
    styles.tablist,
    variant === 'pills' ? styles.tablistPills : undefined,
    variant === 'boxed' ? styles.tablistBoxed : undefined
  );

  return (
    <div data-liquid-type="tabs" data-variant={variant} style={styles.wrapper}>
      <div role="tablist" style={tablistStyle}>
        {tabMetadata.map((tab, index) => {
          const isActive = index === activeIndex;
          const tabId = `${tabsId}-tab-${index}`;
          const panelId = `${tabsId}-panel-${index}`;

          const tabStyle = mergeStyles(
            styles.tab,
            variant === 'pills' ? styles.tabPills : undefined,
            variant === 'boxed' ? styles.tabBoxed : undefined,
            isActive ? styles.tabActive : undefined,
            isActive && variant === 'pills' ? styles.tabActivePills : undefined,
            isActive && variant === 'boxed' ? styles.tabActiveBoxed : undefined,
            tab.disabled ? styles.tabDisabled : undefined
          );

          return (
            <button
              key={index}
              ref={el => { tabRefs.current[index] = el; }}
              id={tabId}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={panelId}
              aria-disabled={tab.disabled}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              style={tabStyle}
              onClick={() => handleTabClick(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              {tab.label}
              {isActive && variant === 'line' && (
                <span style={styles.tabIndicatorLine} />
              )}
            </button>
          );
        })}
      </div>

      <div style={styles.panels}>
        {tabMetadata.map((_, index) => {
          const isActive = index === activeIndex;
          const tabId = `${tabsId}-tab-${index}`;
          const panelId = `${tabsId}-panel-${index}`;

          return (
            <div
              key={index}
              id={panelId}
              role="tabpanel"
              aria-labelledby={tabId}
              tabIndex={0}
              hidden={!isActive}
              style={styles.panel}
            >
              {isActive && childArray[index]}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

export function StaticTabs({
  tabs,
  activeIndex: controlledIndex,
  onChange,
  variant = 'line',
  style: customStyle,
}: StaticTabsProps): React.ReactElement {
  const tabsId = generateId('tabs');
  const [internalIndex, setInternalIndex] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;

  const handleTabClick = useCallback((index: number) => {
    if (tabs[index]?.disabled) return;

    if (onChange) {
      onChange(index);
    } else {
      setInternalIndex(index);
    }
  }, [tabs, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        nextIndex = index - 1;
        if (nextIndex < 0) nextIndex = tabs.length - 1;
        // Skip disabled tabs
        while (tabs[nextIndex]?.disabled && nextIndex !== index) {
          nextIndex--;
          if (nextIndex < 0) nextIndex = tabs.length - 1;
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        nextIndex = index + 1;
        if (nextIndex >= tabs.length) nextIndex = 0;
        // Skip disabled tabs
        while (tabs[nextIndex]?.disabled && nextIndex !== index) {
          nextIndex++;
          if (nextIndex >= tabs.length) nextIndex = 0;
        }
        break;

      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        // Skip disabled tabs
        while (tabs[nextIndex]?.disabled && nextIndex < tabs.length) {
          nextIndex++;
        }
        break;

      case 'End':
        e.preventDefault();
        nextIndex = tabs.length - 1;
        // Skip disabled tabs
        while (tabs[nextIndex]?.disabled && nextIndex >= 0) {
          nextIndex--;
        }
        break;

      default:
        return;
    }

    if (nextIndex !== index && !tabs[nextIndex]?.disabled) {
      handleTabClick(nextIndex);
      tabRefs.current[nextIndex]?.focus();
    }
  }, [tabs, handleTabClick]);

  const wrapperStyle = mergeStyles(styles.wrapper, customStyle);
  const tablistStyle = mergeStyles(
    styles.tablist,
    variant === 'pills' ? styles.tablistPills : undefined,
    variant === 'boxed' ? styles.tablistBoxed : undefined
  );

  return (
    <div data-liquid-type="tabs" data-variant={variant} style={wrapperStyle}>
      <div role="tablist" style={tablistStyle}>
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          const tabId = `${tabsId}-tab-${index}`;
          const panelId = `${tabsId}-panel-${index}`;

          const tabStyle = mergeStyles(
            styles.tab,
            variant === 'pills' ? styles.tabPills : undefined,
            variant === 'boxed' ? styles.tabBoxed : undefined,
            isActive ? styles.tabActive : undefined,
            isActive && variant === 'pills' ? styles.tabActivePills : undefined,
            isActive && variant === 'boxed' ? styles.tabActiveBoxed : undefined,
            tab.disabled ? styles.tabDisabled : undefined
          );

          return (
            <button
              key={index}
              ref={el => { tabRefs.current[index] = el; }}
              id={tabId}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={panelId}
              aria-disabled={tab.disabled}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              style={tabStyle}
              onClick={() => handleTabClick(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              {tab.label}
              {isActive && variant === 'line' && (
                <span style={styles.tabIndicatorLine} />
              )}
            </button>
          );
        })}
      </div>

      <div style={styles.panels}>
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          const tabId = `${tabsId}-tab-${index}`;
          const panelId = `${tabsId}-panel-${index}`;

          return (
            <div
              key={index}
              id={panelId}
              role="tabpanel"
              aria-labelledby={tabId}
              tabIndex={0}
              hidden={!isActive}
              style={styles.panel}
            >
              {isActive && tab.content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Tabs;
