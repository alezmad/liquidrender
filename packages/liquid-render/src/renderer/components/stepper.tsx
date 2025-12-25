// Stepper Component - Multi-step progress indicator
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, mergeStyles, baseStyles } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

export interface Step {
  label: string;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  } as React.CSSProperties,

  step: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  } as React.CSSProperties,

  indicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2rem',
    height: '2rem',
    borderRadius: tokens.radius.full,
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    flexShrink: 0,
  } as React.CSSProperties,

  indicatorPending: {
    backgroundColor: tokens.colors.muted,
    color: tokens.colors.mutedForeground,
    border: `1px solid ${tokens.colors.border}`,
  } as React.CSSProperties,

  indicatorActive: {
    backgroundColor: tokens.colors.primary,
    color: tokens.colors.primaryForeground,
  } as React.CSSProperties,

  indicatorCompleted: {
    backgroundColor: tokens.colors.success,
    color: 'white',
  } as React.CSSProperties,

  label: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.foreground,
  } as React.CSSProperties,

  labelMuted: {
    color: tokens.colors.mutedForeground,
  } as React.CSSProperties,

  connector: {
    flex: 1,
    height: '2px',
    backgroundColor: tokens.colors.border,
    minWidth: '2rem',
  } as React.CSSProperties,

  connectorCompleted: {
    backgroundColor: tokens.colors.success,
  } as React.CSSProperties,
};

// ============================================================================
// Main Component
// ============================================================================

export function Stepper({ block, data }: LiquidComponentProps): React.ReactElement {
  // Get current step index from binding
  const currentStep = Number(resolveBinding(block.binding, data)) || 0;

  // Extract steps from children
  const steps: Step[] = (block.children || [])
    .filter(child => child.type === 'step')
    .map(child => ({
      label: child.label || '',
    }));

  return (
    <div data-liquid-type="stepper" data-orientation="horizontal" style={styles.container}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const isPending = index > currentStep;

        const indicatorStyle = mergeStyles(
          styles.indicator,
          isCompleted ? styles.indicatorCompleted :
          isActive ? styles.indicatorActive :
          styles.indicatorPending
        );

        const labelStyle = mergeStyles(
          styles.label,
          isPending ? styles.labelMuted : {}
        );

        return (
          <React.Fragment key={index}>
            <div style={styles.step}>
              <span style={indicatorStyle}>
                {isCompleted ? '✓' : index + 1}
              </span>
              <span style={labelStyle}>{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div style={mergeStyles(
                styles.connector,
                isCompleted ? styles.connectorCompleted : {}
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ============================================================================
// Static Stepper
// ============================================================================

export interface StaticStepperProps {
  steps: string[];
  currentStep: number;
  orientation?: 'horizontal' | 'vertical';
  style?: React.CSSProperties;
}

export function StaticStepper({
  steps,
  currentStep,
  orientation = 'horizontal',
  style: customStyle,
}: StaticStepperProps): React.ReactElement {
  const containerStyle = mergeStyles(
    baseStyles(),
    styles.container,
    orientation === 'vertical' ? { flexDirection: 'column' as const, alignItems: 'flex-start' } : {},
    customStyle
  );

  return (
    <div data-liquid-type="stepper" data-orientation={orientation} style={containerStyle}>
      {steps.map((label, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const isPending = index > currentStep;

        const indicatorStyle = mergeStyles(
          styles.indicator,
          isCompleted ? styles.indicatorCompleted :
          isActive ? styles.indicatorActive :
          styles.indicatorPending
        );

        const labelStyle = mergeStyles(
          styles.label,
          isPending ? styles.labelMuted : {}
        );

        return (
          <React.Fragment key={index}>
            <div style={styles.step}>
              <span style={indicatorStyle}>
                {isCompleted ? '✓' : index + 1}
              </span>
              <span style={labelStyle}>{label}</span>
            </div>
            {index < steps.length - 1 && (
              <div style={mergeStyles(
                styles.connector,
                isCompleted ? styles.connectorCompleted : {},
                orientation === 'vertical' ? { width: '2px', height: '1.5rem', minWidth: 0 } : {}
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default Stepper;
