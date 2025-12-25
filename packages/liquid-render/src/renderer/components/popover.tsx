// Popover Component - Floating content panel
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, mergeStyles, generateId } from './utils';

// ============================================================================
// Types
// ============================================================================

export type PopoverPlacement = 'top' | 'bottom' | 'left' | 'right';

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: {
    position: 'relative' as const,
    display: 'inline-block',
  } as React.CSSProperties,

  trigger: {
    cursor: 'pointer',
    outline: 'none',
    borderRadius: tokens.radius.sm,
    background: 'none',
    border: 'none',
    padding: 0,
    font: 'inherit',
    color: 'inherit',
  } as React.CSSProperties,

  triggerFocus: {
    outline: `2px solid ${tokens.colors.ring}`,
    outlineOffset: '2px',
  } as React.CSSProperties,

  content: {
    position: 'absolute' as const,
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: tokens.spacing.xs,
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.card,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.md,
    boxShadow: tokens.shadow.md,
    zIndex: 50,
    minWidth: '12rem',
  } as React.CSSProperties,

  contentHidden: {
    display: 'none',
  } as React.CSSProperties,

  arrow: {
    position: 'absolute' as const,
    top: '-6px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderBottom: `6px solid ${tokens.colors.border}`,
  } as React.CSSProperties,
};

// ============================================================================
// Main Component
// ============================================================================

export function Popover({ block, children }: LiquidComponentProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const popoverId = generateId('popover');

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const contentStyle = mergeStyles(
    styles.content,
    !isOpen ? styles.contentHidden : {}
  );

  return (
    <div data-liquid-type="popover" ref={wrapperRef} style={styles.wrapper}>
      <button
        type="button"
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleOpen();
          }
        }}
        style={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={popoverId}
      >
        {children}
      </button>
      {isOpen && (
        <div
          id={popoverId}
          role="dialog"
          aria-modal="false"
          style={contentStyle}
        >
          <div style={styles.arrow} />
          {/* Content children would be rendered here by parent */}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Static Popover
// ============================================================================

export interface StaticPopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  placement?: PopoverPlacement;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  style?: React.CSSProperties;
}

export function StaticPopover({
  trigger,
  children,
  placement = 'bottom',
  defaultOpen = false,
  onOpenChange,
  style: customStyle,
}: StaticPopoverProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const popoverId = generateId('popover');

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        const newState = false;
        setIsOpen(newState);
        onOpenChange?.(newState);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onOpenChange]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const newState = false;
        setIsOpen(newState);
        onOpenChange?.(newState);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onOpenChange]);

  const handleToggle = useCallback(() => {
    const newState = !isOpen;
    setIsOpen(newState);
    onOpenChange?.(newState);
  }, [isOpen, onOpenChange]);

  // Placement styles
  const placementStyles: Record<PopoverPlacement, React.CSSProperties> = {
    top: {
      bottom: '100%',
      top: 'auto',
      marginBottom: tokens.spacing.xs,
      marginTop: 0,
      left: '50%',
      transform: 'translateX(-50%)',
    },
    bottom: {
      top: '100%',
      bottom: 'auto',
      marginTop: tokens.spacing.xs,
      marginBottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
    },
    left: {
      right: '100%',
      left: 'auto',
      top: '50%',
      transform: 'translateY(-50%)',
      marginRight: tokens.spacing.xs,
      marginTop: 0,
      marginBottom: 0,
    },
    right: {
      left: '100%',
      right: 'auto',
      top: '50%',
      transform: 'translateY(-50%)',
      marginLeft: tokens.spacing.xs,
      marginTop: 0,
      marginBottom: 0,
    },
  };

  // Arrow styles for different placements
  const arrowStyles: Record<PopoverPlacement, React.CSSProperties> = {
    top: {
      top: 'auto',
      bottom: '-6px',
      left: '50%',
      transform: 'translateX(-50%)',
      borderLeft: '6px solid transparent',
      borderRight: '6px solid transparent',
      borderTop: `6px solid ${tokens.colors.border}`,
      borderBottom: 'none',
    },
    bottom: {
      top: '-6px',
      bottom: 'auto',
      left: '50%',
      transform: 'translateX(-50%)',
      borderLeft: '6px solid transparent',
      borderRight: '6px solid transparent',
      borderBottom: `6px solid ${tokens.colors.border}`,
      borderTop: 'none',
    },
    left: {
      left: 'auto',
      right: '-6px',
      top: '50%',
      transform: 'translateY(-50%)',
      borderTop: '6px solid transparent',
      borderBottom: '6px solid transparent',
      borderLeft: `6px solid ${tokens.colors.border}`,
      borderRight: 'none',
    },
    right: {
      left: '-6px',
      right: 'auto',
      top: '50%',
      transform: 'translateY(-50%)',
      borderTop: '6px solid transparent',
      borderBottom: '6px solid transparent',
      borderRight: `6px solid ${tokens.colors.border}`,
      borderLeft: 'none',
    },
  };

  const contentStyle = mergeStyles(
    styles.content,
    placementStyles[placement],
    !isOpen ? styles.contentHidden : {},
    customStyle
  );

  const arrowStyle = mergeStyles(
    styles.arrow,
    arrowStyles[placement]
  );

  return (
    <div ref={wrapperRef} style={styles.wrapper}>
      <div onClick={handleToggle} style={styles.trigger}>
        {trigger}
      </div>
      {isOpen && (
        <div id={popoverId} role="tooltip" style={contentStyle}>
          <div style={arrowStyle} />
          {children}
        </div>
      )}
    </div>
  );
}

export default Popover;
