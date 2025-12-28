// HoverCard Component - Rich content card on hover
// DSL: Hc [trigger] [content] or Hc "label" :binding [trigger]
// Example: Hc [Av :user] [Tx :userProfile], Hc [Bt "Info"] [Cd [Tx :details]]
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, generateId } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

export type HoverCardPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface HoverCardContent {
  title?: string;
  description?: string;
  avatar?: string;
  avatarInitials?: string;
  links?: Array<{ label: string; href: string }>;
}

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
  } as React.CSSProperties,

  triggerFocus: {
    outline: `2px solid ${tokens.colors.ring}`,
    outlineOffset: '2px',
  } as React.CSSProperties,

  content: {
    position: 'absolute' as const,
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: tokens.spacing.sm,
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.card,
    color: tokens.colors.cardForeground,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.lg,
    boxShadow: tokens.shadow.lg,
    zIndex: 100,
    minWidth: '16rem',
    maxWidth: '20rem',
  } as React.CSSProperties,

  contentHidden: {
    visibility: 'hidden' as const,
    opacity: 0,
    pointerEvents: 'none' as const,
  } as React.CSSProperties,

  contentVisible: {
    visibility: 'visible' as const,
    opacity: 1,
  } as React.CSSProperties,

  arrow: {
    position: 'absolute' as const,
    bottom: '-6px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderTop: `6px solid ${tokens.colors.border}`,
  } as React.CSSProperties,

  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.sm,
  } as React.CSSProperties,

  avatar: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '3rem',
    height: '3rem',
    borderRadius: tokens.radius.full,
    overflow: 'hidden',
    backgroundColor: tokens.colors.muted,
    color: tokens.colors.mutedForeground,
    fontWeight: tokens.fontWeight.medium,
    fontSize: tokens.fontSize.base,
    flexShrink: 0,
  } as React.CSSProperties,

  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  } as React.CSSProperties,

  info: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.xs,
  } as React.CSSProperties,

  title: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.foreground,
    margin: 0,
  } as React.CSSProperties,

  description: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
    margin: 0,
    lineHeight: 1.4,
  } as React.CSSProperties,

  links: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.sm,
    paddingTop: tokens.spacing.sm,
    borderTop: `1px solid ${tokens.colors.border}`,
  } as React.CSSProperties,

  link: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.primary,
    textDecoration: 'none',
  } as React.CSSProperties,

  empty: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.mutedForeground,
    textAlign: 'center' as const,
    padding: tokens.spacing.sm,
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getPlacementStyles(placement: HoverCardPlacement): {
  content: React.CSSProperties;
  arrow: React.CSSProperties;
} {
  const contentStyles: Record<HoverCardPlacement, React.CSSProperties> = {
    top: {
      bottom: '100%',
      top: 'auto',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: tokens.spacing.sm,
      marginTop: 0,
    },
    bottom: {
      top: '100%',
      bottom: 'auto',
      left: '50%',
      transform: 'translateX(-50%)',
      marginTop: tokens.spacing.sm,
      marginBottom: 0,
    },
    left: {
      right: '100%',
      left: 'auto',
      top: '50%',
      transform: 'translateY(-50%)',
      marginRight: tokens.spacing.sm,
      marginBottom: 0,
      marginTop: 0,
    },
    right: {
      left: '100%',
      right: 'auto',
      top: '50%',
      transform: 'translateY(-50%)',
      marginLeft: tokens.spacing.sm,
      marginBottom: 0,
      marginTop: 0,
    },
  };

  const arrowStyles: Record<HoverCardPlacement, React.CSSProperties> = {
    top: {
      top: 'auto',
      bottom: '-6px',
      left: '50%',
      right: 'auto',
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
      right: 'auto',
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
      bottom: 'auto',
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
      bottom: 'auto',
      transform: 'translateY(-50%)',
      borderTop: '6px solid transparent',
      borderBottom: '6px solid transparent',
      borderRight: `6px solid ${tokens.colors.border}`,
      borderLeft: 'none',
    },
  };

  return {
    content: contentStyles[placement],
    arrow: arrowStyles[placement],
  };
}

// ============================================================================
// Sub-components
// ============================================================================

interface HoverCardContentRendererProps {
  content: HoverCardContent | null;
  children?: React.ReactNode;
}

