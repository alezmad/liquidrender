// Header Component - Fixed top navigation bar with title and actions
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, baseStyles, mergeStyles } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

type HeaderHeight = '48px' | '56px' | '64px' | '72px';

// ============================================================================
// Styles
// ============================================================================

const styles = {
  header: (sticky: boolean, height: HeaderHeight): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height,
    padding: `0 ${tokens.spacing.lg}`,
    backgroundColor: tokens.colors.card,
    borderBottom: `1px solid ${tokens.colors.border}`,
    boxShadow: tokens.shadow.sm,
    position: sticky ? 'sticky' : 'relative',
    top: sticky ? 0 : undefined,
    left: 0,
    right: 0,
    zIndex: sticky ? 50 : undefined,
  }),

  headerStart: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },

  headerTitle: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.foreground,
    margin: 0,
  },

  headerEnd: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },

  // Responsive styles for mobile
  '@media (max-width: 768px)': {
    headerTitle: {
      fontSize: tokens.fontSize.lg,
    },
  },
};

// ============================================================================
// Helpers
// ============================================================================

function getHeaderHeight(size?: string): HeaderHeight {
  switch (size) {
    case 'sm':
    case 'small':
      return '48px';
    case 'md':
    case 'medium':
      return '56px';
    case 'lg':
    case 'large':
      return '72px';
    default:
      return '64px';
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function Header({ block, data, children }: LiquidComponentProps): React.ReactElement {
  // Resolve title binding
  const title = block.binding
    ? String(resolveBinding(block.binding, data) ?? '')
    : (block.label || '');

  // Extract properties - sticky is default, disable with style.color = 'static'
  const sticky = block.style?.color !== 'static'; // Default true
  const size = block.style?.size;
  const height = getHeaderHeight(size);

  return (
    <header
      data-liquid-type="header"
      data-sticky={sticky}
      style={styles.header(sticky, height)}
    >
      <div style={styles.headerStart}>
        <h1 style={styles.headerTitle}>{title}</h1>
      </div>
      <div style={styles.headerEnd}>
        {children}
      </div>
    </header>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

interface StaticHeaderProps {
  title?: string;
  sticky?: boolean;
  height?: HeaderHeight;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
}

export function StaticHeader({
  title,
  sticky = true,
  height = '64px',
  style: customStyle,
  children,
  startContent,
  endContent,
}: StaticHeaderProps): React.ReactElement {
  const headerStyle = mergeStyles(
    baseStyles(),
    styles.header(sticky, height),
    customStyle
  );

  return (
    <header data-liquid-type="header" data-sticky={sticky} style={headerStyle}>
      <div style={styles.headerStart}>
        {startContent || (title && <h1 style={styles.headerTitle}>{title}</h1>)}
      </div>
      <div style={styles.headerEnd}>
        {endContent || children}
      </div>
    </header>
  );
}

export default Header;
