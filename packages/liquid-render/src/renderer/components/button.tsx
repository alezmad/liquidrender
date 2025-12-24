// Button Component - Interactive buttons with signal emission
import React, { useCallback } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, buttonStyles, mergeStyles, getBlockColor } from './utils';

// Import context hook for signal management
import { useLiquidContext } from '../LiquidUI';

// ============================================================================
// Types
// ============================================================================

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

// ============================================================================
// Helpers
// ============================================================================

function getVariantFromColor(color?: string): ButtonVariant {
  if (!color) return 'default';

  switch (color) {
    case 'error':
    case 'destructive':
    case 'red':
      return 'destructive';
    case 'secondary':
    case 'gray':
      return 'secondary';
    case 'ghost':
    case 'transparent':
      return 'ghost';
    case 'outline':
      return 'outline';
    default:
      return 'default';
  }
}

function getSizeFromStyle(size?: string): ButtonSize {
  switch (size) {
    case 'sm':
    case 'small':
      return 'sm';
    case 'lg':
    case 'large':
      return 'lg';
    default:
      return 'md';
  }
}

// ============================================================================
// Styles
// ============================================================================

function getButtonStyles(
  variant: ButtonVariant,
  size: ButtonSize,
  isActive: boolean
): React.CSSProperties {
  const base = buttonStyles(variant, size);

  if (isActive) {
    return mergeStyles(base, {
      boxShadow: `inset 0 2px 4px rgba(0,0,0,0.1)`,
      transform: 'translateY(1px)',
    });
  }

  return base;
}

// ============================================================================
// Main Component
// ============================================================================

export function Button({ block, data, children }: LiquidComponentProps): React.ReactElement {
  const { signalActions, signals } = useLiquidContext();

  const label = block.label || 'Button';
  const action = block.action;
  const color = block.style?.color;
  const size = block.style?.size;

  // Determine variant and size
  const variant = getVariantFromColor(color);
  const buttonSize = getSizeFromStyle(size);

  // Signal emission config
  const emitSignal = block.signals?.emit;

  // Check if button is active (its emit value matches current signal state)
  const isActive = Boolean(
    emitSignal?.name &&
    signals[emitSignal.name] === emitSignal.value
  );

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Emit signal if configured
    if (emitSignal?.name) {
      signalActions.emit(emitSignal.name, emitSignal.value ?? 'true');
    }
  }, [emitSignal, signalActions]);

  const style = getButtonStyles(variant, buttonSize, isActive);

  return (
    <button
      data-liquid-type="button"
      data-action={action}
      data-active={isActive || undefined}
      onClick={handleClick}
      style={style}
    >
      {children || label}
    </button>
  );
}

// ============================================================================
// Static Button (no signal context required)
// ============================================================================

interface StaticButtonProps {
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export function StaticButton({
  label = 'Button',
  variant = 'default',
  size = 'md',
  onClick,
  disabled,
  style: customStyle,
  children,
}: StaticButtonProps): React.ReactElement {
  const style = mergeStyles(
    buttonStyles(variant, size),
    disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {},
    customStyle
  );

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={style}
    >
      {children || label}
    </button>
  );
}

export default Button;
