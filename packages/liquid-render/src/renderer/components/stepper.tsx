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
    listStyle: 'none',
    margin: 0,
    padding: 0,
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

  // Helper to get step status for screen readers
  const getStepStatus = (index: number): string => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'current';
    return 'pending';
  };

  return (
    <ol
      data-liquid-type="stepper"
      data-orientation="horizontal"
      style={styles.container}
      aria-label="Progress steps"
    >
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

        const stepStatus = getStepStatus(index);

        return (
          <li
            key={index}
            style={styles.step}
            aria-current={isActive ? 'step' : undefined}
            aria-label={`Step ${index + 1}: ${step.label}, ${stepStatus}`}
          >
            <span
              style={indicatorStyle}
              aria-hidden="true"
            >
              {isCompleted ? '✓' : index + 1}
            </span>
            <span style={labelStyle}>{step.label}</span>
            {index < steps.length - 1 && (
              <span
                style={mergeStyles(
                  styles.connector,
                  isCompleted ? styles.connectorCompleted : {}
                )}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
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

  // Helper to get step status for screen readers
  const getStepStatus = (index: number): string => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'current';
    return 'pending';
  };

  return (
    <ol
      data-liquid-type="stepper"
      data-orientation={orientation}
      style={containerStyle}
      aria-label="Progress steps"
    >
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

        const stepStatus = getStepStatus(index);

        return (
          <li
            key={index}
            style={styles.step}
            aria-current={isActive ? 'step' : undefined}
            aria-label={`Step ${index + 1}: ${label}, ${stepStatus}`}
          >
            <span
              style={indicatorStyle}
              aria-hidden="true"
            >
              {isCompleted ? '✓' : index + 1}
            </span>
            <span style={labelStyle}>{label}</span>
            {index < steps.length - 1 && (
              <span
                style={mergeStyles(
                  styles.connector,
                  isCompleted ? styles.connectorCompleted : {},
                  orientation === 'vertical' ? { width: '2px', height: '1.5rem', minWidth: 0 } : {}
                )}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default Stepper;
