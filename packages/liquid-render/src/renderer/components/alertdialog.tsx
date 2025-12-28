// AlertDialog Component - Modal dialog for confirming destructive actions
import React, { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, buttonStyles, generateId } from './utils';
import { createFocusTrap, getPortalContainer, canUseDOM, type FocusTrap } from './utils/focus-trap';

// ============================================================================
// Types
// ============================================================================

type AlertDialogVariant = 'default' | 'destructive';

interface AlertDialogConfig {
  title?: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  variant?: AlertDialogVariant;
  closeOnBackdropClick?: boolean;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    backdropFilter: 'blur(2px)',
  } as React.CSSProperties,

  content: mergeStyles(cardStyles(), {
    position: 'relative',
    width: '28rem',
    maxWidth: 'calc(100vw - 2rem)',
    maxHeight: 'calc(100vh - 2rem)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: tokens.shadow.lg,
    animation: 'alertDialogFadeIn 0.15s ease-out',
  }),

  header: {
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.sm,
  } as React.CSSProperties,

  title: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.foreground,
    margin: 0,
    marginBottom: tokens.spacing.xs,
  } as React.CSSProperties,

  description: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.mutedForeground,
    margin: 0,
    lineHeight: 1.5,
  } as React.CSSProperties,

  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    paddingTop: tokens.spacing.sm,
  } as React.CSSProperties,

  cancelButton: mergeStyles(buttonStyles('outline', 'md'), {
    minWidth: '5rem',
  }),

  confirmButton: (variant: AlertDialogVariant): React.CSSProperties =>
    mergeStyles(buttonStyles(variant === 'destructive' ? 'destructive' : 'default', 'md'), {
      minWidth: '5rem',
    }),
};

// ============================================================================
// Helpers
// ============================================================================

// Global style injection for animation
const styleId = 'liquid-alertdialog-styles';
function injectStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes alertDialogFadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

function extractConfig(block: LiquidComponentProps['block']): AlertDialogConfig {
  const props = block.props ?? {};
  return {
    title: block.label || (props.title as string | undefined),
    description: props.description as string | undefined,
    cancelLabel: (props.cancelLabel as string | undefined) || 'Cancel',
    confirmLabel: (props.confirmLabel as string | undefined) || 'Confirm',
    variant: (props.variant as AlertDialogVariant | undefined) || 'default',
    closeOnBackdropClick: (props.closeOnBackdropClick as boolean | undefined) ?? false,
  };
}

// ============================================================================
// Custom Hook for Focus Trap
// ============================================================================

function usePortalFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
  options: {
    onEscape?: () => void;
    onClickOutside?: () => void;
    returnFocusTo?: HTMLElement | null;
  } = {}
): void {
  const trapRef = useRef<FocusTrap | null>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) {
      // Deactivate trap when closing
      if (trapRef.current) {
        trapRef.current.deactivate();
        trapRef.current = null;
      }
      return;
    }

    // Store the currently focused element before opening
    if (!triggerElementRef.current) {
      triggerElementRef.current = document.activeElement as HTMLElement;
    }

    // Create and activate focus trap
    trapRef.current = createFocusTrap({
      container: containerRef.current,
      returnFocusTo: options.returnFocusTo ?? triggerElementRef.current,
      onEscape: options.onEscape,
      onClickOutside: options.onClickOutside,
      autoFocus: true,
    });

    trapRef.current.activate();

    return () => {
      if (trapRef.current) {
        trapRef.current.deactivate();
        trapRef.current = null;
      }
      triggerElementRef.current = null;
    };
  }, [isOpen, containerRef, options.onEscape, options.onClickOutside, options.returnFocusTo]);
}

// ============================================================================
// Body Scroll Lock Hook
// ============================================================================

function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked || !canUseDOM) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isLocked]);
}

// ============================================================================
// Main Component
// ============================================================================

