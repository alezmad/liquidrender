// LiquidUI - Main renderer component
import React, { createContext, useContext, useState, useCallback, useMemo, type ReactElement } from 'react';
import type { LiquidSchema, Block, Layer } from '../compiler/ui-emitter';
import type { DataContext } from './data-context';
import { getComponent, type LiquidComponentProps } from './component-registry';

// Import built-in components for fallback rendering
import { Container } from './components/container';
import { KPICard } from './components/kpi-card';
import { LineChartComponent } from './components/line-chart';
import { BarChartComponent } from './components/bar-chart';
import { PieChartComponent } from './components/pie-chart';
import { DataTable } from './components/data-table';
import { Card } from './components/card';
import { Text } from './components/text';
import { Button } from './components/button';

// ============================================================================
// Signal State
// ============================================================================

type SignalState = Record<string, string>;

interface SignalActions {
  emit: (signal: string, value: string) => void;
  get: (signal: string) => string | undefined;
}

// ============================================================================
// Context
// ============================================================================

interface LiquidContextValue {
  data: DataContext;
  schema: LiquidSchema;
  signals: SignalState;
  signalActions: SignalActions;
}

const LiquidContext = createContext<LiquidContextValue | null>(null);

export function useLiquidContext(): LiquidContextValue {
  const ctx = useContext(LiquidContext);
  if (!ctx) throw new Error('useLiquidContext must be used within LiquidUI');
  return ctx;
}

export function useSignals(): SignalActions {
  const ctx = useLiquidContext();
  return ctx.signalActions;
}

// ============================================================================
// Main Component
// ============================================================================

export interface LiquidUIProps {
  /** The schema to render (from parseUI) */
  schema: LiquidSchema;
  /** Data for binding resolution */
  data: DataContext;
  /** Optional custom components to override defaults */
  components?: Record<string, React.ComponentType<LiquidComponentProps>>;
  /** Optional className for the root element */
  className?: string;
  /** Optional initial signal values */
  initialSignals?: SignalState;
  /** Optional callback when signals change */
  onSignalChange?: (signal: string, value: string, allSignals: SignalState) => void;
}

export function LiquidUI({
  schema,
  data,
  components,
  className,
  initialSignals = {},
  onSignalChange
}: LiquidUIProps): React.ReactElement {
  // Initialize signal state synchronously from schema declarations and initial values
  const [signals, setSignals] = useState<SignalState>(() => {
    const initial: SignalState = {};
    // Initialize declared signals with default value "0"
    for (const signal of schema.signals) {
      initial[signal.name] = initialSignals[signal.name] ?? '0';
    }
    // Merge with any additional initial values
    return { ...initial, ...initialSignals };
  });

  // Signal actions
  const emit = useCallback((signal: string, value: string) => {
    setSignals(prev => {
      const next = { ...prev, [signal]: value };
      onSignalChange?.(signal, value, next);
      return next;
    });
  }, [onSignalChange]);

  const get = useCallback((signal: string) => signals[signal], [signals]);

  const signalActions = useMemo(() => ({ emit, get }), [emit, get]);

  const contextValue = useMemo(() => ({
    data,
    schema,
    signals,
    signalActions,
  }), [data, schema, signals, signalActions]);

  return (
    <LiquidContext.Provider value={contextValue}>
      <div className={className} data-liquid-ui>
        {/* Render main layer (layer 0 or first layer) */}
        {schema.layers[0] && (
          <BlockRenderer
            block={schema.layers[0].root}
            data={data}
            customComponents={components}
          />
        )}
      </div>
    </LiquidContext.Provider>
  );
}

// ============================================================================
// Block Renderer
// ============================================================================

interface BlockRendererProps {
  block: Block;
  data: DataContext;
  customComponents?: Record<string, React.ComponentType<LiquidComponentProps>>;
}

function BlockRenderer({ block, data, customComponents }: BlockRendererProps): React.ReactElement | null {
  const { signals } = useLiquidContext();

  // Check signal condition - skip rendering if condition not met
  if (block.condition?.signal) {
    const currentValue = signals[block.condition.signal];
    const requiredValue = block.condition.signalValue;
    if (currentValue !== requiredValue) {
      return null; // Don't render - condition not met
    }
  }

  // Check for custom component first
  const CustomComponent = customComponents?.[block.type] ?? getComponent(block.type);

  if (CustomComponent) {
    return (
      <CustomComponent block={block} data={data}>
        {block.children?.map((child, i) => (
          <BlockRenderer
            key={child.uid || i}
            block={child}
            data={data}
            customComponents={customComponents}
          />
        ))}
      </CustomComponent>
    );
  }

  // Render children helper
  const renderChildren = () => (
    <>
      {block.children?.map((child, i) => (
        <BlockRenderer
          key={child.uid || i}
          block={child}
          data={data}
          customComponents={customComponents}
        />
      ))}
    </>
  );

  // Default rendering based on type using standalone components
  switch (block.type) {
    case 'container':
      return <Container block={block} data={data}>{renderChildren()}</Container>;
    case 'kpi':
      return <KPICard block={block} data={data} />;
    case 'line':
      return <LineChartComponent block={block} data={data} />;
    case 'bar':
      return <BarChartComponent block={block} data={data} />;
    case 'pie':
      return <PieChartComponent block={block} data={data} />;
    case 'card':
      return <Card block={block} data={data}>{renderChildren()}</Card>;
    case 'table':
      return <DataTable block={block} data={data} />;
    case 'text':
      return <Text block={block} data={data} />;
    case 'button':
      return <Button block={block} data={data} />;
    default:
      return <FallbackBlock block={block} data={data} customComponents={customComponents} />;
  }
}

// ============================================================================
// Fallback Component (for unknown block types)
// ============================================================================

function FallbackBlock({ block, data, customComponents }: BlockRendererProps): React.ReactElement {
  return (
    <div
      data-liquid-type={block.type}
      style={{
        padding: '0.5rem',
        border: '1px dashed #d1d5db',
        borderRadius: '0.25rem',
        fontSize: '0.75rem',
        color: '#6b7280',
      }}
    >
      <div>[{block.type}]</div>
      {block.label && <div>{block.label}</div>}
      {block.children?.map((child, i) => (
        <BlockRenderer
          key={child.uid || i}
          block={child}
          data={data}
          customComponents={customComponents}
        />
      ))}
    </div>
  );
}

