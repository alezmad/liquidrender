// Image Component - Display images with aspect ratio control
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, mergeStyles, cardStyles, baseStyles } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

type AspectRatio = 'square' | '16:9' | '4:3' | 'auto';
type ObjectFit = 'cover' | 'contain' | 'fill';

interface ImageStyleProps {
  aspectRatio?: AspectRatio;
  objectFit?: ObjectFit;
  rounded?: boolean;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: mergeStyles(baseStyles(), {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.sm,
  }),

  imageContainer: (props: ImageStyleProps): React.CSSProperties => {
    const aspectRatioMap: Record<AspectRatio, string | undefined> = {
      'square': '1 / 1',
      '16:9': '16 / 9',
      '4:3': '4 / 3',
      'auto': undefined,
    };

    return mergeStyles(baseStyles(), {
      position: 'relative' as const,
      overflow: 'hidden',
      backgroundColor: tokens.colors.muted,
      borderRadius: props.rounded ? tokens.radius.lg : tokens.radius.none,
      aspectRatio: aspectRatioMap[props.aspectRatio || 'auto'],
      width: '100%',
    });
  },

  image: (props: ImageStyleProps): React.CSSProperties => ({
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: props.objectFit || 'cover',
  }),

  placeholder: mergeStyles(cardStyles(), {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    minHeight: '120px',
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    padding: tokens.spacing.md,
    textAlign: 'center' as const,
  }),

  caption: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.mutedForeground,
    textAlign: 'center' as const,
    padding: `0 ${tokens.spacing.xs}`,
  },
};

// ============================================================================
// Helpers
// ============================================================================

function getImageStyleProps(block: LiquidComponentProps['block']): ImageStyleProps {
  const style = block.style as Record<string, unknown> | undefined;
  return {
    aspectRatio: (style?.aspectRatio as AspectRatio) || 'auto',
    objectFit: (style?.objectFit as ObjectFit) || 'cover',
    rounded: style?.rounded === true,
  };
}

// ============================================================================
// Sub-components
// ============================================================================

interface PlaceholderProps {
  message?: string;
  rounded?: boolean;
}

function ImagePlaceholder({ message = 'No image available', rounded }: PlaceholderProps): React.ReactElement {
  const containerStyle = mergeStyles(styles.imageContainer({ rounded }), {
    minHeight: '120px',
  });

  return (
    <div style={containerStyle}>
      <div style={styles.placeholder}>
        <span>{message}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Image({ block, data }: LiquidComponentProps): React.ReactElement {
  // 1. Resolve bindings
  const src = resolveBinding(block.binding, data);
  const imageUrl = typeof src === 'string' ? src : undefined;

  // 2. Extract block properties
  const caption = block.label;
  const styleProps = getImageStyleProps(block);
  const alt = caption || 'Image';

  // 3. Handle empty/null src
  if (!imageUrl) {
    return (
      <div data-liquid-type="image" style={styles.wrapper}>
        <ImagePlaceholder rounded={styleProps.rounded} />
        {caption && <div style={styles.caption}>{caption}</div>}
      </div>
    );
  }

  // 4. Render image
  return (
    <div data-liquid-type="image" style={styles.wrapper}>
      <div style={styles.imageContainer(styleProps)}>
        <img
          src={imageUrl}
          alt={alt}
          style={styles.image(styleProps)}
          loading="lazy"
        />
      </div>
      {caption && <div style={styles.caption}>{caption}</div>}
    </div>
  );
}

// ============================================================================
// Static Image (standalone usage)
// ============================================================================

interface StaticImageProps {
  src?: string;
  alt?: string;
  caption?: string;
  aspectRatio?: AspectRatio;
  objectFit?: ObjectFit;
  rounded?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function StaticImage({
  src,
  alt = 'Image',
  caption,
  aspectRatio = 'auto',
  objectFit = 'cover',
  rounded = false,
  style: customStyle,
  className,
}: StaticImageProps): React.ReactElement {
  const styleProps: ImageStyleProps = { aspectRatio, objectFit, rounded };

  const wrapperStyle = mergeStyles(styles.wrapper, customStyle);

  // Handle empty/null src
  if (!src) {
    return (
      <div data-liquid-type="image" style={wrapperStyle} className={className}>
        <ImagePlaceholder rounded={rounded} />
        {caption && <div style={styles.caption}>{caption}</div>}
      </div>
    );
  }

  return (
    <div data-liquid-type="image" style={wrapperStyle} className={className}>
      <div style={styles.imageContainer(styleProps)}>
        <img
          src={src}
          alt={alt}
          style={styles.image(styleProps)}
          loading="lazy"
        />
      </div>
      {caption && <div style={styles.caption}>{caption}</div>}
    </div>
  );
}

export default Image;
