// Empty Component - Empty state placeholder with icon, text, and optional action
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, buttonStyles } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

type EmptyPreset = 'no-data' | 'no-results' | 'error' | 'inbox' | 'search' | 'custom';

interface EmptyValue {
  preset?: EmptyPreset;
  icon?: string;
  title?: string | null;
  description?: string | null;
  action?: {
    label: string;
    onClick?: () => void;
  } | null;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: (withBorder: boolean): React.CSSProperties =>
    mergeStyles(
      withBorder ? cardStyles() : {},
      {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: tokens.spacing['2xl'],
        textAlign: 'center',
        minHeight: '200px',
      }
    ),

  iconContainer: (): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '4rem',
    height: '4rem',
    marginBottom: tokens.spacing.lg,
    color: tokens.colors.mutedForeground,
    opacity: 0.6,
  }),

  title: (): React.CSSProperties => ({
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.foreground,
    margin: 0,
    marginBottom: tokens.spacing.sm,
  }),

  description: (): React.CSSProperties => ({
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.mutedForeground,
    margin: 0,
    marginBottom: tokens.spacing.lg,
    maxWidth: '24rem',
    lineHeight: 1.5,
  }),

  action: (): React.CSSProperties =>
    mergeStyles(buttonStyles('default', 'md'), {
      marginTop: tokens.spacing.sm,
    }),
};

// ============================================================================
// Sub-components: Icons
// ============================================================================

interface IconProps {
  preset: EmptyPreset;
  style?: React.CSSProperties;
}

function EmptyIcon({ preset, style }: IconProps): React.ReactElement {
  const iconStyle: React.CSSProperties = {
    width: '3rem',
    height: '3rem',
    ...style,
  };

  switch (preset) {
    case 'no-data':
      // Database/empty folder icon
      return (
        <svg
          style={iconStyle}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
        </svg>
      );

    case 'no-results':
      // Empty search results
      return (
        <svg
          style={iconStyle}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 7v4a1 1 0 0 0 1 1h3" />
          <path d="M7 7v10" />
          <path d="M10 8v8a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2a1 1 0 0 1 1-1h2a1 1 0 0 0 1-1V7" />
          <path d="M10 7h8" />
          <path d="M17 7v10" />
          <line x1="1" y1="1" x2="23" y2="23" strokeOpacity="0.5" />
        </svg>
      );

    case 'error':
      // Error/alert icon
      return (
        <svg
          style={iconStyle}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );

    case 'inbox':
      // Empty inbox
      return (
        <svg
          style={iconStyle}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
      );

    case 'search':
      // Search icon
      return (
        <svg
          style={iconStyle}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );

    default:
      // Generic empty box
      return (
        <svg
          style={iconStyle}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.29 7 12 12 20.71 7" />
          <line x1="12" y1="22" x2="12" y2="12" />
        </svg>
      );
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get default content for a preset
 */
function getPresetDefaults(preset: EmptyPreset): { title: string; description: string } {
  const presets: Record<EmptyPreset, { title: string; description: string }> = {
    'no-data': {
      title: 'No data available',
      description: 'There is no data to display at this time.',
    },
    'no-results': {
      title: 'No results found',
      description: 'Try adjusting your search or filter to find what you are looking for.',
    },
    error: {
      title: 'Something went wrong',
      description: 'An error occurred while loading the data. Please try again.',
    },
    inbox: {
      title: 'Your inbox is empty',
      description: 'You have no messages at this time.',
    },
    search: {
      title: 'No matches found',
      description: 'We could not find anything matching your search.',
    },
    custom: {
      title: '',
      description: '',
    },
  };

  return presets[preset] || presets.custom;
}

/**
 * Normalize raw value to EmptyValue
 */
function normalizeEmptyValue(rawValue: unknown): EmptyValue {
  if (rawValue === null || rawValue === undefined) {
    return { preset: 'no-data' };
  }

  if (typeof rawValue === 'string') {
    // Simple string becomes title
    return { title: rawValue, preset: 'custom' };
  }

  if (typeof rawValue === 'object' && rawValue !== null) {
    const obj = rawValue as Record<string, unknown>;
    return {
      preset: (obj.preset as EmptyPreset) || 'custom',
      icon: obj.icon as string | undefined,
      title: obj.title as string | null | undefined,
      description: obj.description as string | null | undefined,
      action: obj.action as EmptyValue['action'],
    };
  }

  return { title: String(rawValue), preset: 'custom' };
}

// ============================================================================
// Main Component
// ============================================================================

export function Empty({ block, data }: LiquidComponentProps): React.ReactElement {
  // Resolve binding
  const rawValue = block.binding ? resolveBinding(block.binding, data) : null;

  // Normalize to EmptyValue
  const emptyValue = normalizeEmptyValue(rawValue);

  // Get preset or default to 'no-data'
  const preset = emptyValue.preset || (block.props?.preset as EmptyPreset) || 'no-data';
  const presetDefaults = getPresetDefaults(preset);

  // Get content with fallbacks to preset defaults
  const title = emptyValue.title ?? presetDefaults.title;
  const description = emptyValue.description ?? presetDefaults.description;
  const action = emptyValue.action;

  // Whether to show border (from block props)
  const showBorder = block.props?.border !== false;

  // Whether to show icon (default true)
  const showIcon = block.props?.icon !== false;

  return (
    <div data-liquid-type="empty" data-preset={preset} style={styles.wrapper(showBorder)}>
      {showIcon && (
        <div style={styles.iconContainer()}>
          <EmptyIcon preset={preset} />
        </div>
      )}

      {title && <h3 style={styles.title()}>{title}</h3>}

      {description && <p style={styles.description()}>{description}</p>}

      {action && (
        <button
          type="button"
          style={styles.action()}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

interface StaticEmptyProps {
  preset?: EmptyPreset;
  icon?: boolean;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
  };
  border?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export function StaticEmpty({
  preset = 'no-data',
  icon = true,
  title,
  description,
  action,
  border = true,
  style: customStyle,
  children,
}: StaticEmptyProps): React.ReactElement {
  const presetDefaults = getPresetDefaults(preset);

  // Get content with fallbacks to preset defaults
  const displayTitle = title ?? presetDefaults.title;
  const displayDescription = description ?? presetDefaults.description;

  return (
    <div
      data-liquid-type="empty"
      data-preset={preset}
      style={mergeStyles(styles.wrapper(border), customStyle)}
    >
      {icon && (
        <div style={styles.iconContainer()}>
          <EmptyIcon preset={preset} />
        </div>
      )}

      {displayTitle && <h3 style={styles.title()}>{displayTitle}</h3>}

      {displayDescription && <p style={styles.description()}>{displayDescription}</p>}

      {children}

      {action && (
        <button
          type="button"
          style={styles.action()}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default Empty;
