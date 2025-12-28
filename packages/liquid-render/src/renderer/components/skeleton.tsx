// Skeleton Component - Placeholder loading state with shimmer animation
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, mergeStyles } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

type SkeletonShape = 'text' | 'circle' | 'rectangle' | 'card';
type SkeletonAnimation = 'shimmer' | 'pulse' | 'none';

interface SkeletonConfig {
  shape?: SkeletonShape;
  width?: string | number;
  height?: string | number;
  lines?: number;
  animation?: SkeletonAnimation;
}

export interface StaticSkeletonProps {
  shape?: SkeletonShape;
  width?: string | number;
  height?: string | number;
  lines?: number;
  animation?: SkeletonAnimation;
  className?: string;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.sm,
    width: '100%',
  } as React.CSSProperties,

  base: {
    backgroundColor: tokens.colors.muted,
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
    position: 'relative' as const,
  } as React.CSSProperties,

  shimmer: {
    background: `linear-gradient(
      90deg,
      ${tokens.colors.muted} 0%,
      ${tokens.colors.secondary} 50%,
      ${tokens.colors.muted} 100%
    )`,
    backgroundSize: '200% 100%',
    animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
  } as React.CSSProperties,

  pulse: {
    animation: 'skeleton-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  } as React.CSSProperties,

  text: (width?: string | number): React.CSSProperties => ({
    height: '1rem',
    width: typeof width === 'number' ? `${width}px` : (width || '100%'),
    borderRadius: tokens.radius.sm,
  }),

  circle: (size?: string | number): React.CSSProperties => {
    const sizeValue = typeof size === 'number' ? `${size}px` : (size || '48px');
    return {
      width: sizeValue,
      height: sizeValue,
      borderRadius: tokens.radius.full,
      flexShrink: 0,
    };
  },

  rectangle: (width?: string | number, height?: string | number): React.CSSProperties => ({
    width: typeof width === 'number' ? `${width}px` : (width || '100%'),
    height: typeof height === 'number' ? `${height}px` : (height || '120px'),
  }),

  card: {
    padding: tokens.spacing.md,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.md,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.card,
  } as React.CSSProperties,

  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.md,
  } as React.CSSProperties,

  cardBody: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.sm,
  } as React.CSSProperties,
};

