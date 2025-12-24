// LiquidUI - Main renderer component
import React, { createContext, useContext, useState, useCallback, useMemo, type ReactElement } from 'react';
import type { LiquidSchema, Block, Layer } from '../compiler/ui-emitter';
import { resolveBinding, formatValue, type DataContext } from './data-context';
import { getComponent, type LiquidComponentProps } from './component-registry';
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

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
        {schema.layers.length > 0 && (
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

  // Default rendering based on type
  switch (block.type) {
    case 'container':
      return <ContainerBlock block={block} data={data} customComponents={customComponents} />;
    case 'kpi':
      return <KPIBlock block={block} data={data} />;
    case 'bar':
    case 'line':
    case 'pie':
      return <ChartBlock block={block} data={data} />;
    case 'card':
      return <CardBlock block={block} data={data} customComponents={customComponents} />;
    case 'table':
      return <TableBlock block={block} data={data} />;
    case 'text':
      return <TextBlock block={block} data={data} />;
    case 'button':
      return <ButtonBlock block={block} data={data} />;
    default:
      return <FallbackBlock block={block} data={data} customComponents={customComponents} />;
  }
}

// ============================================================================
// Built-in Components
// ============================================================================

function ContainerBlock({ block, data, customComponents }: BlockRendererProps): React.ReactElement {
  const style = getLayoutStyle(block);

  return (
    <div style={style} data-liquid-type="container">
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

// Helper: Convert field name to display label
function fieldToLabel(field: string): string {
  let result = field.replace(/_/g, ' ');
  result = result.replace(/([a-z])([A-Z])/g, '$1 $2');
  return result.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Helper: Check if value is numeric
function isNumeric(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

// Helper: Detect x/y fields from array data
function detectXYFields(data: Record<string, unknown>[]): { x: string; y: string } {
  if (data.length === 0) return { x: 'x', y: 'y' };

  const firstRow = data[0]!;
  const keys = Object.keys(firstRow);

  // Find first string-like field for x (category/date)
  const xField = keys.find(k => {
    const val = firstRow[k];
    return typeof val === 'string' || val instanceof Date;
  }) || keys[0] || 'x';

  // Find first numeric field for y (value)
  const yField = keys.find(k => {
    const val = firstRow[k];
    return isNumeric(val) && k !== xField;
  }) || keys[1] || 'y';

  return { x: xField, y: yField };
}

function KPIBlock({ block, data }: { block: Block; data: DataContext }): React.ReactElement {
  const value = resolveBinding(block.binding, data);
  const label = block.label || '';
  const color = block.style?.color;

  // IMPLICIT EXPANSION: If value is an object (not array), expand to multiple KPIs
  // This happens when binding to an object like `:summary`
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const numericFields = Object.entries(obj).filter(([_, v]) => isNumeric(v));

    if (numericFields.length > 0) {
      return (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }} data-liquid-type="kpi-group">
          {numericFields.map(([fieldName, fieldValue]) => (
            <div
              key={fieldName}
              data-liquid-type="kpi"
              style={{
                padding: '1rem',
                borderRadius: '0.5rem',
                backgroundColor: color ? `var(--color-${color}, #f3f4f6)` : '#f3f4f6',
                border: '1px solid #e5e7eb',
                flex: '1 1 150px',
              }}
            >
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                {fieldToLabel(fieldName)}
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 600, color: '#111827' }}>
                {formatValue(fieldValue)}
              </div>
            </div>
          ))}
        </div>
      );
    }
  }

  // Standard single KPI
  const formattedValue = formatValue(value);

  return (
    <div
      data-liquid-type="kpi"
      style={{
        padding: '1rem',
        borderRadius: '0.5rem',
        backgroundColor: color ? `var(--color-${color}, #f3f4f6)` : '#f3f4f6',
        border: '1px solid #e5e7eb',
      }}
    >
      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.875rem', fontWeight: 600, color: '#111827' }}>
        {formattedValue}
      </div>
    </div>
  );
}

// Default chart colors
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Check if running in browser (for SSR compatibility)
const isBrowser = typeof window !== 'undefined';

