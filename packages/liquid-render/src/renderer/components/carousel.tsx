// Carousel Component - Horizontally scrolling carousel with navigation
// DSL: Cr :arrayBinding [children]
// Special bindings: :. = current item, :# = current index

import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { LiquidComponentProps } from './utils';
import {
  tokens,
  baseStyles,
  mergeStyles,
  buttonStyles,
  getLayoutStyles,
} from './utils';
import type { Block } from '../../compiler/ui-emitter';
import { resolveBinding, type DataContext } from '../data-context';

// ============================================================================
// Types
// ============================================================================

type CarouselOrientation = 'horizontal' | 'vertical';

interface CarouselState {
  currentIndex: number;
  canScrollPrev: boolean;
  canScrollNext: boolean;
}

// ============================================================================
// Styles
// ============================================================================

function getCarouselContainerStyles(orientation: CarouselOrientation): React.CSSProperties {
  return mergeStyles(baseStyles(), {
    position: 'relative',
    width: '100%',
  });
}

function getCarouselViewportStyles(orientation: CarouselOrientation): React.CSSProperties {
  return {
    overflow: 'hidden',
    width: '100%',
  };
}

function getCarouselContentStyles(orientation: CarouselOrientation): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: orientation === 'horizontal' ? 'row' : 'column',
    gap: tokens.spacing.md,
    transition: `transform ${tokens.transition.normal}`,
  };
}

function getCarouselItemStyles(orientation: CarouselOrientation): React.CSSProperties {
  return {
    flexShrink: 0,
    flexGrow: 0,
    width: '100%',
    minWidth: 0,
  };
}

