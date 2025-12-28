// Gauge Component - Semi-circular or full-circular gauge with animated arc
import React, { useMemo } from 'react';
import type { LiquidComponentProps } from './utils';
import {
  tokens,
  chartColors,
  mergeStyles,
  cardStyles,
  formatDisplayValue,
  fieldToLabel,
  isBrowser,
  clamp,
} from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

interface GaugeZone {
  min: number;
  max: number;
  color: string;
}

interface GaugeConfig {
  value: number;
  min: number;
  max: number;
  label?: string;
  unit?: string;
  zones?: GaugeZone[];
  variant?: 'semi' | 'full';
  showNeedle?: boolean;
}

export interface StaticGaugeProps {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  unit?: string;
  zones?: GaugeZone[];
  variant?: 'semi' | 'full';
  showNeedle?: boolean;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: mergeStyles(cardStyles(), {
    padding: tokens.spacing.md,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: tokens.spacing.sm,
    minHeight: '200px',
  }),

  header: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
    textAlign: 'center' as const,
  } as React.CSSProperties,

  svgContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  } as React.CSSProperties,

  centerValue: {
    fontSize: tokens.fontSize['2xl'],
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.foreground,
    textAlign: 'center' as const,
  } as React.CSSProperties,

  unit: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.normal,
    color: tokens.colors.mutedForeground,
    marginLeft: tokens.spacing.xs,
  } as React.CSSProperties,

  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '160px',
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    textAlign: 'center' as const,
  } as React.CSSProperties,

  minMaxLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
    marginTop: `-${tokens.spacing.sm}`,
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

const DEFAULT_ZONES: GaugeZone[] = [
  { min: 0, max: 33, color: tokens.colors.error },
  { min: 33, max: 66, color: tokens.colors.warning },
  { min: 66, max: 100, color: tokens.colors.success },
];

