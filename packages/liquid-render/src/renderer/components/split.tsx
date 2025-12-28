// Split Component - Resizable split panel layout
import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, baseStyles, mergeStyles, clamp } from './utils';

// ============================================================================
// Types
// ============================================================================

type SplitDirection = 'horizontal' | 'vertical';
type GapSize = 'xs' | 'sm' | 'md' | 'lg';

interface SplitLayoutConfig {
  direction?: SplitDirection;
  /** Default size of the first panel as percentage (0-100) */
  defaultSize?: number;
  /** Minimum size of first panel as percentage */
  minSize?: number;
  /** Maximum size of first panel as percentage */
  maxSize?: number;
  /** Whether the split is resizable */
  resizable?: boolean;
  /** Whether to show a visible handle */
  showHandle?: boolean;
}

interface PanelInfo {
  size: number;
  minSize: number;
  maxSize: number;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract split configuration from block.layout
 */
function extractSplitConfig(
  layout?: Record<string, unknown>
): SplitLayoutConfig {
  if (!layout) {
    return {
      direction: 'horizontal',
      defaultSize: 50,
      minSize: 10,
      maxSize: 90,
      resizable: true,
      showHandle: true,
    };
  }

  return {
    direction: (layout.direction as SplitDirection) ?? 'horizontal',
    defaultSize: (layout.defaultSize as number) ?? 50,
    minSize: (layout.minSize as number) ?? 10,
    maxSize: (layout.maxSize as number) ?? 90,
    resizable: layout.resizable !== false,
    showHandle: layout.showHandle !== false,
  };
}

/**
 * Get handle size based on gap
 */
function getHandleSize(gap: GapSize = 'sm'): number {
  const sizeMap: Record<GapSize, number> = {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
  };
  return sizeMap[gap];
}

// ============================================================================
// Styles
// ============================================================================

function getSplitContainerStyles(direction: SplitDirection): React.CSSProperties {
  return mergeStyles(baseStyles(), {
    display: 'flex',
    flexDirection: direction === 'horizontal' ? 'row' : 'column',
    width: '100%',
    height: '100%',
    minHeight: direction === 'vertical' ? '200px' : undefined,
    overflow: 'hidden',
  });
}

function getPanelStyles(
  size: number,
  direction: SplitDirection
): React.CSSProperties {
  const flexBasis = `calc(${size}% - 3px)`;

  return {
    flexBasis,
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'auto',
    minWidth: direction === 'horizontal' ? 0 : undefined,
    minHeight: direction === 'vertical' ? 0 : undefined,
  };
}

function getHandleStyles(
  direction: SplitDirection,
  isResizable: boolean,
  showHandle: boolean,
  isDragging: boolean,
  isFocused: boolean
): React.CSSProperties {
  const isHorizontal = direction === 'horizontal';
  const handleSize = getHandleSize('sm');

  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: isHorizontal ? `${handleSize}px` : '100%',
    height: isHorizontal ? '100%' : `${handleSize}px`,
    backgroundColor: isDragging ? tokens.colors.accent : 'transparent',
    cursor: isResizable
      ? (isHorizontal ? 'col-resize' : 'row-resize')
      : 'default',
    userSelect: 'none',
    touchAction: 'none',
    transition: `background-color ${tokens.transition.fast}, outline ${tokens.transition.fast}`,
    position: 'relative',
    outline: isFocused ? `2px solid ${tokens.colors.ring}` : 'none',
    outlineOffset: '2px',
  };
}

function getHandleBarStyles(
  direction: SplitDirection,
  showHandle: boolean,
  isDragging: boolean,
  isHovering: boolean
): React.CSSProperties {
  const isHorizontal = direction === 'horizontal';

  if (!showHandle) {
    return {
      position: 'absolute',
      backgroundColor: isDragging || isHovering ? tokens.colors.border : 'transparent',
      width: isHorizontal ? '1px' : '100%',
      height: isHorizontal ? '100%' : '1px',
      transition: `background-color ${tokens.transition.fast}`,
    };
  }

  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDragging ? tokens.colors.primary : tokens.colors.border,
    borderRadius: tokens.radius.sm,
    width: isHorizontal ? '3px' : '24px',
    height: isHorizontal ? '24px' : '3px',
    transition: `background-color ${tokens.transition.fast}`,
  };
}

