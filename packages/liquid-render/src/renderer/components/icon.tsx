// Icon Component - Renders inline SVG icons with color variants
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, baseStyles, getBlockColor } from './utils';

// ============================================================================
// Types
// ============================================================================

interface IconSize {
  width: number;
  height: number;
}

type IconName =
  | 'check'
  | 'x'
  | 'plus'
  | 'minus'
  | 'edit'
  | 'trash'
  | 'search'
  | 'settings'
  | 'info'
  | 'warning'
  | 'chevron-down'
  | 'chevron-right';

type IconSizeVariant = 'sm' | 'md' | 'lg';

// ============================================================================
// Icon Set (SVG Paths)
// ============================================================================

const icons: Record<IconName, string> = {
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  edit: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  trash: 'M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  settings:
    'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
  info: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 16v-4M12 8h.01',
  warning: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-right': 'M9 18l6-6-6-6',
};

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: baseStyles({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }),
  svg: {
    display: 'block',
  },
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get icon dimensions by size variant
 */
function getIconSize(size: IconSizeVariant): IconSize {
  const sizes: Record<IconSizeVariant, IconSize> = {
    sm: { width: 16, height: 16 },
    md: { width: 20, height: 20 },
    lg: { width: 24, height: 24 },
  };
  return sizes[size];
}

/**
 * Check if icon name is valid
 */
function isValidIconName(name: string): name is IconName {
  return name in icons;
}

// ============================================================================
// Main Component
// ============================================================================

export function Icon({ block, data }: LiquidComponentProps): React.ReactElement {
  // Extract icon name from binding value (string) or label
  const bindingValue = typeof block.binding?.value === 'string' ? block.binding.value : null;
  const iconName = (bindingValue || block.label || 'info').toLowerCase();
  const color = getBlockColor(block) || tokens.colors.foreground;
  const size = (block.style?.size as IconSizeVariant) || 'md';

  // Validate icon name
  if (!isValidIconName(iconName)) {
    console.warn(`[Icon] Unknown icon: "${iconName}", falling back to "info"`);
  }

  const validIconName: IconName = isValidIconName(iconName) ? iconName : 'info';
  const path = icons[validIconName];
  const dimensions = getIconSize(size);

  return (
    <span
      data-liquid-type="icon"
      data-icon={validIconName}
      data-color={block.style?.color}
      style={styles.wrapper}
    >
      <svg
        viewBox="0 0 24 24"
        width={dimensions.width}
        height={dimensions.height}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={styles.svg}
        aria-hidden="true"
      >
        <path d={path} />
      </svg>
    </span>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

export interface StaticIconProps {
  /**
   * Icon name
   */
  name: IconName;

  /**
   * Icon size variant
   * @default 'md'
   */
  size?: IconSizeVariant;

  /**
   * Icon color (CSS color value)
   */
  color?: string;

  /**
   * Additional CSS class name
   */
  className?: string;

  /**
   * Accessible label for screen readers
   */
  'aria-label'?: string;
}

export function StaticIcon({
  name,
  size = 'md',
  color = tokens.colors.foreground,
  className,
  'aria-label': ariaLabel,
}: StaticIconProps): React.ReactElement {
  const path = icons[name];
  const dimensions = getIconSize(size);

  return (
    <span
      data-liquid-type="icon"
      data-icon={name}
      style={styles.wrapper}
      className={className}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <svg
        viewBox="0 0 24 24"
        width={dimensions.width}
        height={dimensions.height}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={styles.svg}
        aria-hidden={!ariaLabel}
      >
        <path d={path} />
      </svg>
    </span>
  );
}

export default Icon;
