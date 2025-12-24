// Modal Component - Dialog overlay with focus trap
import React, { useEffect, useCallback, useRef, useState } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, baseStyles, generateId } from './utils';

// ============================================================================
// Types
// ============================================================================

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

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

  overlayHidden: {
    display: 'none',
  } as React.CSSProperties,

  content: (size: ModalSize): React.CSSProperties => {
    const widths: Record<ModalSize, string> = {
      sm: '24rem',
      md: '32rem',
      lg: '42rem',
      xl: '56rem',
      full: 'calc(100vw - 2rem)',
    };

    return mergeStyles(
      cardStyles(),
      {
        position: 'relative',
        maxHeight: 'calc(100vh - 2rem)',
        width: widths[size],
        maxWidth: 'calc(100vw - 2rem)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: tokens.shadow.lg,
        animation: 'modalFadeIn 0.15s ease-out',
      }
    );
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacing.md,
    borderBottom: `1px solid ${tokens.colors.border}`,
  } as React.CSSProperties,

  title: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.foreground,
    margin: 0,
  } as React.CSSProperties,

  closeButton: mergeStyles(baseStyles(), {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2rem',
    height: '2rem',
    borderRadius: tokens.radius.md,
    border: 'none',
    backgroundColor: 'transparent',
    color: tokens.colors.mutedForeground,
    cursor: 'pointer',
    transition: `all ${tokens.transition.fast}`,
  }),

  body: {
    flex: 1,
    overflow: 'auto',
    padding: tokens.spacing.md,
  } as React.CSSProperties,

  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    borderTop: `1px solid ${tokens.colors.border}`,
  } as React.CSSProperties,
};

// Global style injection for animation
const styleId = 'liquid-modal-styles';
function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// Focus Trap Hook
// ============================================================================

function useFocusTrap(isOpen: boolean, ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!isOpen || !ref.current) return;

    const element = ref.current;
    const focusableElements = element.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
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
// Close Button
// ============================================================================

function CloseButton({ onClick }: { onClick: () => void }): React.ReactElement {
  return (
    <button
      onClick={onClick}
      style={styles.closeButton}
      aria-label="Close"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

// ============================================================================
// Main Component (Block-based - for layer modals)
// ============================================================================

export function Modal({ block, data, children }: LiquidComponentProps): React.ReactElement {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(generateId('modal-title'));

  // For block-based modals, visibility is controlled by signals/layers
  // This component just renders the content
  const title = block.label;

  injectStyles();

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId.current : undefined}
      data-liquid-type="modal"
      style={styles.content('md')}
    >
      {title && (
        <div style={styles.header}>
          <h2 id={titleId.current} style={styles.title}>{title}</h2>
        </div>
      )}
      <div style={styles.body}>
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Controlled Modal (for programmatic usage)
// ============================================================================

interface ControlledModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  style?: React.CSSProperties;
}

export function ControlledModal({
  isOpen,
  onClose,
  title,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  children,
  footer,
  style: customStyle,
}: ControlledModalProps): React.ReactElement | null {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(generateId('modal-title'));

  // Focus trap
  useFocusTrap(isOpen, modalRef);

  // Escape key handler
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

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

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={styles.overlay}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId.current : undefined}
        style={mergeStyles(styles.content(size), customStyle)}
      >
        {(title || showCloseButton) && (
          <div style={styles.header}>
            {title && <h2 id={titleId.current} style={styles.title}>{title}</h2>}
            {showCloseButton && <CloseButton onClick={onClose} />}
          </div>
        )}
        <div style={styles.body}>{children}</div>
        {footer && <div style={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}

// ============================================================================
// useModal Hook
// ============================================================================

interface UseModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useModal(initialOpen = false): UseModalReturn {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return {
    isOpen,
    open: useCallback(() => setIsOpen(true), []),
    close: useCallback(() => setIsOpen(false), []),
    toggle: useCallback(() => setIsOpen(prev => !prev), []),
  };
}

export default Modal;