function normalizeValue(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

function extractGaugeConfig(
  rawValue: unknown,
  blockLabel?: string,
  defaultMin = 0,
  defaultMax = 100
): GaugeConfig {
  // Handle object with gauge properties
  if (typeof rawValue === 'object' && rawValue !== null && !Array.isArray(rawValue)) {
    const obj = rawValue as Record<string, unknown>;
    const value = normalizeValue(obj.value ?? obj.progress ?? obj.percentage ?? obj.percent) ?? 0;
    const min = normalizeValue(obj.min) ?? defaultMin;
    const max = normalizeValue(obj.max) ?? defaultMax;

    return {
      value: clamp(value, min, max),
      min,
      max,
      label: typeof obj.label === 'string' ? obj.label : blockLabel,
      unit: typeof obj.unit === 'string' ? obj.unit : undefined,
      zones: Array.isArray(obj.zones) ? (obj.zones as GaugeZone[]) : undefined,
      variant: obj.variant === 'full' ? 'full' : 'semi',
      showNeedle: typeof obj.showNeedle === 'boolean' ? obj.showNeedle : true,
    };
  }

  // Handle direct numeric value
  const value = normalizeValue(rawValue) ?? 0;
  return {
    value: clamp(value, defaultMin, defaultMax),
    min: defaultMin,
    max: defaultMax,
    label: blockLabel,
    variant: 'semi',
    showNeedle: true,
  };
}

function getColorForValue(value: number, min: number, max: number, zones?: GaugeZone[]): string {
  const percentage = ((value - min) / (max - min)) * 100;
  const effectiveZones = zones || DEFAULT_ZONES;

  for (const zone of effectiveZones) {
    if (percentage >= zone.min && percentage <= zone.max) {
      return zone.color;
    }
  }

  return chartColors[0] ?? tokens.colors.primary;
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    'M',
    start.x,
    start.y,
    'A',
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(' ');
}

// ============================================================================
// Sub-components
// ============================================================================

interface GaugeSVGProps {
  value: number;
  min: number;
  max: number;
  zones?: GaugeZone[];
  variant: 'semi' | 'full';
  showNeedle: boolean;
  size: number;
  animated?: boolean;
}

function GaugeSVG({
  value,
  min,
  max,
  zones,
  variant,
  showNeedle,
  size,
  animated = true,
}: GaugeSVGProps): React.ReactElement {
  const cx = size / 2;
  const cy = variant === 'semi' ? size * 0.6 : size / 2;
  const radius = size * 0.35;
  const strokeWidth = size * 0.08;
  const innerRadius = radius - strokeWidth / 2;

  // Angle calculations
  const startAngle = variant === 'semi' ? -180 : -225;
  const endAngle = variant === 'semi' ? 0 : 45;
  const totalAngle = endAngle - startAngle;

  // Value to angle conversion
  const percentage = clamp((value - min) / (max - min), 0, 1);
  const valueAngle = startAngle + percentage * totalAngle;

  // Colors
  const valueColor = getColorForValue(value, min, max, zones);
  const trackColor = tokens.colors.secondary;

  // Generate zone arcs if zones provided
  const effectiveZones = zones || DEFAULT_ZONES;
  const zoneArcs = effectiveZones.map((zone) => {
    const zoneStartPct = clamp((zone.min - 0) / 100, 0, 1);
    const zoneEndPct = clamp((zone.max - 0) / 100, 0, 1);
    const zoneStartAngle = startAngle + zoneStartPct * totalAngle;
    const zoneEndAngle = startAngle + zoneEndPct * totalAngle;
    return {
      path: describeArc(cx, cy, innerRadius, zoneStartAngle, zoneEndAngle),
      color: zone.color,
    };
  });

  // Value arc path
  const valueArcPath = describeArc(cx, cy, innerRadius, startAngle, valueAngle);

  // Needle calculations
  const needleLength = radius * 0.85;
  const needleEnd = polarToCartesian(cx, cy, needleLength, valueAngle);

  return (
    <svg
      width={size}
      height={variant === 'semi' ? size * 0.65 : size}
      viewBox={`0 0 ${size} ${variant === 'semi' ? size * 0.65 : size}`}
      aria-hidden="true"
    >
      {/* Background track */}
      <path
        d={describeArc(cx, cy, innerRadius, startAngle, endAngle)}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Zone indicators (subtle background) */}
      {zones &&
        zoneArcs.map((arc, i) => (
          <path
            key={`zone-${i}`}
            d={arc.path}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={0.2}
          />
        ))}

      {/* Value arc */}
      {percentage > 0 && (
        <path
          d={valueArcPath}
          fill="none"
          stroke={valueColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={
            animated
              ? {
                  transition: `stroke-dashoffset ${tokens.transition.slow}`,
                }
              : undefined
          }
        />
      )}

      {/* Needle */}
      {showNeedle && (
        <>
          {/* Needle line */}
          <line
            x1={cx}
            y1={cy}
            x2={needleEnd.x}
            y2={needleEnd.y}
            stroke={tokens.colors.foreground}
            strokeWidth={2}
            strokeLinecap="round"
            style={
              animated
                ? {
                    transition: `all ${tokens.transition.slow}`,
                    transformOrigin: `${cx}px ${cy}px`,
                  }
                : undefined
            }
          />
          {/* Needle center cap */}
          <circle cx={cx} cy={cy} r={size * 0.04} fill={tokens.colors.foreground} />
        </>
      )}

      {/* Min/Max tick marks */}
      <circle
        cx={polarToCartesian(cx, cy, innerRadius + strokeWidth, startAngle).x}
        cy={polarToCartesian(cx, cy, innerRadius + strokeWidth, startAngle).y}
        r={2}
        fill={tokens.colors.mutedForeground}
      />
      <circle
        cx={polarToCartesian(cx, cy, innerRadius + strokeWidth, endAngle).x}
        cy={polarToCartesian(cx, cy, innerRadius + strokeWidth, endAngle).y}
        r={2}
        fill={tokens.colors.mutedForeground}
      />
    </svg>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Gauge({ block, data }: LiquidComponentProps): React.ReactElement {
  const rawValue = resolveBinding(block.binding, data);
  // Extract field name from binding value for fallback label
  const bindingField = typeof block.binding?.value === 'string' ? block.binding.value : '';
  const blockLabel = block.label || fieldToLabel(bindingField);

  const config = useMemo(() => extractGaugeConfig(rawValue, blockLabel), [rawValue, blockLabel]);
  const { value, min, max, label, unit, zones, variant = 'semi', showNeedle = true } = config;

  const gaugeId = useMemo(
    () => `gauge-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  // SSR fallback
  if (!isBrowser) {
    return (
      <div
        data-liquid-type="gauge"
        style={styles.wrapper}
        role="meter"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={label || 'Gauge'}
      >
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.placeholder}>
          [Gauge: {formatDisplayValue(value)}
          {unit ? ` ${unit}` : ''}]
        </div>
      </div>
    );
  }

  // Handle null/undefined value
  if (rawValue === null || rawValue === undefined) {
    return (
      <div
        data-liquid-type="gauge"
        style={styles.wrapper}
        role="meter"
        aria-label={label ? `${label}: No data` : 'Gauge: No data'}
      >
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.placeholder}>No data available</div>
      </div>
    );
  }

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div
      data-liquid-type="gauge"
      style={styles.wrapper}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={`${formatDisplayValue(value)}${unit ? ` ${unit}` : ''} (${percentage.toFixed(0)}%)`}
      aria-labelledby={label ? `${gaugeId}-label` : undefined}
      tabIndex={0}
    >
      {label && (
        <div id={`${gaugeId}-label`} style={styles.header}>
          {label}
        </div>
      )}

      <div style={styles.svgContainer}>
        <GaugeSVG
          value={value}
          min={min}
          max={max}
          zones={zones}
          variant={variant}
          showNeedle={showNeedle}
          size={160}
        />
      </div>

      <div style={styles.centerValue}>
        {formatDisplayValue(value)}
        {unit && <span style={styles.unit}>{unit}</span>}
      </div>

      {variant === 'semi' && (
        <div style={styles.minMaxLabels}>
          <span>{formatDisplayValue(min)}</span>
          <span>{formatDisplayValue(max)}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

export function StaticGauge({
  value,
  min = 0,
  max = 100,
  label,
  unit,
  zones,
  variant = 'semi',
  showNeedle = true,
  size = 160,
  className,
  style: customStyle,
}: StaticGaugeProps): React.ReactElement {
  const clampedValue = clamp(value, min, max);
  const gaugeId = useMemo(
    () => `gauge-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  // SSR fallback
  if (!isBrowser) {
    return (
      <div
        data-liquid-type="gauge"
        style={mergeStyles(styles.wrapper, customStyle)}
        className={className}
        role="meter"
        aria-valuenow={clampedValue}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={label || 'Gauge'}
      >
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.placeholder}>
          [Gauge: {formatDisplayValue(clampedValue)}
          {unit ? ` ${unit}` : ''}]
        </div>
      </div>
    );
  }

  const percentage = ((clampedValue - min) / (max - min)) * 100;

  return (
    <div
      data-liquid-type="gauge"
      style={mergeStyles(styles.wrapper, customStyle)}
      className={className}
      role="meter"
      aria-valuenow={clampedValue}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={`${formatDisplayValue(clampedValue)}${unit ? ` ${unit}` : ''} (${percentage.toFixed(0)}%)`}
      aria-labelledby={label ? `${gaugeId}-label` : undefined}
      tabIndex={0}
    >
      {label && (
        <div id={`${gaugeId}-label`} style={styles.header}>
          {label}
        </div>
      )}

      <div style={styles.svgContainer}>
        <GaugeSVG
          value={clampedValue}
          min={min}
          max={max}
          zones={zones}
          variant={variant}
          showNeedle={showNeedle}
          size={size}
        />
      </div>

      <div style={styles.centerValue}>
        {formatDisplayValue(clampedValue)}
        {unit && <span style={styles.unit}>{unit}</span>}
      </div>

      {variant === 'semi' && (
        <div style={styles.minMaxLabels}>
          <span>{formatDisplayValue(min)}</span>
          <span>{formatDisplayValue(max)}</span>
        </div>
      )}
    </div>
  );
}

export default Gauge;