export function AlertDialog({ block, children }: LiquidComponentProps): React.ReactElement {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(generateId('alertdialog-title'));
  const descId = useRef(generateId('alertdialog-desc'));

  const config = extractConfig(block);

  injectStyles();

  return (
    <div
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={config.title ? titleId.current : undefined}
      aria-describedby={config.description ? descId.current : undefined}
      data-liquid-type="alertdialog"
      style={styles.content}
    >
      <div style={styles.header}>
        {config.title && (
          <h2 id={titleId.current} style={styles.title}>
            {config.title}
          </h2>
        )}
        {config.description && (
          <p id={descId.current} style={styles.description}>
            {config.description}
          </p>
        )}
      </div>
      {children && <div style={{ padding: tokens.spacing.md, paddingTop: 0 }}>{children}</div>}
      <div style={styles.footer}>
        <button style={styles.cancelButton} type="button">
          {config.cancelLabel}
        </button>
        <button style={styles.confirmButton(config.variant || 'default')} type="button">
          {config.confirmLabel}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage with portal rendering)
// ============================================================================

interface StaticAlertDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  variant?: AlertDialogVariant;
  /** Whether clicking the backdrop closes the dialog (default: false for alert dialogs) */
  closeOnBackdropClick?: boolean;
  /** Custom element to return focus to when closed */
  returnFocusTo?: HTMLElement | null;
  /** Custom portal container ID */
  portalContainerId?: string;
  children?: React.ReactNode;
}

export function StaticAlertDialog({
  isOpen,
  onCancel,
  onConfirm,
  title = 'Are you sure?',
  description,
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  variant = 'default',
  closeOnBackdropClick = false,
  returnFocusTo,
  portalContainerId = 'liquid-alertdialog-portal',
  children,
}: StaticAlertDialogProps): React.ReactElement | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(generateId('alertdialog-title'));
  const descId = useRef(generateId('alertdialog-desc'));
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  // Get or create portal container on mount
  useEffect(() => {
    if (!canUseDOM) return;
    const container = getPortalContainer(portalContainerId);
    setPortalContainer(container);
  }, [portalContainerId]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent): void => {
      // Only close if clicking the overlay itself, not its children
      if (closeOnBackdropClick && e.target === e.currentTarget) {
        onCancel();
      }
    },
    [closeOnBackdropClick, onCancel]
  );

  // Focus trap with proper escape and click outside handling
  usePortalFocusTrap(dialogRef, isOpen, {
    onEscape: onCancel,
    onClickOutside: closeOnBackdropClick ? onCancel : undefined,
    returnFocusTo,
  });

  // Body scroll lock
  useBodyScrollLock(isOpen);

  // Inject animation styles
  useEffect(() => {
    injectStyles();
  }, []);

  // Handle confirm with keyboard
  const handleConfirmKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onConfirm();
      }
    },
    [onConfirm]
  );

  // Handle cancel with keyboard
  const handleCancelKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onCancel();
      }
    },
    [onCancel]
  );

  // Don't render if not open or no portal container (SSR safety)
  if (!isOpen || !portalContainer) return null;

  const dialogContent = (
    <div
      style={styles.overlay}
      role="presentation"
      onClick={handleBackdropClick}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={title ? titleId.current : undefined}
        aria-describedby={description ? descId.current : undefined}
        data-liquid-type="alertdialog"
        style={styles.content}
        onClick={(e) => e.stopPropagation()} // Prevent backdrop click from bubbling
      >
        <div style={styles.header}>
          {title && (
            <h2 id={titleId.current} style={styles.title}>
              {title}
            </h2>
          )}
          {description && (
            <p id={descId.current} style={styles.description}>
              {description}
            </p>
          )}
        </div>
        {children && <div style={{ padding: tokens.spacing.md, paddingTop: 0 }}>{children}</div>}
        <div style={styles.footer}>
          <button
            style={styles.cancelButton}
            type="button"
            onClick={onCancel}
            onKeyDown={handleCancelKeyDown}
          >
            {cancelLabel}
          </button>
          <button
            style={styles.confirmButton(variant)}
            type="button"
            onClick={onConfirm}
            onKeyDown={handleConfirmKeyDown}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  // Render via portal to document body level
  return createPortal(dialogContent, portalContainer);
}

// ============================================================================
// useAlertDialog Hook
// ============================================================================

interface UseAlertDialogReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export function useAlertDialog(initialOpen = false): UseAlertDialogReturn {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return {
    isOpen,
    open: useCallback(() => setIsOpen(true), []),
    close: useCallback(() => setIsOpen(false), []),
  };
}

export default AlertDialog;