function ChartBlock({ block, data }: { block: Block; data: DataContext }): React.ReactElement {
  const chartData = resolveBinding(block.binding, data);
  const label = block.label || '';  // No default label - cleaner

  // Ensure we have valid array data
  const validData = Array.isArray(chartData) ? chartData as Record<string, unknown>[] : [];

  // IMPLICIT X/Y DETECTION: Use explicit bindings or auto-detect from data
  const explicitX = block.binding?.x;
  const explicitY = block.binding?.y;
  const detected = (!explicitX || !explicitY) ? detectXYFields(validData) : { x: '', y: '' };
  const xKey = explicitX || detected.x;
  const yKey = explicitY || detected.y;

  // SSR fallback - show placeholder during server render
  if (!isBrowser) {
    return (
      <div
        data-liquid-type={block.type}
        style={{
          padding: '1rem',
          borderRadius: '0.5rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          minHeight: '280px',
        }}
      >
        {label && (
          <div style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.5rem' }}>
            {label}
          </div>
        )}
        <div style={{ color: '#6b7280', fontSize: '0.875rem', padding: '2rem', textAlign: 'center' }}>
          [{block.type} chart • {validData.length} data points • x: {xKey}, y: {yKey}]
        </div>
      </div>
    );
  }

  return (
    <div
      data-liquid-type={block.type}
      style={{
        padding: '1rem',
        borderRadius: '0.5rem',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        minHeight: '280px',
      }}
    >
      {label && (
        <div style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.5rem' }}>
          {label}
        </div>
      )}
      {validData.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          {block.type === 'line' ? (
            <LineChart data={validData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey={yKey}
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          ) : block.type === 'bar' ? (
            <BarChart data={validData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip />
              <Legend />
              <Bar dataKey={yKey} fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : block.type === 'pie' ? (
            <PieChart>
              <Pie
                data={validData}
                dataKey={yKey}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {validData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          ) : (
            <div style={{ color: '#6b7280' }}>Unsupported chart type: {block.type}</div>
          )}
        </ResponsiveContainer>
      ) : (
        <div style={{ color: '#6b7280', fontSize: '0.875rem', padding: '2rem', textAlign: 'center' }}>
          No data available
        </div>
      )}
    </div>
  );
}

function TableBlock({ block, data }: { block: Block; data: DataContext }): React.ReactElement {
  const tableData = resolveBinding(block.binding, data);
  const label = block.label || '';  // No default label - cleaner
  const columns = block.columns || [];

  // If no columns specified, infer from first data row
  const inferredColumns = columns.length > 0 ? columns :
    (Array.isArray(tableData) && tableData[0] ? Object.keys(tableData[0]) : []);

  const validData = Array.isArray(tableData) ? tableData : [];

  // Convert column name to display label
  const columnToLabel = (col: string): string => {
    let result = col.replace(/_/g, ' ');
    result = result.replace(/([a-z])([A-Z])/g, '$1 $2');
    return result.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div
      data-liquid-type="table"
      style={{
        borderRadius: '0.5rem',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
      }}
    >
      {label && (
        <div style={{ padding: '0.75rem 1rem', fontWeight: 500, borderBottom: '1px solid #e5e7eb' }}>
          {label}
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              {inferredColumns.map((col, i) => (
                <th
                  key={i}
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontWeight: 500,
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  {columnToLabel(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {validData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                style={{ borderBottom: rowIndex < validData.length - 1 ? '1px solid #e5e7eb' : undefined }}
              >
                {inferredColumns.map((col, colIndex) => (
                  <td
                    key={colIndex}
                    style={{
                      padding: '0.75rem 1rem',
                      color: '#4b5563',
                    }}
                  >
                    {formatValue((row as Record<string, unknown>)[col])}
                  </td>
                ))}
              </tr>
            ))}
            {validData.length === 0 && (
              <tr>
                <td
                  colSpan={inferredColumns.length || 1}
                  style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}
                >
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CardBlock({ block, data, customComponents }: BlockRendererProps): React.ReactElement {
  const label = block.label || '';

  return (
    <div
      data-liquid-type="card"
      style={{
        padding: '1rem',
        borderRadius: '0.5rem',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      {label && (
        <div style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.75rem' }}>
          {label}
        </div>
      )}
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

function TextBlock({ block, data }: { block: Block; data: DataContext }): React.ReactElement {
  const value = resolveBinding(block.binding, data);
  const content = block.label || (typeof value === 'string' ? value : formatValue(value));

  return (
    <span data-liquid-type="text">
      {content}
    </span>
  );
}

function ButtonBlock({ block, data }: { block: Block; data: DataContext }): React.ReactElement {
  const { signalActions, signals } = useLiquidContext();
  const label = block.label || 'Button';
  const action = block.action;

  // Determine if this button emits a signal
  const emitSignal = block.signals?.emit;

  // Check if this button is "active" (its emit value matches current signal state)
  const isActive = emitSignal?.name && signals[emitSignal.name] === emitSignal.value;

  const handleClick = useCallback(() => {
    // Emit signal if configured
    if (emitSignal?.name) {
      signalActions.emit(emitSignal.name, emitSignal.value ?? 'true');
    }
  }, [emitSignal, signalActions]);

  return (
    <button
      data-liquid-type="button"
      data-action={action}
      data-active={isActive}
      onClick={handleClick}
      style={{
        padding: '0.5rem 1rem',
        borderRadius: '0.375rem',
        backgroundColor: isActive ? '#1d4ed8' : '#3b82f6',
        color: '#ffffff',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: 500,
        transition: 'background-color 0.15s ease',
      }}
    >
      {label}
    </button>
  );
}

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

// ============================================================================
// Style Helpers
// ============================================================================

function getLayoutStyle(block: Block): React.CSSProperties {
  const style: React.CSSProperties = {};

  if (block.layout) {
    // Flex direction from layout
    if (block.layout.flex) {
      style.display = 'flex';
      switch (block.layout.flex) {
        case 'row':
          style.flexDirection = 'row';
          break;
        case 'column':
          style.flexDirection = 'column';
          break;
        case 'grow':
          style.flex = 1;
          break;
      }
    }

    // Grid span
    if (block.layout.span) {
      style.gridColumn = `span ${block.layout.span}`;
    }
  }

  // Default gap for containers
  if (block.type === 'container' && block.children?.length) {
    style.gap = '1rem';
  }

  return style;
}
