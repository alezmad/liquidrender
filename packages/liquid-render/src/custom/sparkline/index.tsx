/**
 * Sparkline Custom Component
 *
 * Example LLM-generated component demonstrating the custom component pattern.
 * This shows how to create a custom component that can be referenced from DSL.
 *
 * DSL Usage: Custom "sparkline" :metrics.trend #green
 *
 * @see packages/liquid-render/specs/LLM-REACT-CODE-ARCHITECTURE.md
 */

import React from 'react';
import type { CustomComponentProps, CustomComponentContract } from '../../types/custom-component';
import { resolveBinding } from '../../renderer/data-context';

// ============================================================================
// Contract (for LLM context)
// ============================================================================

export const sparklineContract: CustomComponentContract = {
  id: 'sparkline',
  name: 'Sparkline',
  description: 'Inline mini chart showing trend data as a simple line visualization',
  props: {
    width: { type: 'number', default: 100, description: 'Width in pixels' },
    height: { type: 'number', default: 24, description: 'Height in pixels' },
    strokeWidth: { type: 'number', default: 1.5, description: 'Line thickness' },
  },
  bindings: {
    primary: 'array', // Expects array of numbers
  },
  example: 'Custom "sparkline" :metrics.weeklyTrend #blue',
};

// ============================================================================
// Component
// ============================================================================

export function Sparkline({ block, data }: CustomComponentProps): React.ReactElement {
  // Resolve binding to get data array
  const values = resolveBinding(block.binding, data);

  // Extract props with defaults
  const width = (block.props?.width as number) ?? 100;
  const height = (block.props?.height as number) ?? 24;
  const strokeWidth = (block.props?.strokeWidth as number) ?? 1.5;
  const color = block.color ?? 'currentColor';

  // Handle non-array or empty data
  if (!Array.isArray(values) || values.length === 0) {
    return (
      <div
        data-liquid-type="custom"
        data-component-id="sparkline"
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--muted-foreground, #9ca3af)',
          fontSize: '0.625rem',
        }}
      >
        No data
      </div>
    );
  }

  // Calculate path
  const numericValues = values.map(v => typeof v === 'number' ? v : 0);
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const range = max - min || 1; // Avoid division by zero

  const padding = strokeWidth;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = numericValues.map((value, index) => {
    const x = padding + (index / (numericValues.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  return (
    <svg
      data-liquid-type="custom"
      data-component-id="sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
    >
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default Sparkline;
