// Sheet Component - Slide-out panel overlay
import React, { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, mergeStyles, baseStyles, generateId } from './utils';
import { useLiquidContext } from '../LiquidUI';

// ============================================================================
// Types
// ============================================================================

type SheetPosition = 'left' | 'right' | 'top' | 'bottom';
type SheetSize = 'sm' | 'md' | 'lg' | 'full';

interface SheetContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

// ============================================================================
// Context
// ============================================================================

const SheetContext = createContext<SheetContextValue | null>(null);

// ============================================================================
// Styles
// ============================================================================

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 40,
    opacity: 1,
    transition: `opacity ${tokens.transition.normal}`,
  } as React.CSSProperties,

  overlayHidden: {
    opacity: 0,
    pointerEvents: 'none' as const,
  } as React.CSSProperties,

  panel: {
    position: 'fixed' as const,
    backgroundColor: tokens.colors.background,
    boxShadow: tokens.shadow.lg,
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column' as const,
    transition: `transform ${tokens.transition.normal}`,
  } as React.CSSProperties,

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacing.md,
    borderBottom: `1px solid ${tokens.colors.border}`,
    flexShrink: 0,
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

  content: {
    flex: 1,
    padding: tokens.spacing.md,
    overflow: 'auto',
  } as React.CSSProperties,
};

