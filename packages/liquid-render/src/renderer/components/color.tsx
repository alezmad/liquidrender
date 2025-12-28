// Color Component - Color picker with swatch, presets, and hex input
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, inputStyles, mergeStyles, generateId } from './utils';
import { resolveBinding } from '../data-context';
import { useLiquidContext } from '../LiquidUI';

// ============================================================================
// Types
// ============================================================================

type ColorFormat = 'hex' | 'rgb' | 'hsl';

interface ColorPreset {
  value: string;
  label?: string;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: {
    position: 'relative' as const,
    display: 'inline-flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.xs,
  } as React.CSSProperties,

  label: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
  } as React.CSSProperties,

  triggerWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  } as React.CSSProperties,

  swatch: {
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: tokens.radius.md,
    border: `1px solid ${tokens.colors.border}`,
    cursor: 'pointer',
    transition: `box-shadow ${tokens.transition.fast}`,
    boxShadow: tokens.shadow.sm,
    outline: 'none',
  } as React.CSSProperties,

  swatchFocus: {
    boxShadow: `0 0 0 2px ${tokens.colors.background}, 0 0 0 4px ${tokens.colors.ring}`,
  } as React.CSSProperties,

  swatchCheckerboard: {
    backgroundImage: `
      linear-gradient(45deg, #ccc 25%, transparent 25%),
      linear-gradient(-45deg, #ccc 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #ccc 75%),
      linear-gradient(-45deg, transparent 75%, #ccc 75%)
    `,
    backgroundSize: '8px 8px',
    backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
  } as React.CSSProperties,

  swatchColor: {
    width: '100%',
    height: '100%',
    borderRadius: tokens.radius.md,
  } as React.CSSProperties,

  hexDisplay: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.mutedForeground,
    fontFamily: 'monospace',
  } as React.CSSProperties,

  popover: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    marginTop: tokens.spacing.xs,
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.card,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.lg,
    boxShadow: tokens.shadow.lg,
    zIndex: 50,
    minWidth: '14rem',
  } as React.CSSProperties,

  popoverHidden: {
    display: 'none',
  } as React.CSSProperties,

  section: {
    marginBottom: tokens.spacing.md,
  } as React.CSSProperties,

  sectionLabel: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.mutedForeground,
    marginBottom: tokens.spacing.sm,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as React.CSSProperties,

  nativeInputWrapper: {
    position: 'relative' as const,
    width: '100%',
    height: '2.5rem',
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
    border: `1px solid ${tokens.colors.border}`,
  } as React.CSSProperties,

  nativeInput: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '200%',
    height: '200%',
    transform: 'translate(-25%, -25%)',
    border: 'none',
    cursor: 'pointer',
    background: 'none',
  } as React.CSSProperties,

  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: tokens.spacing.xs,
  } as React.CSSProperties,

  presetSwatch: {
    width: '1.5rem',
    height: '1.5rem',
    borderRadius: tokens.radius.sm,
    border: `1px solid ${tokens.colors.border}`,
    cursor: 'pointer',
    transition: `transform ${tokens.transition.fast}, box-shadow ${tokens.transition.fast}`,
    outline: 'none',
  } as React.CSSProperties,

  presetSwatchHover: {
    transform: 'scale(1.1)',
  } as React.CSSProperties,

  presetSwatchActive: {
    boxShadow: `0 0 0 2px ${tokens.colors.background}, 0 0 0 4px ${tokens.colors.ring}`,
  } as React.CSSProperties,

  hexInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  } as React.CSSProperties,

  hexInput: mergeStyles(inputStyles(), {
    fontFamily: 'monospace',
    fontSize: tokens.fontSize.sm,
    flex: 1,
  }),

  hexPrefix: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.mutedForeground,
    fontFamily: 'monospace',
  } as React.CSSProperties,

  opacitySection: {
    marginTop: tokens.spacing.md,
  } as React.CSSProperties,

  opacitySlider: {
    width: '100%',
    height: '0.5rem',
    borderRadius: tokens.radius.full,
    appearance: 'none' as const,
    background: `linear-gradient(to right, transparent, currentColor)`,
    cursor: 'pointer',
    outline: 'none',
  } as React.CSSProperties,

  opacityValue: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
    textAlign: 'right' as const,
    marginTop: tokens.spacing.xs,
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