const styles = {
  emptyState: {
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    padding: tokens.spacing.md,
    textAlign: 'center' as const,
  },
  navigationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: tokens.spacing.md,
    marginTop: tokens.spacing.md,
  },
  navButton: mergeStyles(buttonStyles('outline', 'sm'), {
    width: '2rem',
    height: '2rem',
    borderRadius: tokens.radius.full,
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  navButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  dotsContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
  },
  dot: {
    width: '0.5rem',
    height: '0.5rem',
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.muted,
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    transition: `all ${tokens.transition.fast}`,
  },
  dotActive: {
    backgroundColor: tokens.colors.primary,
    transform: 'scale(1.25)',
  },
  arrowIcon: {
    width: '1rem',
    height: '1rem',
  },
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get orientation from block layout
 */
function getOrientation(block: Block): CarouselOrientation {
  const flex = block.layout?.flex;
  if (flex === 'column') return 'vertical';
  return 'horizontal';
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Arrow Left Icon
 */
function ArrowLeftIcon(): React.ReactElement {
  return (
    <svg
      style={styles.arrowIcon}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 19l-7-7 7-7"
      />
    </svg>
  );
}

/**
 * Arrow Right Icon
 */
function ArrowRightIcon(): React.ReactElement {
  return (
    <svg
      style={styles.arrowIcon}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

/**
 * Carousel Navigation Arrows
 */
interface CarouselNavigationProps {
  canScrollPrev: boolean;
  canScrollNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  orientation: CarouselOrientation;
}

function CarouselNavigation({
  canScrollPrev,
  canScrollNext,
  onPrev,
  onNext,
  orientation,
}: CarouselNavigationProps): React.ReactElement {
  const prevButtonStyle = mergeStyles(
    styles.navButton,
    !canScrollPrev ? styles.navButtonDisabled : undefined
  );
  const nextButtonStyle = mergeStyles(
    styles.navButton,
    !canScrollNext ? styles.navButtonDisabled : undefined
  );

  return (
    <>
      <button
        type="button"
        style={prevButtonStyle}
        onClick={onPrev}
        disabled={!canScrollPrev}
        aria-label="Previous slide"
      >
        <ArrowLeftIcon />
      </button>
      <button
        type="button"
        style={nextButtonStyle}
        onClick={onNext}
        disabled={!canScrollNext}
        aria-label="Next slide"
      >
        <ArrowRightIcon />
      </button>
    </>
  );
}

/**
 * Carousel Dots Indicator
 */
interface CarouselDotsProps {
  total: number;
  current: number;
  onSelect: (index: number) => void;
}

function CarouselDots({ total, current, onSelect }: CarouselDotsProps): React.ReactElement {
  return (
    <div style={styles.dotsContainer} role="tablist" aria-label="Slide indicators">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          type="button"
          role="tab"
          aria-selected={index === current}
          aria-label={`Go to slide ${index + 1}`}
          style={mergeStyles(
            styles.dot,
            index === current ? styles.dotActive : undefined
          )}
          onClick={() => onSelect(index)}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Carousel component for horizontally scrolling content.
 *
 * The Carousel component iterates over an array (resolved from block.binding)
 * and renders block.children for each item in a scrollable carousel. The children
 * receive a modified data context where:
 * - `$` = the current item
 * - `#` = the current index
 *
 * @example DSL Usage
 * ```liquid
 * Cr :items [Cd :.name]           # Carousel of cards showing item.name
 * Cr :products [                  # Carousel with complex children
 *   Im :.image
 *   Tx :.title
 *   Tx :.price
 * ]
 * ```
 */
export function Carousel({ block, data, children }: LiquidComponentProps): React.ReactElement {
  const [currentIndex, setCurrentIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Resolve the binding to get the array data
  const arrayData = resolveBinding(block.binding, data);
  const orientation = getOrientation(block);

  // Calculate navigation state
  const itemCount = Array.isArray(arrayData) ? arrayData.length : 0;
  const canScrollPrev = currentIndex > 0;
  const canScrollNext = currentIndex < itemCount - 1;

  // Navigation handlers
  const scrollTo = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, itemCount - 1));
    setCurrentIndex(clampedIndex);
  }, [itemCount]);

  const scrollPrev = useCallback(() => {
    scrollTo(currentIndex - 1);
  }, [currentIndex, scrollTo]);

  const scrollNext = useCallback(() => {
    scrollTo(currentIndex + 1);
  }, [currentIndex, scrollTo]);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (orientation === 'horizontal') {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollNext();
      }
    } else {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        scrollNext();
      }
    }
  }, [orientation, scrollPrev, scrollNext]);

  // Container styles with layout
  const containerStyle = mergeStyles(
    getCarouselContainerStyles(orientation),
    getLayoutStyles(block)
  );

  // Content transform
  const contentStyle = mergeStyles(
    getCarouselContentStyles(orientation),
    {
      transform: orientation === 'horizontal'
        ? `translateX(-${currentIndex * 100}%)`
        : `translateY(-${currentIndex * 100}%)`,
    }
  );

  // Handle non-array or empty data
  if (!Array.isArray(arrayData) || arrayData.length === 0) {
    const emptyMessage = block.label || 'No items';
    return (
      <div data-liquid-type="carousel" style={containerStyle}>
        <div style={styles.emptyState}>
          {emptyMessage === 'No items' ? emptyMessage : `No ${emptyMessage.toLowerCase()}`}
        </div>
      </div>
    );
  }

  // If children are passed (pre-rendered by LiquidUI), wrap them in carousel items
  if (children) {
    // Convert children to array for mapping
    const childArray = React.Children.toArray(children);

    return (
      <div
        data-liquid-type="carousel"
        style={containerStyle}
        onKeyDown={handleKeyDown}
        role="region"
        aria-roledescription="carousel"
        aria-label={block.label || 'Carousel'}
        tabIndex={0}
      >
        <div style={getCarouselViewportStyles(orientation)}>
          <div ref={contentRef} style={contentStyle}>
            {childArray.map((child, index) => (
              <div
                key={index}
                role="group"
                aria-roledescription="slide"
                aria-label={`Slide ${index + 1} of ${childArray.length}`}
                style={getCarouselItemStyles(orientation)}
              >
                {child}
              </div>
            ))}
          </div>
        </div>
        <div style={styles.navigationContainer}>
          <CarouselNavigation
            canScrollPrev={canScrollPrev}
            canScrollNext={canScrollNext}
            onPrev={scrollPrev}
            onNext={scrollNext}
            orientation={orientation}
          />
          <CarouselDots
            total={childArray.length}
            current={currentIndex}
            onSelect={scrollTo}
          />
        </div>
      </div>
    );
  }

  // Note: In normal usage, children are rendered by LiquidUI's BlockRenderer
  // which handles the iteration and context injection. This component serves
  // as a container that provides the carousel layout and navigation.

  return (
    <div
      data-liquid-type="carousel"
      style={containerStyle}
      onKeyDown={handleKeyDown}
      role="region"
      aria-roledescription="carousel"
      aria-label={block.label || 'Carousel'}
      tabIndex={0}
    >
      <div style={getCarouselViewportStyles(orientation)}>
        <div ref={contentRef} style={contentStyle}>
          {/* Children will be injected by LiquidUI BlockRenderer */}
        </div>
      </div>
      <div style={styles.navigationContainer}>
        <CarouselNavigation
          canScrollPrev={canScrollPrev}
          canScrollNext={canScrollNext}
          onPrev={scrollPrev}
          onNext={scrollNext}
          orientation={orientation}
        />
        <CarouselDots
          total={itemCount}
          current={currentIndex}
          onSelect={scrollTo}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Static Carousel (standalone usage without LiquidUI)
// ============================================================================

interface StaticCarouselProps<T = unknown> {
  /** Array of items to render */
  items: T[];
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Key extractor function */
  keyExtractor?: (item: T, index: number) => string | number;
  /** Orientation of the carousel */
  orientation?: CarouselOrientation;
  /** Whether to show navigation arrows */
  showArrows?: boolean;
  /** Whether to show dot indicators */
  showDots?: boolean;
  /** Auto-play interval in milliseconds (0 = disabled) */
  autoPlay?: number;
  /** Custom styles for the container */
  style?: React.CSSProperties;
  /** Empty state message or component */
  emptyState?: React.ReactNode;
  /** Optional className */
  className?: string;
  /** Optional label for accessibility */
  label?: string;
  /** Initial slide index */
  initialIndex?: number;
  /** Callback when slide changes */
  onSlideChange?: (index: number) => void;
}

/**
 * Static Carousel component for standalone usage outside LiquidUI.
 *
 * @example
 * ```tsx
 * <StaticCarousel
 *   items={products}
 *   renderItem={(product) => <ProductCard product={product} />}
 *   showArrows
 *   showDots
 *   autoPlay={5000}
 * />
 * ```
 */
export function StaticCarousel<T = unknown>({
  items,
  renderItem,
  keyExtractor,
  orientation = 'horizontal',
  showArrows = true,
  showDots = true,
  autoPlay = 0,
  style: customStyle,
  emptyState = 'No items',
  className,
  label = 'Carousel',
  initialIndex = 0,
  onSlideChange,
}: StaticCarouselProps<T>): React.ReactElement {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const contentRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate navigation state
  const itemCount = items?.length || 0;
  const canScrollPrev = currentIndex > 0;
  const canScrollNext = currentIndex < itemCount - 1;

  // Navigation handlers
  const scrollTo = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, itemCount - 1));
    setCurrentIndex(clampedIndex);
    onSlideChange?.(clampedIndex);
  }, [itemCount, onSlideChange]);

  const scrollPrev = useCallback(() => {
    scrollTo(currentIndex - 1);
  }, [currentIndex, scrollTo]);

  const scrollNext = useCallback(() => {
    if (currentIndex >= itemCount - 1) {
      // Loop back to start for autoplay
      scrollTo(0);
    } else {
      scrollTo(currentIndex + 1);
    }
  }, [currentIndex, itemCount, scrollTo]);

  // Auto-play effect
  useEffect(() => {
    if (autoPlay > 0 && itemCount > 1) {
      autoPlayRef.current = setInterval(() => {
        scrollNext();
      }, autoPlay);

      return () => {
        if (autoPlayRef.current) {
          clearInterval(autoPlayRef.current);
        }
      };
    }
  }, [autoPlay, itemCount, scrollNext]);

  // Pause auto-play on hover
  const handleMouseEnter = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (autoPlay > 0 && itemCount > 1) {
      autoPlayRef.current = setInterval(() => {
        scrollNext();
      }, autoPlay);
    }
  }, [autoPlay, itemCount, scrollNext]);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (orientation === 'horizontal') {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollNext();
      }
    } else {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        scrollNext();
      }
    }
  }, [orientation, scrollPrev, scrollNext]);

  // Container styles
  const containerStyle = mergeStyles(
    getCarouselContainerStyles(orientation),
    customStyle
  );

  // Content transform
  const contentStyle = mergeStyles(
    getCarouselContentStyles(orientation),
    {
      transform: orientation === 'horizontal'
        ? `translateX(-${currentIndex * 100}%)`
        : `translateY(-${currentIndex * 100}%)`,
    }
  );

  // Handle empty state
  if (!items || items.length === 0) {
    return (
      <div data-liquid-type="carousel" style={containerStyle} className={className}>
        {typeof emptyState === 'string' ? (
          <div style={styles.emptyState}>{emptyState}</div>
        ) : (
          emptyState
        )}
      </div>
    );
  }

  return (
    <div
      data-liquid-type="carousel"
      style={containerStyle}
      className={className}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
    >
      <div style={getCarouselViewportStyles(orientation)}>
        <div ref={contentRef} style={contentStyle}>
          {items.map((item, index) => {
            const key = keyExtractor ? keyExtractor(item, index) : index;
            return (
              <div
                key={key}
                role="group"
                aria-roledescription="slide"
                aria-label={`Slide ${index + 1} of ${items.length}`}
                aria-hidden={index !== currentIndex}
                style={getCarouselItemStyles(orientation)}
              >
                {renderItem(item, index)}
              </div>
            );
          })}
        </div>
      </div>
      {(showArrows || showDots) && (
        <div style={styles.navigationContainer}>
          {showArrows && (
            <CarouselNavigation
              canScrollPrev={canScrollPrev}
              canScrollNext={canScrollNext}
              onPrev={scrollPrev}
              onNext={scrollNext}
              orientation={orientation}
            />
          )}
          {showDots && (
            <CarouselDots
              total={items.length}
              current={currentIndex}
              onSelect={scrollTo}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default Carousel;
