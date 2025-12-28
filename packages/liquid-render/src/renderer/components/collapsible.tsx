// Collapsible Component - Expandable/collapsible section with trigger
import React, { useState, useCallback } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, mergeStyles, generateId } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

export interface CollapsibleState {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.sm,
  } as React.CSSProperties,

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.md,
    padding: `0 ${tokens.spacing.md}`,
  } as React.CSSProperties,

  title: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.foreground,
  } as React.CSSProperties,

  triggerButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2rem',
    height: '2rem',
    padding: 0,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: tokens.radius.md,
    cursor: 'pointer',
    color: tokens.colors.foreground,
    transition: `background-color ${tokens.transition.fast}`,
  } as React.CSSProperties,

  triggerButtonHover: {
    backgroundColor: tokens.colors.accent,
  } as React.CSSProperties,

  chevron: {
    width: '1rem',
    height: '1rem',
    transition: `transform ${tokens.transition.normal}`,
  } as React.CSSProperties,

  chevronOpen: {
    transform: 'rotate(180deg)',
  } as React.CSSProperties,

  previewItem: {
    borderRadius: tokens.radius.md,
    border: `1px solid ${tokens.colors.border}`,
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    fontSize: tokens.fontSize.sm,
    fontFamily: 'var(--font-mono, ui-monospace, monospace)',
    backgroundColor: tokens.colors.background,
  } as React.CSSProperties,

  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.sm,
    overflow: 'hidden',
    transition: `all ${tokens.transition.normal}`,
  } as React.CSSProperties,

  contentHidden: {
    display: 'none',
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Chevron icon component for the trigger button
 */
function ChevronIcon({ isOpen }: { isOpen: boolean }): React.ReactElement {
  const iconStyle = mergeStyles(
    styles.chevron,
    isOpen ? styles.chevronOpen : {}
  );

  return (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </svg>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface CollapsibleTriggerProps {
  isOpen: boolean;
  onClick: () => void;
  contentId: string;
  label?: string;
}

function CollapsibleTrigger({
  isOpen,
  onClick,
  contentId,
  label = 'Toggle',
}: CollapsibleTriggerProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);

  const buttonStyle = mergeStyles(
    styles.triggerButton,
    isHovered ? styles.triggerButtonHover : {}
  );

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-expanded={isOpen}
      aria-controls={contentId}
      style={buttonStyle}
    >
      <ChevronIcon isOpen={isOpen} />
      <span className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
        {label}
      </span>
    </button>
  );
}

interface CollapsibleContentProps {
  isOpen: boolean;
  id: string;
  children: React.ReactNode;
}

function CollapsibleContentSection({
  isOpen,
  id,
  children,
}: CollapsibleContentProps): React.ReactElement {
  const contentStyle = mergeStyles(
    styles.content,
    !isOpen ? styles.contentHidden : {}
  );

  return (
    <div
      id={id}
      role="region"
      style={contentStyle}
      hidden={!isOpen}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Collapsible({ block, data, children }: LiquidComponentProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const collapsibleId = generateId('collapsible');
  const contentId = `${collapsibleId}-content`;

  // Resolve title from binding or label
  const title = block.label || resolveBinding(block.binding, data) || 'Details';

  // Resolve preview content if specified via props
  const previewBinding = block.props?.preview;
  const previewValue = previewBinding && typeof previewBinding === 'string'
    ? resolveBinding({ kind: 'field', value: previewBinding }, data)
    : null;
  // Convert to string for display
  const preview: string | null = previewValue != null ? String(previewValue) : null;

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Handle empty state
  if (!children && !preview) {
    return (
      <div data-liquid-type="collapsible" style={styles.wrapper}>
        <div style={styles.header}>
          <span style={styles.title}>{String(title)}</span>
        </div>
        <div style={{ ...styles.previewItem, color: tokens.colors.mutedForeground }}>
          No content available
        </div>
      </div>
    );
  }

  return (
    <div data-liquid-type="collapsible" style={styles.wrapper}>
      <div style={styles.header}>
        <span style={styles.title}>{String(title)}</span>
        <CollapsibleTrigger
          isOpen={isOpen}
          onClick={toggleOpen}
          contentId={contentId}
          label={`Toggle ${title}`}
        />
      </div>

      {/* Preview item - always visible */}
      {preview && (
        <div style={styles.previewItem}>
          {preview}
        </div>
      )}

      {/* Collapsible content */}
      <CollapsibleContentSection isOpen={isOpen} id={contentId}>
        {children}
      </CollapsibleContentSection>
    </div>
  );
}

// ============================================================================
// Static Collapsible
// ============================================================================

export interface StaticCollapsibleProps {
  /** Title displayed in the header */
  title: string;
  /** Content to show/hide */
  children: React.ReactNode;
  /** Preview content always visible above collapsible area */
  preview?: React.ReactNode;
  /** Initial open state */
  defaultOpen?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (isOpen: boolean) => void;
  /** Custom styles for the wrapper */
  style?: React.CSSProperties;
}

export function StaticCollapsible({
  title,
  children,
  preview,
  defaultOpen = false,
  onOpenChange,
  style: customStyle,
}: StaticCollapsibleProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const collapsibleId = generateId('collapsible');
  const contentId = `${collapsibleId}-content`;

  const handleToggle = useCallback(() => {
    const newState = !isOpen;
    setIsOpen(newState);
    onOpenChange?.(newState);
  }, [isOpen, onOpenChange]);

  const wrapperStyle = mergeStyles(styles.wrapper, customStyle);

  // Handle empty state
  if (!children && !preview) {
    return (
      <div data-liquid-type="collapsible" style={wrapperStyle}>
        <div style={styles.header}>
          <span style={styles.title}>{title}</span>
        </div>
        <div style={{ ...styles.previewItem, color: tokens.colors.mutedForeground }}>
          No content available
        </div>
      </div>
    );
  }

  return (
    <div data-liquid-type="collapsible" style={wrapperStyle}>
      <div style={styles.header}>
        <span style={styles.title}>{title}</span>
        <CollapsibleTrigger
          isOpen={isOpen}
          onClick={handleToggle}
          contentId={contentId}
          label={`Toggle ${title}`}
        />
      </div>

      {/* Preview content - always visible */}
      {preview && (
        <div style={styles.previewItem}>
          {preview}
        </div>
      )}

      {/* Collapsible content */}
      <CollapsibleContentSection isOpen={isOpen} id={contentId}>
        {children}
      </CollapsibleContentSection>
    </div>
  );
}

export default Collapsible;