const defaultPresets: ColorPreset[] = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#84cc16', label: 'Lime' },
  { value: '#22c55e', label: 'Green' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#0ea5e9', label: 'Sky' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#a855f7', label: 'Purple' },
  { value: '#d946ef', label: 'Fuchsia' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#f43f5e', label: 'Rose' },
  { value: '#0a0a0a', label: 'Black' },
  { value: '#525252', label: 'Gray' },
  { value: '#a3a3a3', label: 'Light Gray' },
  { value: '#e5e5e5', label: 'Lighter Gray' },
  { value: '#fafafa', label: 'Near White' },
  { value: '#ffffff', label: 'White' },
  { value: 'transparent', label: 'Transparent' },
];

function isValidHex(value: string): boolean {
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value);
}

function normalizeHex(value: string): string {
  let hex = value.replace('#', '');

  // Convert 3-digit to 6-digit
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }

  return `#${hex.toLowerCase()}`;
}

function hexToRgba(hex: string): { r: number; g: number; b: number; a: number } {
  const normalized = normalizeHex(hex).replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const a = normalized.length === 8 ? parseInt(normalized.slice(6, 8), 16) / 255 : 1;

  return { r, g, b, a };
}

function rgbaToHex(r: number, g: number, b: number, a?: number): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  let hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

  if (a !== undefined && a < 1) {
    hex += toHex(a * 255);
  }

  return hex;
}

// ============================================================================
// Sub-components
// ============================================================================

interface ColorSwatchButtonProps {
  color: string;
  opacity?: number;
  onClick: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  focused?: boolean;
  ariaLabel?: string;
  ariaExpanded?: boolean;
  ariaControls?: string;
}

function ColorSwatchButton({
  color,
  opacity = 1,
  onClick,
  onKeyDown,
  focused = false,
  ariaLabel,
  ariaExpanded,
  ariaControls,
}: ColorSwatchButtonProps): React.ReactElement {
  const swatchStyle = mergeStyles(
    styles.swatch,
    styles.swatchCheckerboard,
    focused ? styles.swatchFocus : {}
  );

  const colorStyle: React.CSSProperties = {
    ...styles.swatchColor,
    backgroundColor: color === 'transparent' ? 'transparent' : color,
    opacity: color === 'transparent' ? 1 : opacity,
  };

  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      style={swatchStyle}
      aria-label={ariaLabel || `Select color: ${color}`}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-haspopup="dialog"
    >
      <div style={colorStyle} />
    </button>
  );
}

interface PresetSwatchProps {
  color: string;
  isActive: boolean;
  onClick: () => void;
  label?: string;
}

