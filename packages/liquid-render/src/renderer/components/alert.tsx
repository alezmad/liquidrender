// Alert Component - Feedback message with variants
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, baseStyles, mergeStyles, getBlockColor } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

type AlertVariant = 'default' | 'destructive' | 'warning' | 'success';

interface AlertValue {
  title?: string | null;
  description?: string | null;
  variant?: AlertVariant;
  icon?: boolean;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  alert: (variant: AlertVariant, customColor?: string): React.CSSProperties => {
    const variantStyles: Record<AlertVariant, React.CSSProperties> = {
      default: {
        backgroundColor: tokens.colors.card,
        color: tokens.colors.cardForeground,
        borderColor: tokens.colors.border,
      },
      destructive: {
        backgroundColor: tokens.colors.card,
        color: tokens.colors.destructive,
        borderColor: tokens.colors.destructive,
      },
      warning: {
        backgroundColor: tokens.colors.card,
        color: tokens.colors.warning,
        borderColor: tokens.colors.warning,
      },
      success: {
        backgroundColor: tokens.colors.card,
        color: tokens.colors.success,
        borderColor: tokens.colors.success,
      },
    };

    const baseVariantStyle = variantStyles[variant] || variantStyles.default;

    // Apply custom color if provided
    if (customColor) {
      baseVariantStyle.color = customColor;
      baseVariantStyle.borderColor = customColor;
    }

    return mergeStyles(
      baseStyles(),
      {
        position: 'relative',
        width: '100%',
        borderRadius: tokens.radius.lg,
        border: '1px solid',
        padding: `${tokens.spacing.md} ${tokens.spacing.md}`,
        fontSize: tokens.fontSize.sm,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: tokens.spacing.sm,
        alignItems: 'start',
      },
      baseVariantStyle
    );
  },

  iconContainer: (): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1rem',
    height: '1rem',
    marginTop: '2px',
  }),

  content: (): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.xs,
  }),

  title: (): React.CSSProperties =>
    mergeStyles(baseStyles(), {
      fontWeight: tokens.fontWeight.medium,
      lineHeight: 1.4,
      letterSpacing: '-0.01em',
      color: 'inherit',
      margin: 0,
    }),

  description: (variant: AlertVariant): React.CSSProperties => {
    // Description uses muted foreground for default, or 90% opacity of variant color
    const color =
      variant === 'default'
        ? tokens.colors.mutedForeground
        : 'inherit';

    return mergeStyles(baseStyles(), {
      fontSize: tokens.fontSize.sm,
      lineHeight: 1.5,
      color,
      opacity: variant === 'default' ? 1 : 0.9,
      margin: 0,
    });
  },
};

// ============================================================================
// Sub-components: Icons
// ============================================================================

interface IconProps {
  variant: AlertVariant;
  style?: React.CSSProperties;
}

function AlertIcon({ variant, style }: IconProps): React.ReactElement {
  const iconStyle: React.CSSProperties = {
    width: '1rem',
    height: '1rem',
    ...style,
  };

  switch (variant) {
    case 'success':
      return (
        <svg
          style={iconStyle}
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
    case 'warning':
      return (
        <svg
          style={iconStyle}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case 'destructive':
      return (
        <svg
          style={iconStyle}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6" />
          <path d="m9 9 6 6" />
        </svg>
      );
    default:
      return (
        <svg
          style={iconStyle}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      );
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Normalize raw value to AlertValue
 */
function normalizeAlertValue(rawValue: unknown): AlertValue {
  if (rawValue === null || rawValue === undefined) {
    return {};
  }

  if (typeof rawValue === 'string') {
    // Simple string becomes description
    return { description: rawValue };
  }

  if (typeof rawValue === 'object' && rawValue !== null) {
    const obj = rawValue as Record<string, unknown>;
    return {
      title: obj.title as string | null | undefined,
      description: obj.description as string | null | undefined,
      variant: obj.variant as AlertVariant | undefined,
      icon: obj.icon as boolean | undefined,
    };
  }

  return { description: String(rawValue) };
}

/**
 * Check if alert has content to display
 */
function hasContent(alertValue: AlertValue): boolean {
  return Boolean(alertValue.title || alertValue.description);
}

// ============================================================================
// Main Component
// ============================================================================

export function Alert({ block, data }: LiquidComponentProps): React.ReactElement {
  // Resolve binding
  const rawValue = block.binding ? resolveBinding(block.binding, data) : null;

  // Normalize to AlertValue
  const alertValue = normalizeAlertValue(rawValue);

  // Get variant from block style or value
  // Note: variant may be passed via props for custom usage
  const variant: AlertVariant = alertValue.variant || (block.props?.variant as AlertVariant) || 'default';

  // Get custom color from block
  const customColor = getBlockColor(block);

  // Whether to show icon (default true)
  const showIcon = alertValue.icon !== false;

  // Handle empty state
  if (!hasContent(alertValue)) {
    return <></>;
  }

  return (
    <div
      data-liquid-type="alert"
      data-variant={variant}
      role="alert"
      style={styles.alert(variant, customColor)}
    >
      {showIcon && (
        <div style={styles.iconContainer()}>
          <AlertIcon variant={variant} />
        </div>
      )}
      <div style={styles.content()}>
        {alertValue.title && (
          <div style={styles.title()}>{alertValue.title}</div>
        )}
        {alertValue.description && (
          <div style={styles.description(variant)}>{alertValue.description}</div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

interface StaticAlertProps {
  title?: string;
  description?: string;
  variant?: AlertVariant;
  icon?: boolean;
  color?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export function StaticAlert({
  title,
  description,
  variant = 'default',
  icon = true,
  color,
  style: customStyle,
  children,
}: StaticAlertProps): React.ReactElement {
  // Handle empty state
  if (!title && !description && !children) {
    return <></>;
  }

  return (
    <div
      data-liquid-type="alert"
      data-variant={variant}
      role="alert"
      style={mergeStyles(styles.alert(variant, color), customStyle)}
    >
      {icon && (
        <div style={styles.iconContainer()}>
          <AlertIcon variant={variant} />
        </div>
      )}
      <div style={styles.content()}>
        {title && <div style={styles.title()}>{title}</div>}
        {description && <div style={styles.description(variant)}>{description}</div>}
        {children}
      </div>
    </div>
  );
}

export default Alert;