function getGripDotsStyles(direction: SplitDirection): React.CSSProperties {
  const isHorizontal = direction === 'horizontal';

  return {
    display: 'flex',
    flexDirection: isHorizontal ? 'column' : 'row',
    gap: '2px',
  };
}

function getDotStyle(): React.CSSProperties {
  return {
    width: '2px',
    height: '2px',
    borderRadius: '50%',
    backgroundColor: tokens.colors.mutedForeground,
  };
}

const styles = {
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.lg,
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    fontStyle: 'italic' as const,
    minHeight: '100px',
    border: `1px dashed ${tokens.colors.border}`,
    borderRadius: tokens.radius.md,
  } as React.CSSProperties,

  panel: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
  } as React.CSSProperties,
};

// ============================================================================
// Sub-components
// ============================================================================

interface ResizeHandleProps {
  direction: SplitDirection;
  isResizable: boolean;
  showHandle: boolean;
  panelSize: number;
  minSize: number;
  maxSize: number;
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  onSizeChange: (newSize: number) => void;
}

function ResizeHandle({
  direction,
  isResizable,
  showHandle,
  panelSize,
  minSize,
  maxSize,
  onDragStart,
  onSizeChange,
}: ResizeHandleProps): React.ReactElement {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [announcement, setAnnouncement] = useState<string>('');
  const handleRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isResizable) return;
    setIsDragging(true);
    onDragStart(e);
  }, [isResizable, onDragStart]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isResizable) return;
    setIsDragging(true);
    onDragStart(e);
  }, [isResizable, onDragStart]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isResizable) return;

    const increment = e.shiftKey ? 10 : 1;
    const isHorizontal = direction === 'horizontal';
    let newSize = panelSize;

    switch (e.key) {
      case 'ArrowLeft':
        if (isHorizontal) newSize = Math.max(minSize, panelSize - increment);
        break;
      case 'ArrowRight':
        if (isHorizontal) newSize = Math.min(maxSize, panelSize + increment);
        break;
      case 'ArrowUp':
        if (!isHorizontal) newSize = Math.max(minSize, panelSize - increment);
        break;
      case 'ArrowDown':
        if (!isHorizontal) newSize = Math.min(maxSize, panelSize + increment);
        break;
      case 'Home':
        newSize = minSize;
        break;
      case 'End':
        newSize = maxSize;
        break;
      default:
        return;
    }

    e.preventDefault();
    if (newSize !== panelSize) {
      onSizeChange(newSize);
      setAnnouncement(`Panel size: ${Math.round(newSize)}%`);
    }
  }, [isResizable, direction, panelSize, minSize, maxSize, onSizeChange]);

  useEffect(() => {
    const handleUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchend', handleUp);
    }

    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging]);

  // Clear announcement after it's been read
  useEffect(() => {
    if (announcement) {
      const timer = setTimeout(() => setAnnouncement(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [announcement]);

  return (
    <>
      <div
        ref={handleRef}
        data-liquid-split-handle
        style={getHandleStyles(direction, isResizable, showHandle, isDragging, isFocused)}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        role="separator"
        aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'}
        aria-valuenow={Math.round(panelSize)}
        aria-valuemin={minSize}
        aria-valuemax={maxSize}
        aria-label="Resize panels"
        tabIndex={isResizable ? 0 : undefined}
      >
        <div style={getHandleBarStyles(direction, showHandle, isDragging, isHovering)}>
          {showHandle && (
            <div style={getGripDotsStyles(direction)}>
              <span style={getDotStyle()} />
              <span style={getDotStyle()} />
              <span style={getDotStyle()} />
            </div>
          )}
        </div>
      </div>
      {/* Screen reader announcement for size changes */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {announcement}
      </div>
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Split({ block, data, children }: LiquidComponentProps): React.ReactElement {
  // Extract split configuration from block layout
  const config = extractSplitConfig(block.layout as Record<string, unknown> | undefined);
  const { direction = 'horizontal', defaultSize = 50, minSize = 10, maxSize = 90, resizable = true, showHandle = true } = config;

  const containerRef = useRef<HTMLDivElement>(null);
  const [panelSize, setPanelSize] = useState(defaultSize);

  // Extract children panels
  const childArray = React.Children.toArray(children);
  const firstPanel = childArray[0];
  const secondPanel = childArray[1];

  // Handle empty/single child states
  const hasChildren = childArray.length > 0;
  const hasTwoPanels = childArray.length >= 2;

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!resizable || !containerRef.current) return;

    e.preventDefault();

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const isHorizontal = direction === 'horizontal';

    const getPosition = (event: MouseEvent | TouchEvent): number => {
      if ('touches' in event && event.touches.length > 0) {
        const touch = event.touches.item(0);
        if (touch) {
          return isHorizontal ? touch.clientX : touch.clientY;
        }
      }
      if ('clientX' in event) {
        return isHorizontal ? event.clientX : event.clientY;
      }
      return 0;
    };

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const position = getPosition(moveEvent);
      const containerStart = isHorizontal ? rect.left : rect.top;
      const containerSize = isHorizontal ? rect.width : rect.height;

      const offset = position - containerStart;
      const percentage = (offset / containerSize) * 100;
      const clampedPercentage = clamp(percentage, minSize, maxSize);

      setPanelSize(clampedPercentage);
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);
  }, [direction, minSize, maxSize, resizable]);

  if (!hasChildren) {
    return (
      <div data-liquid-type="split" style={getSplitContainerStyles(direction)}>
        <div style={styles.empty}>No split panels</div>
      </div>
    );
  }

  // If only one child, just render it
  if (!hasTwoPanels) {
    return (
      <div data-liquid-type="split" style={getSplitContainerStyles(direction)}>
        <div style={{ ...styles.panel, flex: 1 }}>
          {firstPanel}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-liquid-type="split"
      style={getSplitContainerStyles(direction)}
    >
      <div
        data-liquid-split-panel="first"
        style={getPanelStyles(panelSize, direction)}
      >
        {firstPanel}
      </div>

      <ResizeHandle
        direction={direction}
        isResizable={resizable}
        showHandle={showHandle}
        panelSize={panelSize}
        minSize={minSize}
        maxSize={maxSize}
        onDragStart={handleDragStart}
        onSizeChange={setPanelSize}
      />

      <div
        data-liquid-split-panel="second"
        style={getPanelStyles(100 - panelSize, direction)}
      >
        {secondPanel}
      </div>
    </div>
  );
}

// ============================================================================
// Static Split (standalone usage without block context)
// ============================================================================

interface StaticSplitProps {
  children: React.ReactNode;
  /** Direction of the split: 'horizontal' (side by side) or 'vertical' (stacked) */
  direction?: SplitDirection;
  /** Default size of the first panel as percentage (0-100) */
  defaultSize?: number;
  /** Minimum size of first panel as percentage */
  minSize?: number;
  /** Maximum size of first panel as percentage */
  maxSize?: number;
  /** Whether the split is resizable */
  resizable?: boolean;
  /** Whether to show a visible handle */
  showHandle?: boolean;
  /** Additional custom styles */
  style?: React.CSSProperties;
  /** CSS class name */
  className?: string;
}

export function StaticSplit({
  children,
  direction = 'horizontal',
  defaultSize = 50,
  minSize = 10,
  maxSize = 90,
  resizable = true,
  showHandle = true,
  style: customStyle,
  className,
}: StaticSplitProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [panelSize, setPanelSize] = useState(defaultSize);

  // Extract children panels
  const childArray = React.Children.toArray(children);
  const firstPanel = childArray[0];
  const secondPanel = childArray[1];

  const hasTwoPanels = childArray.length >= 2;

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!resizable || !containerRef.current) return;

    e.preventDefault();

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const isHorizontal = direction === 'horizontal';

    const getPosition = (event: MouseEvent | TouchEvent): number => {
      if ('touches' in event && event.touches.length > 0) {
        const touch = event.touches.item(0);
        if (touch) {
          return isHorizontal ? touch.clientX : touch.clientY;
        }
      }
      if ('clientX' in event) {
        return isHorizontal ? event.clientX : event.clientY;
      }
      return 0;
    };

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const position = getPosition(moveEvent);
      const containerStart = isHorizontal ? rect.left : rect.top;
      const containerSize = isHorizontal ? rect.width : rect.height;

      const offset = position - containerStart;
      const percentage = (offset / containerSize) * 100;
      const clampedPercentage = clamp(percentage, minSize, maxSize);

      setPanelSize(clampedPercentage);
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);
  }, [direction, minSize, maxSize, resizable]);

  const containerStyles = mergeStyles(getSplitContainerStyles(direction), customStyle);

  // If only one child, just render it
  if (!hasTwoPanels) {
    return (
      <div
        data-liquid-type="split"
        style={containerStyles}
        className={className}
      >
        <div style={{ ...styles.panel, flex: 1 }}>
          {firstPanel || <div style={styles.empty}>No split panels</div>}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-liquid-type="split"
      style={containerStyles}
      className={className}
    >
      <div
        data-liquid-split-panel="first"
        style={getPanelStyles(panelSize, direction)}
      >
        {firstPanel}
      </div>

      <ResizeHandle
        direction={direction}
        isResizable={resizable}
        showHandle={showHandle}
        panelSize={panelSize}
        minSize={minSize}
        maxSize={maxSize}
        onDragStart={handleDragStart}
        onSizeChange={setPanelSize}
      />

      <div
        data-liquid-split-panel="second"
        style={getPanelStyles(100 - panelSize, direction)}
      >
        {secondPanel}
      </div>
    </div>
  );
}

