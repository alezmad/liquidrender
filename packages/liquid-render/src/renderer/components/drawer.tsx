// Drawer Component - Slide-in panel
import React, { useCallback, useEffect } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, mergeStyles, baseStyles, generateId } from './utils';
import { useLiquidContext } from '../LiquidUI';

// ============================================================================
// Styles
// ============================================================================

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 40,
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

  panelRight: {
    top: 0,
    right: 0,
    height: '100%',
    width: '20rem',
    maxWidth: '100vw',
  } as React.CSSProperties,

  panelRightHidden: {
    transform: 'translateX(100%)',
  } as React.CSSProperties,

  panelLeft: {
    top: 0,
    left: 0,
    height: '100%',
    width: '20rem',
    maxWidth: '100vw',
  } as React.CSSProperties,

  panelLeftHidden: {
    transform: 'translateX(-100%)',
  } as React.CSSProperties,

  panelBottom: {
    bottom: 0,
    left: 0,
    right: 0,
    height: 'auto',
    maxHeight: '80vh',
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
  } as React.CSSProperties,

  panelBottomHidden: {
    transform: 'translateY(100%)',
  } as React.CSSProperties,

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
  } as React.CSSProperties,

  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2rem',
    height: '2rem',
    borderRadius: tokens.radius.sm,
    border: 'none',
    backgroundColor: 'transparent',
    color: tokens.colors.mutedForeground,
    cursor: 'pointer',
    fontSize: tokens.fontSize.lg,
    transition: `background-color ${tokens.transition.fast}`,
  } as React.CSSProperties,

  closeButtonHover: {
    backgroundColor: tokens.colors.muted,
  } as React.CSSProperties,

  content: {
    flex: 1,
    padding: tokens.spacing.md,
    overflow: 'auto',
  } as React.CSSProperties,
};

// ============================================================================
// Main Component
// ============================================================================

export function Drawer({ block, children }: LiquidComponentProps): React.ReactElement {
  const { signals, signalActions } = useLiquidContext();
  const drawerId = generateId('drawer');

  const title = block.label || 'Drawer';
  // Position is not in the Style interface, so we default to 'right'
  const position: 'left' | 'right' | 'bottom' = 'right';

  // Check if drawer should be open based on signal
  const receiveSignal = block.signals?.receive;
  const receiveSignalName = Array.isArray(receiveSignal) ? receiveSignal[0] : receiveSignal;
  const isOpen = receiveSignalName ? signals[receiveSignalName] === 'true' : false;

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

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const overlayStyle = mergeStyles(
    styles.overlay,
    !isOpen ? styles.overlayHidden : {}
  );

  const positionStyles = {
    left: styles.panelLeft,
    right: styles.panelRight,
    bottom: styles.panelBottom,
  };

  const hiddenStyles = {
    left: styles.panelLeftHidden,
    right: styles.panelRightHidden,
    bottom: styles.panelBottomHidden,
  };

  const panelStyle = mergeStyles(
    baseStyles(),
    styles.panel,
    positionStyles[position],
    !isOpen ? hiddenStyles[position] : {}
  );

  return (
    <div data-liquid-type="drawer" data-position={position}>
      <div
        style={overlayStyle}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      <div
        id={drawerId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${drawerId}-title`}
        style={panelStyle}
        aria-hidden={!isOpen}
      >
        <div style={styles.header}>
          <span id={`${drawerId}-title`} style={styles.title}>{title}</span>
          <button
            onClick={handleClose}
            style={styles.closeButton}
            aria-label="Close drawer"
            type="button"
          >
            ×
          </button>
        </div>
        <div style={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Static Drawer
// ============================================================================

export interface StaticDrawerProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right' | 'bottom';
  style?: React.CSSProperties;
}

export function StaticDrawer({
  title,
  children,
  isOpen,
  onClose,
  position = 'right',
  style: customStyle,
}: StaticDrawerProps): React.ReactElement {
  const drawerId = generateId('drawer');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOverlayClick = useCallback(() => {
    onClose();
  }, [onClose]);

  const overlayStyle = mergeStyles(
    styles.overlay,
    !isOpen ? styles.overlayHidden : {}
  );

  const positionStyles = {
    left: styles.panelLeft,
    right: styles.panelRight,
    bottom: styles.panelBottom,
  };

  const hiddenStyles = {
    left: styles.panelLeftHidden,
    right: styles.panelRightHidden,
    bottom: styles.panelBottomHidden,
  };

  const panelStyle = mergeStyles(
    baseStyles(),
    styles.panel,
    positionStyles[position],
    !isOpen ? hiddenStyles[position] : {},
    customStyle
  );

  return (
    <div data-liquid-type="drawer" data-position={position}>
      <div
        style={overlayStyle}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      <div
        id={drawerId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${drawerId}-title`}
        style={panelStyle}
        aria-hidden={!isOpen}
      >
        <div style={styles.header}>
          <span id={`${drawerId}-title`} style={styles.title}>{title}</span>
          <button
            onClick={onClose}
            style={styles.closeButton}
            aria-label="Close drawer"
            type="button"
          >
            ×
          </button>
        </div>
        <div style={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Drawer;