// Add keyframe animations to document head
if (typeof document !== 'undefined') {
  const styleId = 'liquid-skeleton-animations';
  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = `
      @keyframes skeleton-shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes skeleton-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

// ============================================================================
// Helpers
// ============================================================================

function extractSkeletonConfig(value: unknown, block: { label?: string }): SkeletonConfig {
  const defaults: SkeletonConfig = {
    shape: 'text',
    lines: 1,
    animation: 'shimmer',
  };

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    return {
      shape: (obj.shape as SkeletonShape) || defaults.shape,
      width: obj.width as string | number | undefined,
      height: obj.height as string | number | undefined,
      lines: typeof obj.lines === 'number' ? obj.lines : defaults.lines,
      animation: (obj.animation as SkeletonAnimation) || defaults.animation,
    };
  }

  // If value is a number, treat it as number of lines
  if (typeof value === 'number') {
    return { ...defaults, lines: value };
  }

  // If value is a string, treat it as shape
  if (typeof value === 'string') {
    const validShapes: SkeletonShape[] = ['text', 'circle', 'rectangle', 'card'];
    if (validShapes.includes(value as SkeletonShape)) {
      return { ...defaults, shape: value as SkeletonShape };
    }
  }

  return defaults;
}

function getAnimationStyle(animation: SkeletonAnimation): React.CSSProperties {
  switch (animation) {
    case 'shimmer':
      return styles.shimmer;
    case 'pulse':
      return styles.pulse;
    case 'none':
    default:
      return {};
  }
}

// ============================================================================
// Sub-components
// ============================================================================

interface SkeletonLineProps {
  width?: string | number;
  height?: string | number;
  animation: SkeletonAnimation;
  isLast?: boolean;
}

function SkeletonLine({ width, height, animation, isLast }: SkeletonLineProps): React.ReactElement {
  // Last line in text blocks is typically shorter
  const lineWidth = isLast && !width ? '60%' : width;

  return (
    <div
      style={mergeStyles(
        styles.base,
        styles.text(lineWidth),
        height ? { height: typeof height === 'number' ? `${height}px` : height } : {},
        getAnimationStyle(animation)
      )}
      aria-hidden="true"
    />
  );
}

interface SkeletonCircleProps {
  size?: string | number;
  animation: SkeletonAnimation;
}

function SkeletonCircle({ size, animation }: SkeletonCircleProps): React.ReactElement {
  return (
    <div
      style={mergeStyles(
        styles.base,
        styles.circle(size),
        getAnimationStyle(animation)
      )}
      aria-hidden="true"
    />
  );
}

interface SkeletonRectangleProps {
  width?: string | number;
  height?: string | number;
  animation: SkeletonAnimation;
}

function SkeletonRectangle({ width, height, animation }: SkeletonRectangleProps): React.ReactElement {
  return (
    <div
      style={mergeStyles(
        styles.base,
        styles.rectangle(width, height),
        getAnimationStyle(animation)
      )}
      aria-hidden="true"
    />
  );
}

interface SkeletonCardProps {
  animation: SkeletonAnimation;
}

function SkeletonCard({ animation }: SkeletonCardProps): React.ReactElement {
  return (
    <div style={styles.card} aria-hidden="true">
      <div style={styles.cardHeader}>
        <SkeletonCircle size={40} animation={animation} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
          <SkeletonLine width="50%" animation={animation} />
          <SkeletonLine width="30%" animation={animation} />
        </div>
      </div>
      <div style={styles.cardBody}>
        <SkeletonLine animation={animation} />
        <SkeletonLine animation={animation} />
        <SkeletonLine width="80%" animation={animation} isLast />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Skeleton({ block, data }: LiquidComponentProps): React.ReactElement {
  const rawValue = resolveBinding(block.binding, data);
  const config = extractSkeletonConfig(rawValue, block);

  const {
    shape = 'text',
    width,
    height,
    lines = 1,
    animation = 'shimmer',
  } = config;

  const renderSkeleton = () => {
    switch (shape) {
      case 'circle':
        return <SkeletonCircle size={width || height} animation={animation} />;

      case 'rectangle':
        return <SkeletonRectangle width={width} height={height} animation={animation} />;

      case 'card':
        return <SkeletonCard animation={animation} />;

      case 'text':
      default:
        if (lines === 1) {
          return <SkeletonLine width={width} height={height} animation={animation} />;
        }
        return (
          <div style={styles.wrapper}>
            {Array.from({ length: lines }, (_, index) => (
              <SkeletonLine
                key={index}
                width={width}
                height={height}
                animation={animation}
                isLast={index === lines - 1}
              />
            ))}
          </div>
        );
    }
  };

  return (
    <div
      data-liquid-type="skeleton"
      style={styles.wrapper}
      role="status"
      aria-label="Loading..."
      aria-busy="true"
    >
      {renderSkeleton()}
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

export function StaticSkeleton({
  shape = 'text',
  width,
  height,
  lines = 1,
  animation = 'shimmer',
  className,
}: StaticSkeletonProps): React.ReactElement {
  const renderSkeleton = () => {
    switch (shape) {
      case 'circle':
        return <SkeletonCircle size={width || height} animation={animation} />;

      case 'rectangle':
        return <SkeletonRectangle width={width} height={height} animation={animation} />;

      case 'card':
        return <SkeletonCard animation={animation} />;

      case 'text':
      default:
        if (lines === 1) {
          return <SkeletonLine width={width} height={height} animation={animation} />;
        }
        return (
          <div style={styles.wrapper}>
            {Array.from({ length: lines }, (_, index) => (
              <SkeletonLine
                key={index}
                width={width}
                height={height}
                animation={animation}
                isLast={index === lines - 1}
              />
            ))}
          </div>
        );
    }
  };

  return (
    <div
      data-liquid-type="skeleton"
      style={styles.wrapper}
      className={className}
      role="status"
      aria-label="Loading..."
      aria-busy="true"
    >
      {renderSkeleton()}
    </div>
  );
}

export default Skeleton;
