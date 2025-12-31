// Tab Component - Passthrough container for tab content inside Tabs
import React from 'react';
import type { LiquidComponentProps } from './utils';

// ============================================================================
// Main Component
// ============================================================================

/**
 * Tab is a passthrough component that renders its children.
 * It's used as a child of Tabs to provide content for each tab panel.
 * The Tabs component extracts the label from this component's block
 * and uses it for the tab header.
 */
export function Tab({ children }: LiquidComponentProps): React.ReactElement {
  return (
    <div data-liquid-type="tab">
      {children}
    </div>
  );
}

export default Tab;
