// Toast Component - Notification manager with queue, stacking, and auto-dismiss
// Inspired by Sonner toast library
import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo,
} from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, baseStyles, mergeStyles, formatDisplayValue, generateId } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

interface ToastAction {
  label: string;
  onClick?: () => void;
}

interface ToastData {
  id: string;
  title?: string;
  description?: string;
  variant: ToastVariant;
  duration: number; // 0 = no auto-dismiss
  dismissible: boolean;
  action?: ToastAction;
  createdAt: number;
}

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  dismissible?: boolean;
  action?: ToastAction;
}

interface ToastContextValue {
  toasts: ToastData[];
  toast: ToastFunction;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

interface ToastFunction {
  (options: ToastOptions): string;
  success: (message: string, options?: Omit<ToastOptions, 'variant' | 'title'>) => string;
  error: (message: string, options?: Omit<ToastOptions, 'variant' | 'title'>) => string;
  warning: (message: string, options?: Omit<ToastOptions, 'variant' | 'title'>) => string;
  info: (message: string, options?: Omit<ToastOptions, 'variant' | 'title'>) => string;
}

interface ToastProviderProps {
  children: React.ReactNode;
  position?: ToastPosition;
  max?: number;
  defaultDuration?: number;
  gap?: number;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  viewport: (position: ToastPosition, gap: number): React.CSSProperties => {
    const positionStyles: Record<ToastPosition, React.CSSProperties> = {
      'top-left': { top: tokens.spacing.lg, left: tokens.spacing.lg },
      'top-center': { top: tokens.spacing.lg, left: '50%', transform: 'translateX(-50%)' },
      'top-right': { top: tokens.spacing.lg, right: tokens.spacing.lg },
      'bottom-left': { bottom: tokens.spacing.lg, left: tokens.spacing.lg },
      'bottom-center': { bottom: tokens.spacing.lg, left: '50%', transform: 'translateX(-50%)' },
      'bottom-right': { bottom: tokens.spacing.lg, right: tokens.spacing.lg },
    };

    return mergeStyles(baseStyles(), {
      position: 'fixed',
      zIndex: 9999,
      display: 'flex',
      flexDirection: position.startsWith('top') ? 'column' : 'column-reverse',
      gap: `${gap}px`,
      pointerEvents: 'none',
      maxHeight: '100vh',
      padding: tokens.spacing.md,
      ...positionStyles[position],
    });
  },

  toast: (
    variant: ToastVariant,
    isVisible: boolean,
    isExiting: boolean,
    position: ToastPosition
  ): React.CSSProperties => {
    const variantStyles: Record<ToastVariant, React.CSSProperties> = {
      default: {
        backgroundColor: tokens.colors.card,
        borderColor: tokens.colors.border,
        color: tokens.colors.foreground,
      },
      success: {
        backgroundColor: tokens.colors.card,
        borderColor: tokens.colors.success,
        color: tokens.colors.foreground,
        borderLeftWidth: '4px',
        borderLeftStyle: 'solid',
        borderLeftColor: tokens.colors.success,
      },
      error: {
        backgroundColor: tokens.colors.card,
        borderColor: tokens.colors.error,
        color: tokens.colors.foreground,
        borderLeftWidth: '4px',
        borderLeftStyle: 'solid',
        borderLeftColor: tokens.colors.error,
      },
      warning: {
        backgroundColor: tokens.colors.card,
        borderColor: tokens.colors.warning,
        color: tokens.colors.foreground,
        borderLeftWidth: '4px',
        borderLeftStyle: 'solid',
        borderLeftColor: tokens.colors.warning,
      },
      info: {
        backgroundColor: tokens.colors.card,
        borderColor: tokens.colors.info,
        color: tokens.colors.foreground,
        borderLeftWidth: '4px',
        borderLeftStyle: 'solid',
        borderLeftColor: tokens.colors.info,
      },
    };

    // Determine animation direction based on position
    const isTop = position.startsWith('top');
    const enterTransform = isTop ? 'translateY(-100%)' : 'translateY(100%)';
    const exitTransform = isTop ? 'translateY(-100%)' : 'translateY(100%)';

    let transform = 'translateY(0)';
    let opacity = 1;

    if (!isVisible) {
      transform = enterTransform;
      opacity = 0;
    } else if (isExiting) {
      transform = exitTransform;
      opacity = 0;
    }

    return mergeStyles(baseStyles(), {
      display: 'flex',
      alignItems: 'flex-start',
      gap: tokens.spacing.sm,
      padding: tokens.spacing.md,
      borderRadius: tokens.radius.lg,
      border: `1px solid ${tokens.colors.border}`,
      boxShadow: tokens.shadow.lg,
      minWidth: '300px',
      maxWidth: '420px',
      opacity,
      transform,
      transition: `all ${tokens.transition.normal}`,
      pointerEvents: 'auto',
      ...variantStyles[variant],
    });
  },

