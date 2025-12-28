// AlertDialog Component - Modal dialog for confirming destructive actions
import React, { useEffect, useCallback, useRef, useState } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, buttonStyles, generateId } from './utils';

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
  };
}

// ============================================================================
// Focus Trap Hook
// ============================================================================

function useFocusTrap(isOpen: boolean, ref: React.RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    if (!isOpen || !ref.current) return;

    const element = ref.current;
    const focusableElements = element.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus first focusable element (cancel button for safety)
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    return () => element.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, ref]);
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
// Static Component (standalone usage)
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
  children,
}: StaticAlertDialogProps): React.ReactElement | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(generateId('alertdialog-title'));
  const descId = useRef(generateId('alertdialog-desc'));

  // Focus trap
  useFocusTrap(isOpen, dialogRef);

  // Escape key handler - does NOT close by default for alert dialogs
  // User must explicitly choose cancel or confirm
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  injectStyles();

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

  if (!isOpen) return null;

  return (
    <div
      style={styles.overlay}
      role="presentation"
      // Alert dialogs should not close on overlay click
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={title ? titleId.current : undefined}
        aria-describedby={description ? descId.current : undefined}
        data-liquid-type="alertdialog"
        style={styles.content}
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
