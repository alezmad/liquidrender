// Accordion Component - Expandable/collapsible section
import React, { useState, useCallback } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, mergeStyles, generateId } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: {
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
  } as React.CSSProperties,

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.background,
    border: 'none',
    cursor: 'pointer',
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
    textAlign: 'left' as const,
    transition: `background-color ${tokens.transition.fast}`,
  } as React.CSSProperties,

  headerHover: {
    backgroundColor: tokens.colors.accent,
  } as React.CSSProperties,

  chevron: {
    transition: `transform ${tokens.transition.normal}`,
    fontSize: tokens.fontSize.xs,
  } as React.CSSProperties,

  chevronOpen: {
    transform: 'rotate(180deg)',
  } as React.CSSProperties,

  content: {
    padding: tokens.spacing.md,
    paddingTop: 0,
    backgroundColor: tokens.colors.background,
    transition: `all ${tokens.transition.normal}`,
  } as React.CSSProperties,

  contentHidden: {
    display: 'none',
  } as React.CSSProperties,
};

// ============================================================================
// Main Component
// ============================================================================

export function Accordion({ block, data, children }: LiquidComponentProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const accordionId = generateId('accordion');
  const contentId = `${accordionId}-content`;

  // Resolve title from binding or label
  const title = block.label || resolveBinding(block.binding, data) || 'Details';

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const chevronStyle = mergeStyles(
    styles.chevron,
    isOpen ? styles.chevronOpen : {}
  );

  const contentStyle = mergeStyles(
    styles.content,
    !isOpen ? styles.contentHidden : {}
  );

  return (
    <div data-liquid-type="accordion" style={styles.wrapper}>
      <button
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-controls={contentId}
        style={styles.header}
      >
        <span>{String(title)}</span>
        <span style={chevronStyle}>▼</span>
      </button>
      <div
        id={contentId}
        role="region"
        aria-labelledby={accordionId}
        style={contentStyle}
        hidden={!isOpen}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Static Accordion
// ============================================================================

export interface StaticAccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  style?: React.CSSProperties;
}

export function StaticAccordion({
  title,
  children,
  defaultOpen = false,
  style: customStyle,
}: StaticAccordionProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const accordionId = generateId('accordion');
  const contentId = `${accordionId}-content`;

  const chevronStyle = mergeStyles(
    styles.chevron,
    isOpen ? styles.chevronOpen : {}
  );

  const contentStyle = mergeStyles(
    styles.content,
    !isOpen ? styles.contentHidden : {}
  );

  return (
    <div data-liquid-type="accordion" style={mergeStyles(styles.wrapper, customStyle)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        style={styles.header}
      >
        <span>{title}</span>
        <span style={chevronStyle}>▼</span>
      </button>
      <div
        id={contentId}
        role="region"
        style={contentStyle}
        hidden={!isOpen}
      >
        {children}
      </div>
    </div>
  );
}

export default Accordion;
