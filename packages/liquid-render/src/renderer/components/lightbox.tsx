// Lightbox Component - Full-screen image/gallery viewer with thumbnails
// DSL: Lb :arrayBinding
// Features: Thumbnail grid, modal viewer, navigation, zoom, keyboard support

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { LiquidComponentProps } from './utils';
import {
  tokens,
  baseStyles,
  mergeStyles,
  buttonStyles,
  getLayoutStyles,
  isBrowser,
} from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

interface LightboxImage {
  src: string;
  alt?: string;
  caption?: string;
}

type ZoomLevel = 1 | 1.5 | 2 | 2.5 | 3;

// ============================================================================
// Styles
// ============================================================================

const styles = {
  // Thumbnail grid container
  container: mergeStyles(baseStyles(), {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: tokens.spacing.sm,
    width: '100%',
  }),

  thumbnail: {
    position: 'relative' as const,
    aspectRatio: '1 / 1',
    overflow: 'hidden',
    borderRadius: tokens.radius.md,
    cursor: 'pointer',
    backgroundColor: tokens.colors.muted,
    border: `1px solid ${tokens.colors.border}`,
    transition: `all ${tokens.transition.fast}`,
  },

  thumbnailHover: {
    transform: 'scale(1.02)',
    boxShadow: tokens.shadow.md,
  },

  thumbnailImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    display: 'block',
  },

  // Modal overlay
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: tokens.spacing.md,
  },

  overlayHidden: {
    display: 'none',
  },

  // Header with counter and close button
  header: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacing.md,
    color: '#ffffff',
    zIndex: 10,
  },

  counter: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Main image container
  imageContainer: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
    maxHeight: 'calc(100vh - 120px)',
    overflow: 'hidden',
  },

  mainImage: (zoom: ZoomLevel): React.CSSProperties => ({
    maxWidth: zoom === 1 ? '100%' : 'none',
    maxHeight: zoom === 1 ? '100%' : 'none',
    width: zoom === 1 ? 'auto' : `${zoom * 100}%`,
    height: zoom === 1 ? 'auto' : 'auto',
    objectFit: 'contain' as const,
    transition: `transform ${tokens.transition.fast}`,
    cursor: zoom > 1 ? 'grab' : 'zoom-in',
    userSelect: 'none' as const,
  }),

  // Navigation buttons
  navButton: mergeStyles(buttonStyles('ghost', 'lg'), {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '3rem',
    height: '3rem',
    borderRadius: tokens.radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: '#ffffff',
    border: 'none',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),

  navButtonLeft: {
    left: tokens.spacing.md,
  },

  navButtonRight: {
    right: tokens.spacing.md,
  },

  navButtonDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  },

  // Close button
  closeButton: mergeStyles(buttonStyles('ghost', 'md'), {
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: tokens.radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  }),

  // Zoom controls
  zoomControls: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },

  zoomButton: mergeStyles(buttonStyles('ghost', 'sm'), {
    width: '2rem',
    height: '2rem',
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.bold,
  }),

  // Caption
  caption: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: tokens.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#ffffff',
    fontSize: tokens.fontSize.sm,
    textAlign: 'center' as const,
  },

  // Empty state
  emptyState: {
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    padding: tokens.spacing.lg,
    textAlign: 'center' as const,
    backgroundColor: tokens.colors.muted,
    borderRadius: tokens.radius.md,
  },

  // Icon styles
  icon: {
    width: '1.25rem',
    height: '1.25rem',
  },
};

// Global style injection for animations
const styleId = 'liquid-lightbox-styles';
function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes lightboxFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    [data-liquid-type="lightbox"] .lightbox-overlay {
      animation: lightboxFadeIn 0.2s ease-out;
    }
    [data-liquid-type="lightbox"] .lightbox-thumbnail:hover {
      transform: scale(1.02);
      box-shadow: ${tokens.shadow.md};
    }
    [data-liquid-type="lightbox"] .lightbox-thumbnail:focus {
      outline: 2px solid ${tokens.colors.ring};
      outline-offset: 2px;
    }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse image data from various formats
 */
function parseImages(data: unknown): LightboxImage[] {
  if (!data) return [];

  // Array of strings (URLs)
  if (Array.isArray(data)) {
    return data.map((item, index) => {
      if (typeof item === 'string') {
        return { src: item, alt: `Image ${index + 1}` };
      }
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        return {
          src: String(obj.src || obj.url || obj.image || ''),
          alt: String(obj.alt || obj.title || `Image ${index + 1}`),
          caption: obj.caption ? String(obj.caption) : undefined,
        };
      }
      return { src: '', alt: `Image ${index + 1}` };
    }).filter(img => img.src);
  }

  // Single string (URL)
  if (typeof data === 'string') {
    return [{ src: data, alt: 'Image' }];
  }

  // Single object
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    const src = String(obj.src || obj.url || obj.image || '');
    if (src) {
      return [{
        src,
        alt: String(obj.alt || obj.title || 'Image'),
        caption: obj.caption ? String(obj.caption) : undefined,
      }];
    }
  }

  return [];
}

/**
 * Cycle through zoom levels
 */