  icon: (variant: ToastVariant): React.CSSProperties => {
    const colorMap: Record<ToastVariant, string> = {
      default: tokens.colors.mutedForeground,
      success: tokens.colors.success,
      error: tokens.colors.error,
      warning: tokens.colors.warning,
      info: tokens.colors.info,
    };

    return {
      flexShrink: 0,
      width: '16px',
      height: '16px',
      marginTop: '2px',
      color: colorMap[variant],
    };
  },

  content: (): React.CSSProperties => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.xs,
  }),

  title: (): React.CSSProperties =>
    mergeStyles(baseStyles(), {
      fontSize: tokens.fontSize.sm,
      fontWeight: tokens.fontWeight.semibold,
      lineHeight: '1.4',
      color: tokens.colors.foreground,
    }),

  description: (): React.CSSProperties =>
    mergeStyles(baseStyles(), {
      fontSize: tokens.fontSize.sm,
      lineHeight: '1.4',
      color: tokens.colors.mutedForeground,
    }),

  actions: (): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  }),

  actionButton: (): React.CSSProperties =>
    mergeStyles(baseStyles(), {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
      fontSize: tokens.fontSize.xs,
      fontWeight: tokens.fontWeight.medium,
      backgroundColor: tokens.colors.primary,
      color: tokens.colors.primaryForeground,
      border: 'none',
      borderRadius: tokens.radius.md,
      cursor: 'pointer',
      transition: `opacity ${tokens.transition.fast}`,
    }),

  dismissButton: (): React.CSSProperties =>
    mergeStyles(baseStyles(), {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '20px',
      height: '20px',
      padding: 0,
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: tokens.radius.sm,
      cursor: 'pointer',
      color: tokens.colors.mutedForeground,
      flexShrink: 0,
      transition: `color ${tokens.transition.fast}`,
    }),
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get variant from block style or value
 */
