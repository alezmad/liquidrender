// Breadcrumb Component - Hierarchical navigation with clickable items
import React from 'react';
import type { LiquidComponentProps } from './utils';
import type { Binding } from '../../compiler/ui-emitter';
import { tokens, baseStyles, mergeStyles, formatDisplayValue } from './utils';
import { resolveBinding, type DataContext } from '../data-context';

// ============================================================================
// Types
// ============================================================================

interface Crumb {
  label: string;
  signal?: string;
  value?: unknown;
}

interface CrumbBlock {
  type: 'crumb';
  label?: string;
  binding?: Binding;
  signals?: { emit?: { name?: string; value?: string } };
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  nav: mergeStyles(
    baseStyles(),
    {
      display: 'flex',
      alignItems: 'center',
    }
  ),
  list: {
    display: 'flex',
    alignItems: 'center',
    listStyle: 'none',
    margin: 0,
    padding: 0,
    gap: tokens.spacing.xs,
    flexWrap: 'wrap',
  } as React.CSSProperties,
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  } as React.CSSProperties,
  link: {
    color: tokens.colors.primary,
    textDecoration: 'none',
    fontSize: tokens.fontSize.sm,
    cursor: 'pointer',
    transition: `color ${tokens.transition.fast}`,
  } as React.CSSProperties,
  linkHover: {
    textDecoration: 'underline',
  } as React.CSSProperties,
  current: {
    color: tokens.colors.foreground,
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
  } as React.CSSProperties,
  separator: {
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    userSelect: 'none',
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract crumb items from children blocks
 */
function extractCrumbs(children: unknown[], data: DataContext): Crumb[] {
  if (!children || !Array.isArray(children)) return [];

  return children
    .filter((child): child is CrumbBlock => {
      return typeof child === 'object' && child !== null && (child as CrumbBlock).type === 'crumb';
    })
    .map((child) => {
      // Get label from child binding or label
      const value = child.binding ? resolveBinding(child.binding, data) : null;

      // Determine label: explicit label takes priority, then formatted value
      let label: string;
      if (child.label) {
        label = child.label;
      } else if (value !== null && value !== undefined) {
        label = formatDisplayValue(value);
      } else {
        label = '';
      }

      // Extract signal in "name=value" format
      const emit = child.signals?.emit;
      const signal = emit?.name
        ? (emit.value ? `${emit.name}=${emit.value}` : emit.name)
        : undefined;

      return {
        label,
        signal,
        value,
      };
    })
    .filter(crumb => crumb.label !== ''); // Filter out empty labels
}

/**
 * Handle click with signal emission
 */
function handleCrumbClick(signal: string | undefined, index: number): void {
  if (!signal) return;

  // Parse signal format: "nav=home" or just "nav"
  const [signalName, signalValue] = signal.includes('=')
    ? signal.split('=')
    : [signal, index.toString()];

  // Emit custom event for signal
  const event = new CustomEvent('liquid-signal', {
    detail: { signal: signalName, value: signalValue },
    bubbles: true,
  });
  window.dispatchEvent(event);
}

// ============================================================================
// Main Component
// ============================================================================

export function Breadcrumb({ block, data }: LiquidComponentProps): React.ReactElement {
  // Extract crumbs from children or binding
  let crumbs: Crumb[] = [];

  if (block.children && block.children.length > 0) {
    // Children blocks (preferred)
    crumbs = extractCrumbs(block.children, data);
  } else if (block.binding) {
    // Binding to data array
    const value = resolveBinding(block.binding, data);
    if (Array.isArray(value)) {
      crumbs = value.map((item) => {
        // Handle different item formats
        let label: string;
        if (typeof item === 'string') {
          label = item;
        } else if (item && typeof item === 'object' && 'label' in item) {
          // Object with label property (e.g., { label: "Home", href: "/" })
          label = String((item as { label: unknown }).label);
        } else {
          label = formatDisplayValue(item);
        }
        return { label, signal: undefined };
      });
    }
  }

  // Empty state
  if (crumbs.length === 0) {
    return (
      <nav data-liquid-type="breadcrumb" aria-label="Breadcrumb" style={styles.nav}>
        <ol style={styles.list}>
          <li style={styles.item}>
            <span style={styles.current} aria-current="page">—</span>
          </li>
        </ol>
      </nav>
    );
  }

  // Use style.separator if provided, otherwise default to '/'
  // Note: block.label is often auto-set from field names, so we don't use it for separator
  const separator = (block.style as Record<string, unknown> | undefined)?.separator as string || '/';

  return (
    <nav data-liquid-type="breadcrumb" aria-label="Breadcrumb" style={styles.nav}>
      <ol style={styles.list}>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <li key={index} style={styles.item}>
              {isLast ? (
                // Current page (not clickable)
                <span
                  style={styles.current}
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              ) : (
                <>
                  {/* Clickable link */}
                  <a
                    href="#"
                    style={styles.link}
                    data-signal={crumb.signal}
                    onClick={(e) => {
                      e.preventDefault();
                      handleCrumbClick(crumb.signal, index);
                    }}
                    onMouseEnter={(e) => {
                      Object.assign(e.currentTarget.style, styles.linkHover);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    {crumb.label}
                  </a>
                  {/* Separator */}
                  <span style={styles.separator} aria-hidden="true">
                    {separator}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

interface StaticBreadcrumbProps {
  items: Array<{ label: string; onClick?: () => void }>;
  separator?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function StaticBreadcrumb({
  items,
  separator = '/',
  style: customStyle,
}: StaticBreadcrumbProps): React.ReactElement {
  const navStyle = mergeStyles(styles.nav, customStyle);

  return (
    <nav data-liquid-type="breadcrumb" aria-label="Breadcrumb" style={navStyle}>
      <ol style={styles.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} style={styles.item}>
              {isLast ? (
                <span style={styles.current} aria-current="page">
                  {item.label}
                </span>
              ) : (
                <>
                  <a
                    href="#"
                    style={styles.link}
                    onClick={(e) => {
                      e.preventDefault();
                      item.onClick?.();
                    }}
                    onMouseEnter={(e) => {
                      Object.assign(e.currentTarget.style, styles.linkHover);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    {item.label}
                  </a>
                  <span style={styles.separator} aria-hidden="true">
                    {separator}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
