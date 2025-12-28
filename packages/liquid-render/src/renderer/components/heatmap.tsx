// Heatmap Component - Grid of colored cells representing values
import React, { useMemo, useState, useCallback } from 'react';
import type { LiquidComponentProps } from './utils';
import {
  tokens,
  cardStyles,
  mergeStyles,
  isBrowser,
  fieldToLabel,
  formatDisplayValue,
} from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

interface HeatmapDataPoint {
  x: string | number;
  y: string | number;
  value: number;
}

interface HeatmapCell {
  x: string;
  y: string;
  value: number;
  normalizedValue: number;
}

type ColorScale = 'green' | 'blue' | 'red' | 'purple' | 'diverging';

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: {
    xLabel: string;
    yLabel: string;
    value: number;
  } | null;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: mergeStyles(cardStyles(), {
    padding: tokens.spacing.md,
    minHeight: '280px',
    outline: 'none',
  }),

  header: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.medium,
    marginBottom: tokens.spacing.sm,
    color: tokens.colors.foreground,
  } as React.CSSProperties,

  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.sm,
  } as React.CSSProperties,

  gridContainer: {
    display: 'flex',
    gap: tokens.spacing.xs,
  } as React.CSSProperties,

  yAxisLabels: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingTop: tokens.spacing.lg,
    paddingRight: tokens.spacing.sm,
    minWidth: '60px',
  } as React.CSSProperties,

  yLabel: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
    textAlign: 'right',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
  } as React.CSSProperties,

  grid: {
    display: 'grid',
    gap: '2px',
    flex: 1,
  } as React.CSSProperties,

  cell: {
    aspectRatio: '1',
    minWidth: '20px',
    minHeight: '20px',
    borderRadius: tokens.radius.sm,
    cursor: 'pointer',
    transition: `all ${tokens.transition.fast}`,
    border: '1px solid transparent',
  } as React.CSSProperties,

  cellHover: {
    border: `1px solid ${tokens.colors.foreground}`,
    transform: 'scale(1.05)',
    zIndex: 1,
  } as React.CSSProperties,

  xAxisLabels: {
    display: 'grid',
    gap: '2px',
    marginLeft: '68px',
  } as React.CSSProperties,

  xLabel: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    height: tokens.spacing.lg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,

  legendContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.sm,
  } as React.CSSProperties,

  legendGradient: {
    width: '120px',
    height: '12px',
    borderRadius: tokens.radius.sm,
    border: `1px solid ${tokens.colors.border}`,
  } as React.CSSProperties,

  legendLabel: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
  } as React.CSSProperties,

  tooltip: {
    position: 'fixed',
    backgroundColor: tokens.colors.card,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm,
    boxShadow: tokens.shadow.md,
    fontSize: tokens.fontSize.sm,
    zIndex: 1000,
    pointerEvents: 'none',
  } as React.CSSProperties,

  tooltipTitle: {
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
    marginBottom: tokens.spacing.xs,
  } as React.CSSProperties,

  tooltipValue: {
    color: tokens.colors.mutedForeground,
  } as React.CSSProperties,

  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '220px',
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    textAlign: 'center',
  } as React.CSSProperties,

  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Color scale definitions for heatmaps
 */
const colorScales: Record<ColorScale, { low: string; mid?: string; high: string }> = {
  green: { low: '#f0fdf4', high: '#15803d' },
  blue: { low: '#eff6ff', high: '#1d4ed8' },
  red: { low: '#fef2f2', high: '#b91c1c' },
  purple: { low: '#faf5ff', high: '#7c3aed' },
  diverging: { low: '#1d4ed8', mid: '#f5f5f5', high: '#b91c1c' },
};

/**
 * Interpolate between two colors
 */