// Position-specific styles
const positionStyles: Record<SheetPosition, React.CSSProperties> = {
  right: {
    top: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  left: {
    top: 0,
    left: 0,
    bottom: 0,
    height: '100%',
  },
  top: {
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    borderBottomLeftRadius: tokens.radius.xl,
    borderBottomRightRadius: tokens.radius.xl,
  },
  bottom: {
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
  },
};

// Size mappings for horizontal (left/right) sheets
const horizontalSizes: Record<SheetSize, string> = {
  sm: '16rem',    // 256px
  md: '24rem',    // 384px
  lg: '32rem',    // 512px
  full: '100vw',
};

// Size mappings for vertical (top/bottom) sheets
const verticalSizes: Record<SheetSize, string> = {
  sm: '25vh',
  md: '50vh',
  lg: '75vh',
  full: '100vh',
};

// Hidden transform styles
const hiddenTransforms: Record<SheetPosition, React.CSSProperties> = {
  right: { transform: 'translateX(100%)' },
  left: { transform: 'translateX(-100%)' },
  top: { transform: 'translateY(-100%)' },
  bottom: { transform: 'translateY(100%)' },
};

// ============================================================================
// Helpers
// ============================================================================

function getSizeStyles(position: SheetPosition, size: SheetSize): React.CSSProperties {
  const isHorizontal = position === 'left' || position === 'right';

  if (isHorizontal) {
    return {
      width: horizontalSizes[size],
      maxWidth: '100vw',
    };
  }

  return {
    height: verticalSizes[size],
    maxHeight: '100vh',
  };
}

// ============================================================================
// Close Button Sub-component
// ============================================================================

function CloseButton({ onClick }: { onClick: () => void }): React.ReactElement {
  return (
    <button
      onClick={onClick}
      style={styles.closeButton}
      aria-label="Close sheet"
      type="button"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

// ============================================================================
// useSheet Hook
// ============================================================================

interface UseSheetOptions {
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

interface UseSheetReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}

export function useSheet(options: UseSheetOptions = {}): UseSheetReturn {
  const { defaultOpen = false, onOpenChange } = options;
  const [isOpen, setIsOpenInternal] = useState(defaultOpen);

  const setOpen = useCallback((open: boolean) => {
    setIsOpenInternal(open);
    onOpenChange?.(open);
  }, [onOpenChange]);

  const open = useCallback(() => setOpen(true), [setOpen]);
  const close = useCallback(() => setOpen(false), [setOpen]);
  const toggle = useCallback(() => setOpen(!isOpen), [isOpen, setOpen]);

  return { isOpen, open, close, toggle, setOpen };
}

// ============================================================================
// useSheetContext Hook
// ============================================================================

export function useSheetContext(): SheetContextValue {
  const context = useContext(SheetContext);
  if (!context) {
    throw new Error('useSheetContext must be used within a Sheet component');
  }
  return context;
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
// Main Component (Dynamic - DSL-driven)
// ============================================================================

export function Sheet({ block, children }: LiquidComponentProps): React.ReactElement {
  const { signals, signalActions } = useLiquidContext();
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetId = generateId('sheet');

  const title = block.label || 'Sheet';
  // Access style properties with safe casting (position may be extended in DSL)
  const styleAny = block.style as Record<string, unknown> | undefined;
  const position: SheetPosition = (styleAny?.position as SheetPosition) || 'right';
  const size: SheetSize = (block.style?.size as SheetSize) || 'md';

  // Check if sheet should be open based on signal
  const receiveSignal = block.signals?.receive;
  const receiveSignalName = Array.isArray(receiveSignal) ? receiveSignal[0] : receiveSignal;
  const isOpen = receiveSignalName ? signals[receiveSignalName] === 'true' : false;

  // Focus trap
  useFocusTrap(isOpen, sheetRef);

  // Handle close action
  const handleClose = useCallback(() => {
    if (receiveSignalName) {
      signalActions.emit(receiveSignalName, 'false');
    }
  }, [receiveSignalName, signalActions]);

  // Handle overlay click
  const handleOverlayClick = useCallback(() => {
    handleClose();
  }, [handleClose]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const overlayStyle = mergeStyles(
    styles.overlay,
    !isOpen ? styles.overlayHidden : {}
  );

  const panelStyle = mergeStyles(
    baseStyles(),
    styles.panel,
    positionStyles[position],
    getSizeStyles(position, size),
    !isOpen ? hiddenTransforms[position] : {}
  );

  // Context value for nested components
  const contextValue: SheetContextValue = {
    isOpen,
    open: () => {
      if (receiveSignalName) {
        signalActions.emit(receiveSignalName, 'true');
      }
    },
    close: handleClose,
    toggle: () => {
      if (receiveSignalName) {
        signalActions.emit(receiveSignalName, isOpen ? 'false' : 'true');
      }
    },
  };

  // Handle empty children gracefully
  const hasChildren = React.Children.count(children) > 0;

  return (
    <SheetContext.Provider value={contextValue}>
      <div data-liquid-type="sheet" data-position={position} data-size={size}>
        <div
          style={overlayStyle}
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
        <div
          ref={sheetRef}
          id={sheetId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${sheetId}-title`}
          style={panelStyle}
          aria-hidden={!isOpen}
        >
          <div style={styles.header}>
            <h2 id={`${sheetId}-title`} style={styles.title}>{title}</h2>
            <CloseButton onClick={handleClose} />
          </div>
          <div style={styles.content}>
            {hasChildren ? children : (
              <div style={{ color: tokens.colors.mutedForeground }}>
                No content
              </div>
            )}
          </div>
        </div>
      </div>
    </SheetContext.Provider>
  );
}

// ============================================================================
// Static Sheet (Standalone usage)
// ============================================================================

export interface StaticSheetProps {
  /** Sheet title displayed in header */
  title?: string;
  /** Sheet content */
  children: React.ReactNode;
  /** Controlled open state */
  isOpen: boolean;
  /** Callback when open state changes */
  onOpenChange: (isOpen: boolean) => void;
  /** Position of the sheet */
  position?: SheetPosition;
  /** Size of the sheet */
  size?: SheetSize;
  /** Whether to show the close button */
  showCloseButton?: boolean;
  /** Whether clicking overlay closes the sheet */
  closeOnOverlayClick?: boolean;
  /** Whether pressing Escape closes the sheet */
  closeOnEscape?: boolean;
  /** Custom styles for the panel */
  style?: React.CSSProperties;
}

export function StaticSheet({
  title,
  children,
  isOpen,
  onOpenChange,
  position = 'right',
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  style: customStyle,
}: StaticSheetProps): React.ReactElement {
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetId = generateId('sheet');

  // Focus trap
  useFocusTrap(isOpen, sheetRef);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Handle overlay click
  const handleOverlayClick = useCallback(() => {
    if (closeOnOverlayClick) {
      handleClose();
    }
  }, [closeOnOverlayClick, handleClose]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, handleClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const overlayStyle = mergeStyles(
    styles.overlay,
    !isOpen ? styles.overlayHidden : {}
  );

  const panelStyle = mergeStyles(
    baseStyles(),
    styles.panel,
    positionStyles[position],
    getSizeStyles(position, size),
    !isOpen ? hiddenTransforms[position] : {},
    customStyle
  );

  // Context value for nested components
  const contextValue: SheetContextValue = {
    isOpen,
    open: () => onOpenChange(true),
    close: handleClose,
    toggle: () => onOpenChange(!isOpen),
  };

  // Handle empty children gracefully
  const hasChildren = React.Children.count(children) > 0;

  return (
    <SheetContext.Provider value={contextValue}>
      <div data-liquid-type="sheet" data-position={position} data-size={size}>
        <div
          style={overlayStyle}
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
        <div
          ref={sheetRef}
          id={sheetId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? `${sheetId}-title` : undefined}
          style={panelStyle}
          aria-hidden={!isOpen}
        >
          {(title || showCloseButton) && (
            <div style={styles.header}>
              {title && <h2 id={`${sheetId}-title`} style={styles.title}>{title}</h2>}
              {!title && <div />}
              {showCloseButton && <CloseButton onClick={handleClose} />}
            </div>
          )}
          <div style={styles.content}>
            {hasChildren ? children : (
              <div style={{ color: tokens.colors.mutedForeground }}>
                No content
              </div>
            )}
          </div>
        </div>
      </div>
    </SheetContext.Provider>
  );
}

export default Sheet;