function getVariant(
  block: { style?: { color?: string } },
  value?: { variant?: ToastVariant }
): ToastVariant {
  if (value?.variant) {
    return value.variant;
  }

  const blockColor = block.style?.color;
  if (blockColor) {
    switch (blockColor) {
      case 'green':
      case 'success':
        return 'success';
      case 'red':
      case 'error':
      case 'danger':
      case 'destructive':
        return 'error';
      case 'yellow':
      case 'amber':
      case 'warning':
        return 'warning';
      case 'blue':
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  }

  return 'default';
}

/**
 * Extract toast configuration from raw value
 */
function parseToastValue(rawValue: unknown): ToastOptions {
  if (rawValue === null || rawValue === undefined) {
    return {};
  }

  if (typeof rawValue === 'object' && rawValue !== null) {
    return rawValue as ToastOptions;
  }

  if (typeof rawValue === 'string') {
    return { title: rawValue };
  }

  return { title: formatDisplayValue(rawValue) };
}

// ============================================================================
// Icon Sub-components
// ============================================================================

function SuccessIcon({ style }: { style: React.CSSProperties }): React.ReactElement {
  return (
    <svg
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ErrorIcon({ style }: { style: React.CSSProperties }): React.ReactElement {
  return (
    <svg
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function WarningIcon({ style }: { style: React.CSSProperties }): React.ReactElement {
  return (
    <svg
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function InfoIcon({ style }: { style: React.CSSProperties }): React.ReactElement {
  return (
    <svg
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function CloseIcon({ style }: { style: React.CSSProperties }): React.ReactElement {
  return (
    <svg
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * Get icon for variant
 */
function getVariantIcon(
  variant: ToastVariant,
  style: React.CSSProperties
): React.ReactElement | null {
  switch (variant) {
    case 'success':
      return <SuccessIcon style={style} />;
    case 'error':
      return <ErrorIcon style={style} />;
    case 'warning':
      return <WarningIcon style={style} />;
    case 'info':
      return <InfoIcon style={style} />;
    default:
      return null;
  }
}

// ============================================================================
// Context
// ============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Hook to access toast functionality
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ============================================================================
// Toast Item Component
// ============================================================================

interface ToastItemProps {
  toast: ToastData;
  position: ToastPosition;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, position, onDismiss }: ToastItemProps): React.ReactElement {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Enter animation
  useEffect(() => {
    // Small delay for enter animation
    const enterTimer = setTimeout(() => {
      setIsVisible(true);
    }, 10);

    return () => clearTimeout(enterTimer);
  }, []);

  // Auto-dismiss timer
  useEffect(() => {
    if (toast.duration > 0) {
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, toast.duration);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }
  }, [toast.duration, toast.id]);

  const handleDismiss = useCallback(() => {
    // Start exit animation
    setIsExiting(true);

    // Remove after animation completes
    setTimeout(() => {
      onDismiss(toast.id);
    }, 200);
  }, [onDismiss, toast.id]);

  const handleActionClick = useCallback(() => {
    if (toast.action?.onClick) {
      toast.action.onClick();
    }
    handleDismiss();
  }, [toast.action, handleDismiss]);

  // Pause timer on hover
  const handleMouseEnter = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Resume timer on mouse leave
  const handleMouseLeave = useCallback(() => {
    if (toast.duration > 0 && !isExiting) {
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, toast.duration / 2); // Give half the time remaining
    }
  }, [toast.duration, isExiting, handleDismiss]);

  const icon = getVariantIcon(toast.variant, styles.icon(toast.variant));

  return (
    <div
      data-liquid-type="toast"
      data-variant={toast.variant}
      data-toast-id={toast.id}
      role="alert"
      aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      style={styles.toast(toast.variant, isVisible, isExiting, position)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {icon}

      <div style={styles.content()}>
        {toast.title && <div style={styles.title()}>{toast.title}</div>}
        {toast.description && <div style={styles.description()}>{toast.description}</div>}

        {toast.action && (
          <div style={styles.actions()}>
            <button type="button" style={styles.actionButton()} onClick={handleActionClick}>
              {toast.action.label}
            </button>
          </div>
        )}
      </div>

      {toast.dismissible && (
        <button
          type="button"
          style={styles.dismissButton()}
          onClick={handleDismiss}
          aria-label="Dismiss notification"
        >
          <CloseIcon style={{ width: '14px', height: '14px' }} />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Toast Viewport Component
// ============================================================================

interface ToastViewportProps {
  toasts: ToastData[];
  position: ToastPosition;
  max: number;
  gap: number;
  onDismiss: (id: string) => void;
}

function ToastViewport({
  toasts,
  position,
  max,
  gap,
  onDismiss,
}: ToastViewportProps): React.ReactElement | null {
  // Limit visible toasts
  const visibleToasts = toasts.slice(0, max);

  if (visibleToasts.length === 0) {
    return null;
  }

  return (
    <div style={styles.viewport(position, gap)} aria-label="Notifications" role="region">
      {visibleToasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} position={position} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ============================================================================
// Toast Provider Component
// ============================================================================

export function ToastProvider({
  children,
  position = 'top-right',
  max = 5,
  defaultDuration = 5000,
  gap = 8,
}: ToastProviderProps): React.ReactElement {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback(
    (options: ToastOptions): string => {
      const id = generateId('toast');
      const newToast: ToastData = {
        id,
        title: options.title,
        description: options.description,
        variant: options.variant || 'default',
        duration: options.duration ?? defaultDuration,
        dismissible: options.dismissible ?? true,
        action: options.action,
        createdAt: Date.now(),
      };

      setToasts((prev) => {
        // Add new toast to the beginning (most recent first)
        const updated = [newToast, ...prev];
        return updated;
      });

      return id;
    },
    [defaultDuration]
  );

  // Create the toast function with convenience methods
  const toastFunction = useMemo(() => {
    const fn = ((options: ToastOptions) => addToast(options)) as ToastFunction;

    fn.success = (message: string, options?: Omit<ToastOptions, 'variant' | 'title'>) =>
      addToast({ ...options, title: message, variant: 'success' });

    fn.error = (message: string, options?: Omit<ToastOptions, 'variant' | 'title'>) =>
      addToast({ ...options, title: message, variant: 'error' });

    fn.warning = (message: string, options?: Omit<ToastOptions, 'variant' | 'title'>) =>
      addToast({ ...options, title: message, variant: 'warning' });

    fn.info = (message: string, options?: Omit<ToastOptions, 'variant' | 'title'>) =>
      addToast({ ...options, title: message, variant: 'info' });

    return fn;
  }, [addToast]);

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      toasts,
      toast: toastFunction,
      dismiss,
      dismissAll,
    }),
    [toasts, toastFunction, dismiss, dismissAll]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastViewport
        toasts={toasts}
        position={position}
        max={max}
        gap={gap}
        onDismiss={dismiss}
      />
    </ToastContext.Provider>
  );
}

// ============================================================================
// Main Component (for LiquidCode block rendering)
// ============================================================================

export function Toast({ block, data }: LiquidComponentProps): React.ReactElement {
  // Resolve binding
  const rawValue = block.binding ? resolveBinding(block.binding, data) : null;

  // Parse toast configuration
  const toastConfig = parseToastValue(rawValue);

  // Get variant
  const variant = getVariant(block, toastConfig);

  // Extract properties with defaults
  const title = toastConfig.title ?? block.label ?? '';
  const description = toastConfig.description ?? '';
  const duration = toastConfig.duration ?? 5000;
  const dismissible = toastConfig.dismissible ?? true;
  const action = toastConfig.action;

  // Visibility state for standalone usage
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  // Enter animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss timer
  useEffect(() => {
    if (duration > 0 && isVisible && !isExiting) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, isVisible, isExiting]);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => setIsVisible(false), 200);
  }, []);

  const handleActionClick = useCallback(() => {
    if (action?.onClick) {
      action.onClick();
    }
    handleDismiss();
  }, [action, handleDismiss]);

  // Empty state
  if (!title && !description) {
    return <></>;
  }

  // Hidden after exit animation
  if (!isVisible && isExiting) {
    return <></>;
  }

  const icon = getVariantIcon(variant, styles.icon(variant));

  return (
    <div
      data-liquid-type="toast"
      data-variant={variant}
      role="alert"
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      style={styles.toast(variant, isVisible, isExiting, 'top-right')}
    >
      {icon}

      <div style={styles.content()}>
        {title && <div style={styles.title()}>{title}</div>}
        {description && <div style={styles.description()}>{description}</div>}

        {action && (
          <div style={styles.actions()}>
            <button type="button" style={styles.actionButton()} onClick={handleActionClick}>
              {action.label}
            </button>
          </div>
        )}
      </div>

      {dismissible && (
        <button
          type="button"
          style={styles.dismissButton()}
          onClick={handleDismiss}
          aria-label="Dismiss notification"
        >
          <CloseIcon style={{ width: '14px', height: '14px' }} />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

interface StaticToastProps {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  dismissible?: boolean;
  action?: ToastAction;
  onDismiss?: () => void;
  position?: ToastPosition;
  className?: string;
  style?: React.CSSProperties;
}

export function StaticToast({
  title,
  description,
  variant = 'default',
  duration = 5000,
  dismissible = true,
  action,
  onDismiss,
  position = 'top-right',
  style: customStyle,
}: StaticToastProps): React.ReactElement {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Enter animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss timer
  useEffect(() => {
    if (duration > 0 && isVisible && !isExiting) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, isVisible, isExiting]);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 200);
  }, [onDismiss]);

  const handleActionClick = useCallback(() => {
    if (action?.onClick) {
      action.onClick();
    }
    handleDismiss();
  }, [action, handleDismiss]);

  // Empty state
  if (!title && !description) {
    return <></>;
  }

  // Hidden after exit animation
  if (!isVisible && isExiting) {
    return <></>;
  }

  const icon = getVariantIcon(variant, styles.icon(variant));

  const containerStyle = mergeStyles(
    styles.toast(variant, isVisible, isExiting, position),
    customStyle
  );

  return (
    <div
      data-liquid-type="toast"
      data-variant={variant}
      role="alert"
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      style={containerStyle}
    >
      {icon}

      <div style={styles.content()}>
        {title && <div style={styles.title()}>{title}</div>}
        {description && <div style={styles.description()}>{description}</div>}

        {action && (
          <div style={styles.actions()}>
            <button type="button" style={styles.actionButton()} onClick={handleActionClick}>
              {action.label}
            </button>
          </div>
        )}
      </div>

      {dismissible && (
        <button
          type="button"
          style={styles.dismissButton()}
          onClick={handleDismiss}
          aria-label="Dismiss notification"
        >
          <CloseIcon style={{ width: '14px', height: '14px' }} />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export type {
  ToastVariant,
  ToastPosition,
  ToastAction,
  ToastData,
  ToastOptions,
  ToastContextValue,
  ToastFunction,
  ToastProviderProps,
  StaticToastProps,
};

export default Toast;