function interpolateColor(color1: string, color2: string, factor: number): string {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');

  const r1 = parseInt(hex1.slice(0, 2), 16);
  const g1 = parseInt(hex1.slice(2, 4), 16);
  const b1 = parseInt(hex1.slice(4, 6), 16);

  const r2 = parseInt(hex2.slice(0, 2), 16);
  const g2 = parseInt(hex2.slice(2, 4), 16);
  const b2 = parseInt(hex2.slice(4, 6), 16);

  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Get color for a normalized value (0-1) using a color scale
 */
function getColorForValue(normalizedValue: number, scale: ColorScale): string {
  const colorDef = colorScales[scale];
  const clampedValue = Math.max(0, Math.min(1, normalizedValue));

  if (colorDef.mid) {
    // Diverging scale
    if (clampedValue < 0.5) {
      return interpolateColor(colorDef.low, colorDef.mid, clampedValue * 2);
    }
    return interpolateColor(colorDef.mid, colorDef.high, (clampedValue - 0.5) * 2);
  }

  return interpolateColor(colorDef.low, colorDef.high, clampedValue);
}

/**
 * Generate CSS gradient for legend
 */
function getLegendGradient(scale: ColorScale): string {
  const colorDef = colorScales[scale];
  if (colorDef.mid) {
    return `linear-gradient(to right, ${colorDef.low}, ${colorDef.mid}, ${colorDef.high})`;
  }
  return `linear-gradient(to right, ${colorDef.low}, ${colorDef.high})`;
}

/**
 * Convert 2D array to heatmap data points
 */
function normalize2DArray(
  data: number[][],
  xLabels?: string[],
  yLabels?: string[]
): HeatmapDataPoint[] {
  const points: HeatmapDataPoint[] = [];

  data.forEach((row, yIndex) => {
    row.forEach((value, xIndex) => {
      points.push({
        x: xLabels?.[xIndex] ?? String(xIndex),
        y: yLabels?.[yIndex] ?? String(yIndex),
        value,
      });
    });
  });

  return points;
}

/**
 * Process raw data into heatmap cells with normalized values
 */
function processHeatmapData(
  rawData: unknown,
  xLabels?: string[],
  yLabels?: string[]
): { cells: HeatmapCell[]; xAxis: string[]; yAxis: string[]; minValue: number; maxValue: number } {
  let dataPoints: HeatmapDataPoint[] = [];

  // Handle 2D array format
  if (
    Array.isArray(rawData) &&
    rawData.length > 0 &&
    Array.isArray(rawData[0]) &&
    typeof rawData[0][0] === 'number'
  ) {
    dataPoints = normalize2DArray(rawData as number[][], xLabels, yLabels);
  }
  // Handle array of {x, y, value} objects
  else if (Array.isArray(rawData)) {
    dataPoints = (rawData as HeatmapDataPoint[]).filter(
      (d) => d && typeof d.value === 'number' && d.x !== undefined && d.y !== undefined
    );
  }

  if (dataPoints.length === 0) {
    return { cells: [], xAxis: [], yAxis: [], minValue: 0, maxValue: 0 };
  }

  // Extract unique x and y values
  const xSet = new Set<string>();
  const ySet = new Set<string>();

  dataPoints.forEach((d) => {
    xSet.add(String(d.x));
    ySet.add(String(d.y));
  });

  const xAxis = Array.from(xSet);
  const yAxis = Array.from(ySet);

  // Calculate min/max values
  const values = dataPoints.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  // Create cell map for quick lookup
  const cellMap = new Map<string, number>();
  dataPoints.forEach((d) => {
    cellMap.set(`${d.x}-${d.y}`, d.value);
  });

  // Generate cells for grid
  const cells: HeatmapCell[] = [];
  yAxis.forEach((y) => {
    xAxis.forEach((x) => {
      const value = cellMap.get(`${x}-${y}`) ?? 0;
      cells.push({
        x,
        y,
        value,
        normalizedValue: (value - minValue) / range,
      });
    });
  });

  return { cells, xAxis, yAxis, minValue, maxValue };
}

/**
 * Generate accessibility description
 */
function generateHeatmapDescription(
  xAxis: string[],
  yAxis: string[],
  minValue: number,
  maxValue: number,
  label?: string
): string {
  const baseDesc = label ? `${label}: ` : '';
  const rows = yAxis.length;
  const cols = xAxis.length;

  if (rows === 0 || cols === 0) {
    return `${baseDesc}Empty heatmap - no data available`;
  }

  return `${baseDesc}Heatmap with ${rows} rows and ${cols} columns. Values range from ${formatDisplayValue(minValue)} to ${formatDisplayValue(maxValue)}`;
}

// ============================================================================
// Sub-components
// ============================================================================

interface HeatmapCellProps {
  cell: HeatmapCell;
  colorScale: ColorScale;
  onHover: (cell: HeatmapCell, event: React.MouseEvent) => void;
  onLeave: () => void;
}

function HeatmapCellComponent({
  cell,
  colorScale,
  onHover,
  onLeave,
}: HeatmapCellProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = (e: React.MouseEvent) => {
    setIsHovered(true);
    onHover(cell, e);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onLeave();
  };

  const cellStyle = mergeStyles(
    styles.cell,
    {
      backgroundColor: getColorForValue(cell.normalizedValue, colorScale),
    },
    isHovered ? styles.cellHover : undefined
  );

  return (
    <div
      style={cellStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="gridcell"
      aria-label={`${cell.x}, ${cell.y}: ${formatDisplayValue(cell.value)}`}
    />
  );
}

interface HeatmapTooltipProps {
  tooltip: TooltipState;
}

function HeatmapTooltip({ tooltip }: HeatmapTooltipProps): React.ReactElement | null {
  if (!tooltip.visible || !tooltip.content) {
    return null;
  }

  return (
    <div
      style={{
        ...styles.tooltip,
        left: tooltip.x + 12,
        top: tooltip.y + 12,
      }}
    >
      <div style={styles.tooltipTitle}>
        {tooltip.content.xLabel} / {tooltip.content.yLabel}
      </div>
      <div style={styles.tooltipValue}>Value: {formatDisplayValue(tooltip.content.value)}</div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Heatmap({ block, data: context }: LiquidComponentProps): React.ReactElement {
  const rawData = resolveBinding(block.binding, context);
  const label = block.label;
  const props = block.props ?? {};
  const colorScale: ColorScale =
    (block.style?.color as ColorScale) ||
    (props.colorScale as ColorScale) ||
    'green';
  const xLabels = props.xLabels as string[] | undefined;
  const yLabels = props.yLabels as string[] | undefined;

  const chartId = useMemo(
    () => `heatmap-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: null,
  });

  const { cells, xAxis, yAxis, minValue, maxValue } = useMemo(
    () => processHeatmapData(rawData, xLabels, yLabels),
    [rawData, xLabels, yLabels]
  );

  const chartDescription = useMemo(
    () => generateHeatmapDescription(xAxis, yAxis, minValue, maxValue, label),
    [xAxis, yAxis, minValue, maxValue, label]
  );

  const handleCellHover = useCallback((cell: HeatmapCell, event: React.MouseEvent) => {
    setTooltip({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      content: {
        xLabel: cell.x,
        yLabel: cell.y,
        value: cell.value,
      },
    });
  }, []);

  const handleCellLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  // SSR fallback
  if (!isBrowser) {
    return (
      <div
        data-liquid-type="heatmap"
        style={styles.wrapper}
        role="img"
        aria-label={chartDescription}
      >
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.placeholder}>
          [Heatmap - {yAxis.length} x {xAxis.length} grid]
        </div>
      </div>
    );
  }

  // Empty state
  if (cells.length === 0) {
    return (
      <div
        data-liquid-type="heatmap"
        style={styles.wrapper}
        role="img"
        aria-label={`${label ? label + ': ' : ''}Empty heatmap - no data available`}
      >
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.placeholder}>No data available</div>
      </div>
    );
  }

  return (
    <div
      data-liquid-type="heatmap"
      style={styles.wrapper}
      role="img"
      aria-label={chartDescription}
      tabIndex={0}
      aria-describedby={`${chartId}-desc`}
    >
      {label && (
        <div id={`${chartId}-title`} style={styles.header}>
          {label}
        </div>
      )}

      {/* Screen reader accessible data table */}
      <table id={`${chartId}-desc`} style={styles.srOnly}>
        <caption>{chartDescription}</caption>
        <thead>
          <tr>
            <th scope="col">Y / X</th>
            {xAxis.map((x) => (
              <th key={x} scope="col">
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {yAxis.map((y, yIdx) => (
            <tr key={y}>
              <th scope="row">{y}</th>
              {xAxis.map((x, xIdx) => {
                const cell = cells[yIdx * xAxis.length + xIdx];
                return <td key={x}>{cell ? formatDisplayValue(cell.value) : '-'}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={styles.container}>
        <div style={styles.gridContainer}>
          {/* Y-axis labels */}
          <div style={styles.yAxisLabels}>
            {yAxis.map((y) => (
              <div key={y} style={styles.yLabel} title={y}>
                {y}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div
            style={{
              ...styles.grid,
              gridTemplateColumns: `repeat(${xAxis.length}, 1fr)`,
              gridTemplateRows: `repeat(${yAxis.length}, 1fr)`,
            }}
            role="grid"
            aria-label="Heatmap grid"
          >
            {cells.map((cell, idx) => (
              <HeatmapCellComponent
                key={`${cell.x}-${cell.y}-${idx}`}
                cell={cell}
                colorScale={colorScale}
                onHover={handleCellHover}
                onLeave={handleCellLeave}
              />
            ))}
          </div>
        </div>

        {/* X-axis labels */}
        <div
          style={{
            ...styles.xAxisLabels,
            gridTemplateColumns: `repeat(${xAxis.length}, 1fr)`,
          }}
        >
          {xAxis.map((x) => (
            <div key={x} style={styles.xLabel} title={x}>
              {x}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={styles.legendContainer}>
          <span style={styles.legendLabel}>{formatDisplayValue(minValue)}</span>
          <div
            style={{
              ...styles.legendGradient,
              background: getLegendGradient(colorScale),
            }}
            role="img"
            aria-label={`Color scale from ${formatDisplayValue(minValue)} to ${formatDisplayValue(maxValue)}`}
          />
          <span style={styles.legendLabel}>{formatDisplayValue(maxValue)}</span>
        </div>
      </div>

      {/* Tooltip */}
      <HeatmapTooltip tooltip={tooltip} />
    </div>
  );
}

// ============================================================================
// Static Component
// ============================================================================

interface StaticHeatmapProps {
  /** 2D array of values or array of {x, y, value} objects */
  data: number[][] | HeatmapDataPoint[];
  /** Labels for x-axis (optional, auto-generated if not provided) */
  xLabels?: string[];
  /** Labels for y-axis (optional, auto-generated if not provided) */
  yLabels?: string[];
  /** Title displayed above the heatmap */
  title?: string;
  /** Color scale to use */
  colorScale?: ColorScale;
  /** Show legend below the heatmap */
  showLegend?: boolean;
  /** Custom styles for the wrapper */
  style?: React.CSSProperties;
}

export function StaticHeatmap({
  data,
  xLabels,
  yLabels,
  title,
  colorScale = 'green',
  showLegend = true,
  style: customStyle,
}: StaticHeatmapProps): React.ReactElement {
  const chartId = useMemo(
    () => `heatmap-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: null,
  });

  const { cells, xAxis, yAxis, minValue, maxValue } = useMemo(
    () => processHeatmapData(data, xLabels, yLabels),
    [data, xLabels, yLabels]
  );

  const chartDescription = useMemo(
    () => generateHeatmapDescription(xAxis, yAxis, minValue, maxValue, title),
    [xAxis, yAxis, minValue, maxValue, title]
  );

  const handleCellHover = useCallback((cell: HeatmapCell, event: React.MouseEvent) => {
    setTooltip({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      content: {
        xLabel: cell.x,
        yLabel: cell.y,
        value: cell.value,
      },
    });
  }, []);

  const handleCellLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  // SSR fallback
  if (!isBrowser) {
    return (
      <div
        data-liquid-type="heatmap"
        style={mergeStyles(styles.wrapper, customStyle)}
        role="img"
        aria-label={chartDescription}
      >
        {title && <div style={styles.header}>{title}</div>}
        <div style={styles.placeholder}>
          [Heatmap - {yAxis.length} x {xAxis.length} grid]
        </div>
      </div>
    );
  }

  // Empty state
  if (cells.length === 0) {
    return (
      <div
        data-liquid-type="heatmap"
        style={mergeStyles(styles.wrapper, customStyle)}
        role="img"
        aria-label={`${title ? title + ': ' : ''}Empty heatmap - no data available`}
      >
        {title && <div style={styles.header}>{title}</div>}
        <div style={styles.placeholder}>No data available</div>
      </div>
    );
  }

  return (
    <div
      data-liquid-type="heatmap"
      style={mergeStyles(styles.wrapper, customStyle)}
      role="img"
      aria-label={chartDescription}
      tabIndex={0}
      aria-describedby={`${chartId}-desc`}
    >
      {title && (
        <div id={`${chartId}-title`} style={styles.header}>
          {title}
        </div>
      )}

      {/* Screen reader accessible data table */}
      <table id={`${chartId}-desc`} style={styles.srOnly}>
        <caption>{chartDescription}</caption>
        <thead>
          <tr>
            <th scope="col">Y / X</th>
            {xAxis.map((x) => (
              <th key={x} scope="col">
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {yAxis.map((y, yIdx) => (
            <tr key={y}>
              <th scope="row">{y}</th>
              {xAxis.map((x, xIdx) => {
                const cell = cells[yIdx * xAxis.length + xIdx];
                return <td key={x}>{cell ? formatDisplayValue(cell.value) : '-'}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={styles.container}>
        <div style={styles.gridContainer}>
          {/* Y-axis labels */}
          <div style={styles.yAxisLabels}>
            {yAxis.map((y) => (
              <div key={y} style={styles.yLabel} title={y}>
                {y}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div
            style={{
              ...styles.grid,
              gridTemplateColumns: `repeat(${xAxis.length}, 1fr)`,
              gridTemplateRows: `repeat(${yAxis.length}, 1fr)`,
            }}
            role="grid"
            aria-label="Heatmap grid"
          >
            {cells.map((cell, idx) => (
              <HeatmapCellComponent
                key={`${cell.x}-${cell.y}-${idx}`}
                cell={cell}
                colorScale={colorScale}
                onHover={handleCellHover}
                onLeave={handleCellLeave}
              />
            ))}
          </div>
        </div>

        {/* X-axis labels */}
        <div
          style={{
            ...styles.xAxisLabels,
            gridTemplateColumns: `repeat(${xAxis.length}, 1fr)`,
          }}
        >
          {xAxis.map((x) => (
            <div key={x} style={styles.xLabel} title={x}>
              {x}
            </div>
          ))}
        </div>

        {/* Legend */}
        {showLegend && (
          <div style={styles.legendContainer}>
            <span style={styles.legendLabel}>{formatDisplayValue(minValue)}</span>
            <div
              style={{
                ...styles.legendGradient,
                background: getLegendGradient(colorScale),
              }}
              role="img"
              aria-label={`Color scale from ${formatDisplayValue(minValue)} to ${formatDisplayValue(maxValue)}`}
            />
            <span style={styles.legendLabel}>{formatDisplayValue(maxValue)}</span>
          </div>
        )}
      </div>

      {/* Tooltip */}
      <HeatmapTooltip tooltip={tooltip} />
    </div>
  );
}

export default Heatmap;