function getNextZoom(current: ZoomLevel): ZoomLevel {
  const levels: ZoomLevel[] = [1, 1.5, 2, 2.5, 3];
  const currentIndex = levels.indexOf(current);
  return levels[(currentIndex + 1) % levels.length] ?? 1;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Close Icon
 */
function CloseIcon(): React.ReactElement {
  return (
    <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * Arrow Left Icon
 */
function ArrowLeftIcon(): React.ReactElement {
  return (
    <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

/**
 * Arrow Right Icon
 */
function ArrowRightIcon(): React.ReactElement {
  return (
    <svg style={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

/**
 * Thumbnail Grid Item
 */
interface ThumbnailProps {
  image: LightboxImage;
  index: number;
  onClick: () => void;
}

function Thumbnail({ image, index, onClick }: ThumbnailProps): React.ReactElement {
  return (
    <button
      type="button"
      className="lightbox-thumbnail"
      style={styles.thumbnail}
      onClick={onClick}
      aria-label={`View ${image.alt || `image ${index + 1}`}`}
    >
      <img
        src={image.src}
        alt={image.alt || `Thumbnail ${index + 1}`}
        style={styles.thumbnailImage}
        loading="lazy"
      />
    </button>
  );
}

/**
 * Lightbox Modal Viewer
 */
interface LightboxModalProps {
  images: LightboxImage[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
}

function LightboxModal({
  images,
  currentIndex,
  isOpen,
  onClose,
  onPrev,
  onNext,
}: LightboxModalProps): React.ReactElement | null {
  const [zoom, setZoom] = useState<ZoomLevel>(1);
  const imageRef = useRef<HTMLImageElement>(null);

  const currentImage = images[currentIndex];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < images.length - 1;

  // Reset zoom when image changes
  useEffect(() => {
    setZoom(1);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (canGoPrev) onPrev();
          break;
        case 'ArrowRight':
          if (canGoNext) onNext();
          break;
        case '+':
        case '=':
          setZoom(prev => Math.min(3, prev + 0.5) as ZoomLevel);
          break;
        case '-':
          setZoom(prev => Math.max(1, prev - 0.5) as ZoomLevel);
          break;
        case '0':
          setZoom(1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, canGoPrev, canGoNext, onClose, onPrev, onNext]);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Handle zoom toggle on image click
  const handleImageClick = useCallback(() => {
    setZoom(prev => getNextZoom(prev));
  }, []);

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(3, prev + 0.5) as ZoomLevel);
  }, []);

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(1, prev - 0.5) as ZoomLevel);
  }, []);

  // Handle overlay click (close if clicking outside image)
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen || !currentImage) return null;

  injectStyles();

  return (
    <div
      className="lightbox-overlay"
      style={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
    >
      {/* Header */}
      <div style={styles.header}>
        {/* Counter */}
        <span style={styles.counter}>
          {currentIndex + 1} of {images.length}
        </span>

        {/* Zoom controls */}
        <div style={styles.zoomControls}>
          <button
            type="button"
            style={styles.zoomButton}
            onClick={handleZoomOut}
            disabled={zoom === 1}
            aria-label="Zoom out"
          >
            -
          </button>
          <span style={{ color: '#fff', fontSize: tokens.fontSize.xs, minWidth: '3rem', textAlign: 'center' as const }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            style={styles.zoomButton}
            onClick={handleZoomIn}
            disabled={zoom === 3}
            aria-label="Zoom in"
          >
            +
          </button>
        </div>

        {/* Close button */}
        <button
          type="button"
          style={styles.closeButton}
          onClick={onClose}
          aria-label="Close lightbox"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Navigation - Previous */}
      <button
        type="button"
        style={mergeStyles(
          styles.navButton,
          styles.navButtonLeft,
          !canGoPrev ? styles.navButtonDisabled : undefined
        )}
        onClick={onPrev}
        disabled={!canGoPrev}
        aria-label="Previous image"
      >
        <ArrowLeftIcon />
      </button>

      {/* Main image */}
      <div style={styles.imageContainer}>
        <img
          ref={imageRef}
          src={currentImage.src}
          alt={currentImage.alt || `Image ${currentIndex + 1}`}
          style={styles.mainImage(zoom)}
          onClick={handleImageClick}
          draggable={false}
        />
      </div>

      {/* Navigation - Next */}
      <button
        type="button"
        style={mergeStyles(
          styles.navButton,
          styles.navButtonRight,
          !canGoNext ? styles.navButtonDisabled : undefined
        )}
        onClick={onNext}
        disabled={!canGoNext}
        aria-label="Next image"
      >
        <ArrowRightIcon />
      </button>

      {/* Caption */}
      {currentImage.caption && (
        <div style={styles.caption}>{currentImage.caption}</div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Lightbox component for displaying a gallery of images with a full-screen viewer.
 *
 * The Lightbox component displays a thumbnail grid. Clicking a thumbnail opens
 * a full-screen modal with navigation and zoom capabilities.
 *
 * @example DSL Usage
 * ```liquid
 * Lb :images                    # Lightbox from array of image URLs
 * Lb :gallery.photos            # Lightbox from nested data
 * ```
 */
export function Lightbox({ block, data }: LiquidComponentProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Resolve the binding to get image data
  const rawData = resolveBinding(block.binding, data);
  const images = parseImages(rawData);

  // Container styles with layout
  const containerStyle = mergeStyles(styles.container, getLayoutStyles(block));

  // Handlers
  const openLightbox = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setIsOpen(false);
  }, []);

  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(images.length - 1, prev + 1));
  }, [images.length]);

  const selectImage = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Inject styles
  if (isBrowser) {
    injectStyles();
  }

  // Handle empty state
  if (images.length === 0) {
    const emptyMessage = block.label || 'No images available';
    return (
      <div data-liquid-type="lightbox" style={containerStyle}>
        <div style={styles.emptyState}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div data-liquid-type="lightbox" style={containerStyle}>
      {/* Thumbnail Grid */}
      {images.map((image, index) => (
        <Thumbnail
          key={`${image.src}-${index}`}
          image={image}
          index={index}
          onClick={() => openLightbox(index)}
        />
      ))}

      {/* Modal Viewer */}
      <LightboxModal
        images={images}
        currentIndex={currentIndex}
        isOpen={isOpen}
        onClose={closeLightbox}
        onPrev={goToPrev}
        onNext={goToNext}
        onSelect={selectImage}
      />
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

interface StaticLightboxProps {
  /** Array of images or image URLs */
  images: (string | LightboxImage)[];
  /** Number of columns in the thumbnail grid */
  columns?: number;
  /** Gap between thumbnails */
  gap?: 'sm' | 'md' | 'lg';
  /** Custom styles for the container */
  style?: React.CSSProperties;
  /** Optional className */
  className?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Initial open state and index */
  initialOpen?: { isOpen: boolean; index: number };
  /** Callback when lightbox opens */
  onOpen?: (index: number) => void;
  /** Callback when lightbox closes */
  onClose?: () => void;
  /** Callback when image changes */
  onChange?: (index: number) => void;
}

/**
 * Static Lightbox component for standalone usage outside LiquidUI.
 *
 * @example
 * ```tsx
 * <StaticLightbox
 *   images={[
 *     { src: '/photo1.jpg', alt: 'Beach sunset', caption: 'Summer vacation' },
 *     { src: '/photo2.jpg', alt: 'Mountain view' },
 *     '/photo3.jpg', // Can also use simple strings
 *   ]}
 *   columns={4}
 *   gap="md"
 *   onOpen={(index) => console.log(`Opened image ${index}`)}
 * />
 * ```
 */
export function StaticLightbox({
  images: rawImages,
  columns = 4,
  gap = 'md',
  style: customStyle,
  className,
  emptyMessage = 'No images available',
  initialOpen,
  onOpen,
  onClose: onCloseCallback,
  onChange,
}: StaticLightboxProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(initialOpen?.isOpen ?? false);
  const [currentIndex, setCurrentIndex] = useState(initialOpen?.index ?? 0);

  // Normalize images to LightboxImage format
  const images: LightboxImage[] = rawImages.map((img, index) => {
    if (typeof img === 'string') {
      return { src: img, alt: `Image ${index + 1}` };
    }
    return img;
  }).filter(img => img.src);

  // Gap mapping
  const gapMap: Record<string, string> = {
    sm: tokens.spacing.xs,
    md: tokens.spacing.sm,
    lg: tokens.spacing.md,
  };

  // Container styles
  const containerStyle = mergeStyles(styles.container, {
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: gapMap[gap],
  }, customStyle);

  // Handlers
  const openLightbox = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
    onOpen?.(index);
  }, [onOpen]);

  const closeLightbox = useCallback(() => {
    setIsOpen(false);
    onCloseCallback?.();
  }, [onCloseCallback]);

  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => {
      const newIndex = Math.max(0, prev - 1);
      onChange?.(newIndex);
      return newIndex;
    });
  }, [onChange]);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => {
      const newIndex = Math.min(images.length - 1, prev + 1);
      onChange?.(newIndex);
      return newIndex;
    });
  }, [images.length, onChange]);

  const selectImage = useCallback((index: number) => {
    setCurrentIndex(index);
    onChange?.(index);
  }, [onChange]);

  // Inject styles
  if (isBrowser) {
    injectStyles();
  }

  // Handle empty state
  if (images.length === 0) {
    return (
      <div data-liquid-type="lightbox" style={containerStyle} className={className}>
        <div style={styles.emptyState}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div data-liquid-type="lightbox" style={containerStyle} className={className}>
      {/* Thumbnail Grid */}
      {images.map((image, index) => (
        <Thumbnail
          key={`${image.src}-${index}`}
          image={image}
          index={index}
          onClick={() => openLightbox(index)}
        />
      ))}

      {/* Modal Viewer */}
      <LightboxModal
        images={images}
        currentIndex={currentIndex}
        isOpen={isOpen}
        onClose={closeLightbox}
        onPrev={goToPrev}
        onNext={goToNext}
        onSelect={selectImage}
      />
    </div>
  );
}

export default Lightbox;