function HoverCardContentRenderer({ content, children }: HoverCardContentRendererProps): React.ReactElement {
  // If we have children (from DSL), render them
  if (children) {
    return <>{children}</>;
  }

  // If no content data, show empty state
  if (!content) {
    return <div style={styles.empty}>No content available</div>;
  }

  const hasHeader = content.title || content.avatar || content.avatarInitials;
  const hasLinks = content.links && content.links.length > 0;

  return (
    <>
      {hasHeader && (
        <div style={styles.header}>
          {(content.avatar || content.avatarInitials) && (
            <span style={styles.avatar}>
              {content.avatar ? (
                <img src={content.avatar} alt="" style={styles.avatarImage} />
              ) : (
                content.avatarInitials || '?'
              )}
            </span>
          )}
          <div style={styles.info}>
            {content.title && <p style={styles.title}>{content.title}</p>}
            {content.description && <p style={styles.description}>{content.description}</p>}
          </div>
        </div>
      )}
      {!hasHeader && content.description && (
        <p style={styles.description}>{content.description}</p>
      )}
      {hasLinks && (
        <div style={styles.links}>
          {content.links!.map((link, index) => (
            <a
              key={index}
              href={link.href}
              style={styles.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function HoverCard({ block, data, children }: LiquidComponentProps): React.ReactElement {
  const [isVisible, setIsVisible] = useState(false);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const hovercardId = generateId('hovercard');

  // Resolve content from binding if provided
  const boundValue = resolveBinding(block.binding, data);
  let content: HoverCardContent | null = null;

  if (boundValue && typeof boundValue === 'object') {
    const obj = boundValue as Record<string, unknown>;
    content = {
      title: obj.title as string || obj.name as string,
      description: obj.description as string || obj.bio as string,
      avatar: obj.avatar as string || obj.image as string || obj.picture as string,
      avatarInitials: obj.initials as string || (obj.name ? getInitials(String(obj.name)) : undefined),
      links: obj.links as Array<{ label: string; href: string }>,
    };
  } else if (typeof boundValue === 'string') {
    content = { description: boundValue };
  }

  // Timing configuration
  const showDelay = 500; // Delay before showing
  const hideDelay = 300; // Delay before hiding (allows moving to content)

  const clearTimeouts = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearTimeouts();
    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, showDelay);
  }, [clearTimeouts]);

  const handleMouseLeave = useCallback(() => {
    clearTimeouts();
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, hideDelay);
  }, [clearTimeouts]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  const contentStyle = mergeStyles(
    styles.content,
    isVisible ? styles.contentVisible : styles.contentHidden
  );

  // Separate trigger and content children
  const childArray = React.Children.toArray(children);
  const triggerChild = childArray[0];
  const contentChildren = childArray.slice(1);

  return (
    <span
      data-liquid-type="hovercard"
      ref={wrapperRef}
      style={styles.wrapper}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      <span
        style={styles.trigger}
        tabIndex={0}
        aria-describedby={hovercardId}
      >
        {triggerChild}
      </span>
      <span
        id={hovercardId}
        role="tooltip"
        aria-hidden={!isVisible}
        style={contentStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span style={styles.arrow} />
        <HoverCardContentRenderer content={content}>
          {contentChildren.length > 0 ? contentChildren : null}
        </HoverCardContentRenderer>
      </span>
    </span>
  );
}

// ============================================================================
// Static HoverCard
// ============================================================================

export interface StaticHoverCardProps {
  trigger: React.ReactNode;
  children?: React.ReactNode;
  content?: HoverCardContent;
  placement?: HoverCardPlacement;
  showDelay?: number;
  hideDelay?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  style?: React.CSSProperties;
}

export function StaticHoverCard({
  trigger,
  children,
  content,
  placement = 'top',
  showDelay = 500,
  hideDelay = 300,
  open,
  onOpenChange,
  style: customStyle,
}: StaticHoverCardProps): React.ReactElement {
  const [internalVisible, setInternalVisible] = useState(false);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const hovercardId = generateId('hovercard');

  // Support controlled mode
  const isVisible = open !== undefined ? open : internalVisible;

  const clearTimeouts = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const setVisible = useCallback((value: boolean) => {
    if (open !== undefined) {
      onOpenChange?.(value);
    } else {
      setInternalVisible(value);
    }
  }, [open, onOpenChange]);

  const handleMouseEnter = useCallback(() => {
    clearTimeouts();
    showTimeoutRef.current = setTimeout(() => {
      setVisible(true);
    }, showDelay);
  }, [clearTimeouts, showDelay, setVisible]);

  const handleMouseLeave = useCallback(() => {
    clearTimeouts();
    hideTimeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, hideDelay);
  }, [clearTimeouts, hideDelay, setVisible]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  const placementStyles = getPlacementStyles(placement);

  const contentStyle = mergeStyles(
    styles.content,
    placementStyles.content,
    isVisible ? styles.contentVisible : styles.contentHidden,
    customStyle
  );

  const arrowStyle = mergeStyles(
    styles.arrow,
    placementStyles.arrow
  );

  return (
    <span
      ref={wrapperRef}
      style={styles.wrapper}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      <span style={styles.trigger} tabIndex={0} aria-describedby={hovercardId}>
        {trigger}
      </span>
      <span
        id={hovercardId}
        role="tooltip"
        aria-hidden={!isVisible}
        style={contentStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span style={arrowStyle} />
        {children || <HoverCardContentRenderer content={content || null} />}
      </span>
    </span>
  );
}

export default HoverCard;