function PresetSwatch({ color, isActive, onClick, label }: PresetSwatchProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);

  const style = mergeStyles(
    styles.presetSwatch,
    { backgroundColor: color === 'transparent' ? 'transparent' : color },
    color === 'transparent' ? styles.swatchCheckerboard : {},
    isHovered ? styles.presetSwatchHover : {},
    isActive ? styles.presetSwatchActive : {}
  );

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={style}
      aria-label={label || color}
      aria-pressed={isActive}
    />
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Color({ block, data }: LiquidComponentProps): React.ReactElement {
  const { signalActions } = useLiquidContext();
  const colorId = generateId('color');
  const popoverId = `${colorId}-popover`;

  // Resolve binding to get initial color value
  const boundValue = resolveBinding(block.binding, data);
  const initialColor = typeof boundValue === 'string' && isValidHex(boundValue)
    ? normalizeHex(boundValue)
    : '#3b82f6';

  const [color, setColor] = useState(initialColor);
  const [opacity, setOpacity] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState(color.replace('#', ''));
  const [isFocused, setIsFocused] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const label = block.label;
  const showOpacity = block.props?.showOpacity !== false;
  const presets = (block.props?.presets as ColorPreset[] | undefined) || defaultPresets;
  const emitSignal = block.signals?.emit;

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Emit color change
  const emitChange = useCallback((newColor: string, newOpacity: number) => {
    if (emitSignal?.name) {
      const rgba = hexToRgba(newColor);
      const finalColor = newOpacity < 1
        ? rgbaToHex(rgba.r, rgba.g, rgba.b, newOpacity)
        : newColor;
      signalActions.emit(emitSignal.name, finalColor);
    }
  }, [emitSignal, signalActions]);

  const handleColorChange = useCallback((newColor: string) => {
    const normalized = normalizeHex(newColor);
    setColor(normalized);
    setHexInput(normalized.replace('#', ''));
    emitChange(normalized, opacity);
  }, [opacity, emitChange]);

  const handleNativeInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleColorChange(e.target.value);
  }, [handleColorChange]);

  const handleHexInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace('#', '');
    setHexInput(value);

    if (isValidHex(value)) {
      const normalized = normalizeHex(value);
      setColor(normalized);
      emitChange(normalized, opacity);
    }
  }, [opacity, emitChange]);

  const handleHexInputBlur = useCallback(() => {
    // Reset to current color if input is invalid
    if (!isValidHex(hexInput)) {
      setHexInput(color.replace('#', ''));
    }
  }, [hexInput, color]);

  const handleOpacityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacity = parseFloat(e.target.value);
    setOpacity(newOpacity);
    emitChange(color, newOpacity);
  }, [color, emitChange]);

  const handlePresetClick = useCallback((presetColor: string) => {
    if (presetColor === 'transparent') {
      setOpacity(0);
      emitChange(color, 0);
    } else {
      handleColorChange(presetColor);
    }
  }, [color, handleColorChange, emitChange]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleTriggerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleOpen();
    }
  }, [toggleOpen]);

  const popoverStyle = mergeStyles(
    styles.popover,
    !isOpen ? styles.popoverHidden : {}
  );

  const displayColor = opacity === 0 ? 'transparent' : color;

  return (
    <div
      data-liquid-type="color"
      ref={wrapperRef}
      style={styles.wrapper}
    >
      {label && (
        <label id={`${colorId}-label`} style={styles.label}>
          {label}
        </label>
      )}

      <div style={styles.triggerWrapper}>
        <ColorSwatchButton
          color={displayColor}
          opacity={opacity}
          onClick={toggleOpen}
          onKeyDown={handleTriggerKeyDown}
          focused={isFocused}
          ariaLabel={`Current color: ${displayColor}. Click to change.`}
          ariaExpanded={isOpen}
          ariaControls={popoverId}
        />
        <span style={styles.hexDisplay}>
          {opacity === 0 ? 'transparent' : color.toUpperCase()}
        </span>
      </div>

      <div
        id={popoverId}
        role="dialog"
        aria-modal="false"
        aria-label="Color picker"
        style={popoverStyle}
      >
        {/* Native color picker */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Color</div>
          <div style={styles.nativeInputWrapper}>
            <input
              type="color"
              value={color}
              onChange={handleNativeInputChange}
              style={styles.nativeInput}
              aria-label="Color picker"
            />
          </div>
        </div>

        {/* Preset colors */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Presets</div>
          <div style={styles.presetGrid}>
            {presets.map((preset) => (
              <PresetSwatch
                key={preset.value}
                color={preset.value}
                label={preset.label}
                isActive={color === preset.value || (preset.value === 'transparent' && opacity === 0)}
                onClick={() => handlePresetClick(preset.value)}
              />
            ))}
          </div>
        </div>

        {/* Hex input */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Hex</div>
          <div style={styles.hexInputWrapper}>
            <span style={styles.hexPrefix}>#</span>
            <input
              type="text"
              value={hexInput}
              onChange={handleHexInputChange}
              onBlur={handleHexInputBlur}
              onFocus={() => setIsFocused(true)}
              style={styles.hexInput}
              maxLength={8}
              placeholder="000000"
              aria-label="Hex color value"
            />
          </div>
        </div>

        {/* Opacity slider */}
        {showOpacity && (
          <div style={styles.opacitySection}>
            <div style={styles.sectionLabel}>Opacity</div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={opacity}
              onChange={handleOpacityChange}
              style={{ ...styles.opacitySlider, color }}
              aria-label="Opacity"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(opacity * 100)}
              aria-valuetext={`${Math.round(opacity * 100)}%`}
            />
            <div style={styles.opacityValue}>{Math.round(opacity * 100)}%</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Static Component
// ============================================================================

export interface StaticColorProps {
  value?: string;
  onChange?: (color: string) => void;
  label?: string;
  presets?: ColorPreset[];
  showOpacity?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function StaticColor({
  value = '#3b82f6',
  onChange,
  label,
  presets = defaultPresets,
  showOpacity = true,
  disabled = false,
  style: customStyle,
}: StaticColorProps): React.ReactElement {
  const colorId = generateId('color');
  const popoverId = `${colorId}-popover`;

  const initialColor = isValidHex(value) ? normalizeHex(value) : '#3b82f6';

  const [color, setColor] = useState(initialColor);
  const [opacity, setOpacity] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState(color.replace('#', ''));
  const [isFocused, setIsFocused] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync with external value
  useEffect(() => {
    if (value && isValidHex(value)) {
      const normalized = normalizeHex(value);
      setColor(normalized);
      setHexInput(normalized.replace('#', ''));
    }
  }, [value]);

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const emitChange = useCallback((newColor: string, newOpacity: number) => {
    if (onChange) {
      const rgba = hexToRgba(newColor);
      const finalColor = newOpacity < 1
        ? rgbaToHex(rgba.r, rgba.g, rgba.b, newOpacity)
        : newColor;
      onChange(finalColor);
    }
  }, [onChange]);

  const handleColorChange = useCallback((newColor: string) => {
    if (disabled) return;
    const normalized = normalizeHex(newColor);
    setColor(normalized);
    setHexInput(normalized.replace('#', ''));
    emitChange(normalized, opacity);
  }, [disabled, opacity, emitChange]);

  const handleNativeInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleColorChange(e.target.value);
  }, [handleColorChange]);

  const handleHexInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const inputValue = e.target.value.replace('#', '');
    setHexInput(inputValue);

    if (isValidHex(inputValue)) {
      const normalized = normalizeHex(inputValue);
      setColor(normalized);
      emitChange(normalized, opacity);
    }
  }, [disabled, opacity, emitChange]);

  const handleHexInputBlur = useCallback(() => {
    if (!isValidHex(hexInput)) {
      setHexInput(color.replace('#', ''));
    }
  }, [hexInput, color]);

  const handleOpacityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const newOpacity = parseFloat(e.target.value);
    setOpacity(newOpacity);
    emitChange(color, newOpacity);
  }, [disabled, color, emitChange]);

  const handlePresetClick = useCallback((presetColor: string) => {
    if (disabled) return;
    if (presetColor === 'transparent') {
      setOpacity(0);
      emitChange(color, 0);
    } else {
      handleColorChange(presetColor);
    }
  }, [disabled, color, handleColorChange, emitChange]);

  const toggleOpen = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled]);

  const handleTriggerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleOpen();
    }
  }, [toggleOpen]);

  const wrapperStyle = mergeStyles(
    styles.wrapper,
    disabled ? { opacity: 0.5, pointerEvents: 'none' as const } : {},
    customStyle
  );

  const popoverStyle = mergeStyles(
    styles.popover,
    !isOpen ? styles.popoverHidden : {}
  );

  const displayColor = opacity === 0 ? 'transparent' : color;

  return (
    <div ref={wrapperRef} style={wrapperStyle}>
      {label && (
        <label id={`${colorId}-label`} style={styles.label}>
          {label}
        </label>
      )}

      <div style={styles.triggerWrapper}>
        <ColorSwatchButton
          color={displayColor}
          opacity={opacity}
          onClick={toggleOpen}
          onKeyDown={handleTriggerKeyDown}
          focused={isFocused}
          ariaLabel={`Current color: ${displayColor}. Click to change.`}
          ariaExpanded={isOpen}
          ariaControls={popoverId}
        />
        <span style={styles.hexDisplay}>
          {opacity === 0 ? 'transparent' : color.toUpperCase()}
        </span>
      </div>

      <div
        id={popoverId}
        role="dialog"
        aria-modal="false"
        aria-label="Color picker"
        style={popoverStyle}
      >
        {/* Native color picker */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Color</div>
          <div style={styles.nativeInputWrapper}>
            <input
              type="color"
              value={color}
              onChange={handleNativeInputChange}
              style={styles.nativeInput}
              aria-label="Color picker"
              disabled={disabled}
            />
          </div>
        </div>

        {/* Preset colors */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Presets</div>
          <div style={styles.presetGrid}>
            {presets.map((preset) => (
              <PresetSwatch
                key={preset.value}
                color={preset.value}
                label={preset.label}
                isActive={color === preset.value || (preset.value === 'transparent' && opacity === 0)}
                onClick={() => handlePresetClick(preset.value)}
              />
            ))}
          </div>
        </div>

        {/* Hex input */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Hex</div>
          <div style={styles.hexInputWrapper}>
            <span style={styles.hexPrefix}>#</span>
            <input
              type="text"
              value={hexInput}
              onChange={handleHexInputChange}
              onBlur={handleHexInputBlur}
              onFocus={() => setIsFocused(true)}
              style={styles.hexInput}
              maxLength={8}
              placeholder="000000"
              aria-label="Hex color value"
              disabled={disabled}
            />
          </div>
        </div>

        {/* Opacity slider */}
        {showOpacity && (
          <div style={styles.opacitySection}>
            <div style={styles.sectionLabel}>Opacity</div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={opacity}
              onChange={handleOpacityChange}
              style={{ ...styles.opacitySlider, color }}
              aria-label="Opacity"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(opacity * 100)}
              aria-valuetext={`${Math.round(opacity * 100)}%`}
              disabled={disabled}
            />
            <div style={styles.opacityValue}>{Math.round(opacity * 100)}%</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Color;
