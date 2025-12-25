// Avatar Component - User avatar with image/initials fallback
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, mergeStyles, baseStyles } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

export interface AvatarProps {
  src?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg';
  alt?: string;
}

// ============================================================================
// Styles
// ============================================================================

const sizeMap = {
  sm: { width: '2rem', height: '2rem', fontSize: tokens.fontSize.xs },
  md: { width: '2.5rem', height: '2.5rem', fontSize: tokens.fontSize.sm },
  lg: { width: '3.5rem', height: '3.5rem', fontSize: tokens.fontSize.lg },
};

const styles = {
  avatar: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.full,
    overflow: 'hidden',
    backgroundColor: tokens.colors.muted,
    color: tokens.colors.mutedForeground,
    fontWeight: tokens.fontWeight.medium,
    flexShrink: 0,
  } as React.CSSProperties,

  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ============================================================================
// Main Component
// ============================================================================

export function Avatar({ block, data }: LiquidComponentProps): React.ReactElement {
  // Resolve binding - could be image URL or user object
  const boundValue = resolveBinding(block.binding, data);

  // Determine image and initials
  let imageSrc: string | undefined;
  let initials: string = '';

  if (typeof boundValue === 'string') {
    // Check if it's a URL or initials
    if (boundValue.startsWith('http') || boundValue.startsWith('/')) {
      imageSrc = boundValue;
    } else {
      initials = getInitials(boundValue);
    }
  } else if (boundValue && typeof boundValue === 'object') {
    // User object with avatar/name properties
    const obj = boundValue as Record<string, unknown>;
    imageSrc = (obj.avatar || obj.picture || obj.image || obj.url) as string;
    if (!imageSrc && obj.name) {
      initials = getInitials(String(obj.name));
    }
  }

  // Get explicit initials or label from block
  if (!initials && block.label) {
    initials = getInitials(block.label);
  }

  // Size from style
  const size = (block.style?.size as 'sm' | 'md' | 'lg') || 'md';

  const avatarStyle = mergeStyles(
    baseStyles(),
    styles.avatar,
    sizeMap[size]
  );

  return (
    <span data-liquid-type="avatar" data-size={size} style={avatarStyle}>
      {imageSrc ? (
        <img src={imageSrc} alt={block.label || 'Avatar'} style={styles.image} />
      ) : (
        initials || '?'
      )}
    </span>
  );
}

// ============================================================================
// Static Avatar
// ============================================================================

export interface StaticAvatarProps {
  src?: string;
  initials?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function StaticAvatar({
  src,
  initials,
  name,
  size = 'md',
  alt = 'Avatar',
  style: customStyle,
}: StaticAvatarProps): React.ReactElement {
  const displayInitials = initials || (name ? getInitials(name) : '?');

  const avatarStyle = mergeStyles(
    baseStyles(),
    styles.avatar,
    sizeMap[size],
    customStyle
  );

  return (
    <span data-liquid-type="avatar" data-size={size} style={avatarStyle}>
      {src ? (
        <img src={src} alt={alt} style={styles.image} />
      ) : (
        displayInitials
      )}
    </span>
  );
}

export default Avatar;
