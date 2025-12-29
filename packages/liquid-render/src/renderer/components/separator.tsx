// Separator Component - Visual divider with horizontal/vertical orientation
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, baseStyles, mergeStyles } from './utils';

// ============================================================================
// Types
// ============================================================================

type SeparatorOrientation = 'horizontal' | 'vertical';

// ============================================================================
// Styles
// ============================================================================

const separatorBaseStyles: React.CSSProperties = {
  flexShrink: 0,
  backgroundColor: tokens.colors.border,
};

const orientationStyles: Record<SeparatorOrientation, React.CSSProperties> = {
  horizontal: {
    height: '1px',
    width: '100%',
  },
  vertical: {
    height: '100%',
    width: '1px',
  },
};

// ============================================================================
// Helpers
// ============================================================================

function getOrientationFromBlock(block: LiquidComponentProps['block']): SeparatorOrientation {
  // Check props for orientation (passed via block.props in DSL)
  const orientation = block.props?.orientation;
  if (orientation === 'vertical') return 'vertical';
  return 'horizontal';
}


// ============================================================================
// Main Component
// ============================================================================

export function Separator({ block }: LiquidComponentProps): React.ReactElement {
  const orientation = getOrientationFromBlock(block);

  const style = mergeStyles(
    baseStyles(),
    separatorBaseStyles,
    orientationStyles[orientation]
  );

  return (
    <div
      data-liquid-type="separator"
      role="separator"
      aria-orientation={orientation}
      style={style}
    />
  );
}

// ============================================================================
// Static Separator (standalone, no block context)
// ============================================================================

interface StaticSeparatorProps {
  orientation?: SeparatorOrientation;
  style?: React.CSSProperties;
  className?: string;
}

export function StaticSeparator({
  orientation = 'horizontal',
  style: customStyle,
}: StaticSeparatorProps): React.ReactElement {
  const style = mergeStyles(
    baseStyles(),
    separatorBaseStyles,
    orientationStyles[orientation],
    customStyle
  );

  return (
    <div
      data-liquid-type="separator"
      role="separator"
      aria-orientation={orientation}
      style={style}
    />
  );
}

export default Separator;
