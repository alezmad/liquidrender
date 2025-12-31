// GridEmpty Component - Invisible placeholder for empty grid cells
import React from 'react';
import type { LiquidComponentProps } from './utils';

// ============================================================================
// Main Component
// ============================================================================

/**
 * GridEmpty represents an empty grid cell (from the `_` placeholder token).
 * It renders as an empty div that occupies space in the grid layout.
 */
export function GridEmpty({ block }: LiquidComponentProps): React.ReactElement {
  return (
    <div
      data-liquid-type="grid-empty"
      aria-hidden="true"
    />
  );
}

export default GridEmpty;