// ============================================================================
// Split Panel (explicit panel wrapper for more control)
// ============================================================================

interface SplitPanelProps {
  children: React.ReactNode;
  /** Additional custom styles */
  style?: React.CSSProperties;
  /** CSS class name */
  className?: string;
}

export function SplitPanel({
  children,
  style: customStyle,
  className,
}: SplitPanelProps): React.ReactElement {
  return (
    <div
      style={mergeStyles(styles.panel, customStyle)}
      className={className}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Nested Split (convenience for complex layouts)
// ============================================================================

interface NestedSplitProps {
  /** Outer split direction */
  direction?: SplitDirection;
  /** First panel content */
  first: React.ReactNode;
  /** Second panel content (can be another split) */
  second: React.ReactNode;
  /** Default size of first panel */
  defaultSize?: number;
  /** Minimum size of first panel */
  minSize?: number;
  /** Maximum size of first panel */
  maxSize?: number;
  /** Whether the split is resizable */
  resizable?: boolean;
  /** Additional custom styles */
  style?: React.CSSProperties;
}

export function NestedSplit({
  direction = 'horizontal',
  first,
  second,
  defaultSize = 50,
  minSize = 10,
  maxSize = 90,
  resizable = true,
  style: customStyle,
}: NestedSplitProps): React.ReactElement {
  return (
    <StaticSplit
      direction={direction}
      defaultSize={defaultSize}
      minSize={minSize}
      maxSize={maxSize}
      resizable={resizable}
      style={customStyle}
    >
      {first}
      {second}
    </StaticSplit>
  );
}

export default Split;
