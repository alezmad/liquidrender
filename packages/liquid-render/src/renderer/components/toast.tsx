// Toast Component - Notification messages with auto-dismiss and variants
import React, { useEffect, useState, useCallback } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, baseStyles, mergeStyles, formatDisplayValue } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

interface ToastValue {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // in milliseconds, 0 = no auto-dismiss
  dismissible?: boolean;
  action?: {
    label: string;
    onClick?: () => void;
  };
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: (variant: ToastVariant, isVisible: boolean): React.CSSProperties => {
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

    return mergeStyles(
      baseStyles(),
      {
        display: 'flex',
        alignItems: 'flex-start',
        gap: tokens.spacing.sm,
        padding: tokens.spacing.md,
        borderRadius: tokens.radius.lg,
        border: `1px solid ${tokens.colors.border}`,
        boxShadow: tokens.shadow.lg,
        minWidth: '300px',
        maxWidth: '420px',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(-8px)',
        transition: `all ${tokens.transition.normal}`,
        pointerEvents: isVisible ? 'auto' : 'none',
      },
      variantStyles[variant]
    );
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
function getVariant(block: { style?: { color?: string } }, value?: ToastValue): ToastVariant {
  // Check value variant first
  if (value?.variant) {
    return value.variant;
  }

  // Check block color style
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
function parseToastValue(rawValue: unknown): ToastValue {
  if (rawValue === null || rawValue === undefined) {
    return {};
  }

  if (typeof rawValue === 'object' && rawValue !== null) {
    return rawValue as ToastValue;
  }

  // Simple string becomes the title
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
function getVariantIcon(variant: ToastVariant, style: React.CSSProperties): React.ReactElement | null {
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
// Main Component
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
  const duration = toastConfig.duration ?? 5000; // 5 seconds default
  const dismissible = toastConfig.dismissible ?? true;
  const action = toastConfig.action;

  // Visibility state
  const [isVisible, setIsVisible] = useState(true);

  // Auto-dismiss timer
  useEffect(() => {
    if (duration > 0 && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, isVisible]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Handle action click
  const handleActionClick = useCallback(() => {
    if (action?.onClick) {
      action.onClick();
    }
    handleDismiss();
  }, [action, handleDismiss]);

  // Empty state - nothing to render
  if (!title && !description) {
    return <></>;
  }

  // Icon for variant
  const icon = getVariantIcon(variant, styles.icon(variant));

  return (
    <div
      data-liquid-type="toast"
      data-variant={variant}
      role="alert"
      aria-live="polite"
      style={styles.container(variant, isVisible)}
    >
      {/* Icon */}
      {icon}

      {/* Content */}
      <div style={styles.content()}>
        {title && <div style={styles.title()}>{title}</div>}
        {description && <div style={styles.description()}>{description}</div>}

        {/* Action button */}
        {action && (
          <div style={styles.actions()}>
            <button
              type="button"
              style={styles.actionButton()}
              onClick={handleActionClick}
            >
              {action.label}
            </button>
          </div>
        )}
      </div>

      {/* Dismiss button */}
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
  action?: {
    label: string;
    onClick?: () => void;
  };
  onDismiss?: () => void;
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
  style: customStyle,
}: StaticToastProps): React.ReactElement {
  // Visibility state
  const [isVisible, setIsVisible] = useState(true);

  // Auto-dismiss timer
  useEffect(() => {
    if (duration > 0 && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, isVisible, onDismiss]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  // Handle action click
  const handleActionClick = useCallback(() => {
    if (action?.onClick) {
      action.onClick();
    }
    handleDismiss();
  }, [action, handleDismiss]);

  // Empty state - nothing to render
  if (!title && !description) {
    return <></>;
  }

  // Icon for variant
  const icon = getVariantIcon(variant, styles.icon(variant));

  const containerStyle = mergeStyles(
    styles.container(variant, isVisible),
    customStyle
  );

  return (
    <div
      data-liquid-type="toast"
      data-variant={variant}
      role="alert"
      aria-live="polite"
      style={containerStyle}
    >
      {/* Icon */}
      {icon}

      {/* Content */}
      <div style={styles.content()}>
        {title && <div style={styles.title()}>{title}</div>}
        {description && <div style={styles.description()}>{description}</div>}

        {/* Action button */}
        {action && (
          <div style={styles.actions()}>
            <button
              type="button"
              style={styles.actionButton()}
              onClick={handleActionClick}
            >
              {action.label}
            </button>
          </div>
        )}
      </div>

      {/* Dismiss button */}
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

export default Toast;
