// Rating Component - Star rating display with interactive selection
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, mergeStyles, getBlockColor, clamp } from './utils';
import { resolveBinding } from '../data-context';

// Import context hook for signal management
import { useLiquidContext } from '../LiquidUI';

// ============================================================================
// Types
// ============================================================================

type IconType = 'star' | 'heart' | 'circle' | 'thumb';

interface RatingValue {
  value: number;
  max?: number;
}

export interface StaticRatingProps {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  allowHalf?: boolean;
  icon?: IconType;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

// ============================================================================
// Styles
// ============================================================================

const sizeMap = {
  sm: '16px',
  md: '24px',
  lg: '32px',
};

const gapMap = {
  sm: tokens.spacing.xs,
  md: tokens.spacing.xs,
  lg: tokens.spacing.sm,
};

const styles = {
  wrapper: {
    display: 'inline-flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.xs,
  } as React.CSSProperties,

  container: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  } as React.CSSProperties,

  iconsWrapper: (size: 'sm' | 'md' | 'lg') => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: gapMap[size],
  }) as React.CSSProperties,

  iconButton: (interactive: boolean) => ({
    padding: 0,
    margin: 0,
    border: 'none',
    background: 'none',
    cursor: interactive ? 'pointer' : 'default',
    outline: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `transform ${tokens.transition.fast}`,
  }) as React.CSSProperties,

  iconButtonHover: {
    transform: 'scale(1.1)',
  } as React.CSSProperties,

  iconButtonFocus: {
    outline: `2px solid ${tokens.colors.ring}`,
    outlineOffset: '2px',
    borderRadius: tokens.radius.sm,
  } as React.CSSProperties,

  label: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
  } as React.CSSProperties,

  valueText: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.mutedForeground,
    marginLeft: tokens.spacing.xs,
  } as React.CSSProperties,
};

// ============================================================================
// SVG Icons
// ============================================================================

const defaultFilledColor = '#fbbf24'; // amber-400
const defaultEmptyColor = 'var(--muted, #e5e5e5)';

interface IconProps {
  filled: number; // 0 = empty, 0.5 = half, 1 = full
  size: string;
  filledColor: string;
  emptyColor: string;
}

function StarIcon({ filled, size, filledColor, emptyColor }: IconProps): React.ReactElement {
  const id = `star-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {filled > 0 && filled < 1 && (
        <defs>
          <linearGradient id={id}>
            <stop offset={`${filled * 100}%`} stopColor={filledColor} />
            <stop offset={`${filled * 100}%`} stopColor={emptyColor} />
          </linearGradient>
        </defs>
      )}
      <path
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        fill={filled === 1 ? filledColor : filled === 0 ? emptyColor : `url(#${id})`}
        stroke={filled > 0 ? filledColor : emptyColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartIcon({ filled, size, filledColor, emptyColor }: IconProps): React.ReactElement {
  const id = `heart-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {filled > 0 && filled < 1 && (
        <defs>
          <linearGradient id={id}>
            <stop offset={`${filled * 100}%`} stopColor={filledColor} />
            <stop offset={`${filled * 100}%`} stopColor={emptyColor} />
          </linearGradient>
        </defs>
      )}
      <path
        d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.57831 8.50903 2.99871 7.05 2.99871C5.59096 2.99871 4.19169 3.57831 3.16 4.61C2.1283 5.64169 1.54871 7.04097 1.54871 8.5C1.54871 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7563 11.2728 22.0329 10.6054C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.0621 22.0329 6.39464C21.7563 5.72718 21.351 5.12075 20.84 4.61Z"
        fill={filled === 1 ? filledColor : filled === 0 ? emptyColor : `url(#${id})`}
        stroke={filled > 0 ? filledColor : emptyColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CircleIcon({ filled, size, filledColor, emptyColor }: IconProps): React.ReactElement {
  const id = `circle-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {filled > 0 && filled < 1 && (
        <defs>
          <linearGradient id={id}>
            <stop offset={`${filled * 100}%`} stopColor={filledColor} />
            <stop offset={`${filled * 100}%`} stopColor={emptyColor} />
          </linearGradient>
        </defs>
      )}
      <circle
        cx="12"
        cy="12"
        r="10"
        fill={filled === 1 ? filledColor : filled === 0 ? emptyColor : `url(#${id})`}
        stroke={filled > 0 ? filledColor : emptyColor}
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ThumbIcon({ filled, size, filledColor, emptyColor }: IconProps): React.ReactElement {
  const id = `thumb-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {filled > 0 && filled < 1 && (
        <defs>
          <linearGradient id={id}>
            <stop offset={`${filled * 100}%`} stopColor={filledColor} />
            <stop offset={`${filled * 100}%`} stopColor={emptyColor} />
          </linearGradient>
        </defs>
      )}
      <path
        d="M7 22H4C3.46957 22 2.96086 21.7893 2.58579 21.4142C2.21071 21.0391 2 20.5304 2 20V13C2 12.4696 2.21071 11.9609 2.58579 11.5858C2.96086 11.2107 3.46957 11 4 11H7M14 9V5C14 4.20435 13.6839 3.44129 13.1213 2.87868C12.5587 2.31607 11.7956 2 11 2L7 11V22H18.28C18.7623 22.0055 19.2304 21.8364 19.5979 21.524C19.9654 21.2116 20.2077 20.7769 20.28 20.3L21.66 11.3C21.7035 11.0134 21.6842 10.7207 21.6033 10.4423C21.5225 10.1638 21.3821 9.90629 21.1919 9.68751C21.0016 9.46873 20.7661 9.29393 20.5016 9.17522C20.2371 9.0565 19.9499 8.99672 19.66 9H14Z"
        fill={filled === 1 ? filledColor : filled === 0 ? emptyColor : `url(#${id})`}
        stroke={filled > 0 ? filledColor : emptyColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const iconComponents: Record<IconType, React.FC<IconProps>> = {
  star: StarIcon,
  heart: HeartIcon,
  circle: CircleIcon,
  thumb: ThumbIcon,
};

// ============================================================================
// Helpers
// ============================================================================

function extractRatingValue(value: unknown): RatingValue {
  if (value === null || value === undefined) {
    return { value: 0 };
  }

  // Direct number
  if (typeof value === 'number') {
    return { value: clamp(value, 0, 100) }; // Support up to 100 for percentage-style
  }

  // String number
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      return { value: clamp(parsed, 0, 100) };
    }
  }

  // Object with value/rating properties
  if (typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const ratingValue = obj.rating ?? obj.value ?? obj.score ?? 0;
    const max = obj.max ?? obj.total ?? obj.outOf;

    return {
      value: typeof ratingValue === 'number' ? ratingValue : 0,
      max: typeof max === 'number' ? max : undefined,
    };
  }

  return { value: 0 };
}

function getFillAmount(index: number, value: number, allowHalf: boolean): number {
  const difference = value - index;

  if (difference >= 1) {
    return 1; // Fully filled
  }

  if (difference <= 0) {
    return 0; // Empty
  }

  // Partially filled
  if (allowHalf) {
    return difference >= 0.5 ? 0.5 : 0;
  }

  return difference >= 0.5 ? 1 : 0;
}

// ============================================================================
// Sub-components
// ============================================================================

interface RatingIconProps {
  index: number;
  value: number;
  max: number;
  hoverValue: number | null;
  allowHalf: boolean;
  icon: IconType;
  size: 'sm' | 'md' | 'lg';
  filledColor: string;
  emptyColor: string;
  interactive: boolean;
  isFocused: boolean;
  onClick: (value: number) => void;
  onHover: (value: number | null) => void;
  onFocus: (index: number) => void;
}

function RatingIcon({
  index,
  value,
  max,
  hoverValue,
  allowHalf,
  icon,
  size,
  filledColor,
  emptyColor,
  interactive,
  isFocused,
  onClick,
  onHover,
  onFocus,
}: RatingIconProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);
  const displayValue = hoverValue !== null ? hoverValue : value;
  const fillAmount = getFillAmount(index, displayValue, allowHalf);

  const IconComponent = iconComponents[icon];
  const iconSize = sizeMap[size];

  // Determine if this radio option is currently selected
  const ratingForThisIcon = index + 1;
  const isSelected = Math.ceil(value) === ratingForThisIcon ||
    (allowHalf && (value === index + 0.5 || value === index + 1));

  const handleHalfClick = useCallback((e: React.MouseEvent) => {
    if (interactive && allowHalf) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const isLeftHalf = x < rect.width / 2;
      onClick(index + (isLeftHalf ? 0.5 : 1));
    } else if (interactive) {
      onClick(index + 1);
    }
  }, [interactive, allowHalf, index, onClick]);

  const handleMouseEnter = useCallback(() => {
    if (interactive) {
      setIsHovered(true);
      onHover(index + 1);
    }
  }, [interactive, index, onHover]);

  const handleMouseLeave = useCallback(() => {
    if (interactive) {
      setIsHovered(false);
      onHover(null);
    }
  }, [interactive, onHover]);

  const handleFocus = useCallback(() => {
    onFocus(index);
  }, [index, onFocus]);

  const buttonStyle = mergeStyles(
    styles.iconButton(interactive),
    isHovered ? styles.iconButtonHover : {},
    isFocused ? styles.iconButtonFocus : {}
  );

  return (
    <button
      type="button"
      role="radio"
      style={buttonStyle}
      onClick={handleHalfClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      disabled={!interactive}
      aria-checked={isSelected}
      aria-label={`${ratingForThisIcon} of ${max} stars`}
      tabIndex={interactive && isFocused ? 0 : -1}
    >
      <IconComponent
        filled={fillAmount}
        size={iconSize}
        filledColor={filledColor}
        emptyColor={emptyColor}
      />
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Rating({ block, data }: LiquidComponentProps): React.ReactElement {
  const { signalActions } = useLiquidContext();
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resolve the binding to get the current value
  const rawValue = resolveBinding(block.binding, data);
  const { value: ratingValue, max: dataMax } = extractRatingValue(rawValue);

  // Get configuration from block
  const label = block.label;
  const color = getBlockColor(block);
  const max = (block as unknown as { max?: number }).max ?? dataMax ?? 5;
  const readOnly = (block as unknown as { readOnly?: boolean }).readOnly ?? false;
  const allowHalf = (block as unknown as { allowHalf?: boolean }).allowHalf ?? false;
  const icon = ((block as unknown as { icon?: IconType }).icon ?? 'star') as IconType;
  const size = ((block as unknown as { size?: 'sm' | 'md' | 'lg' }).size ?? 'md') as 'sm' | 'md' | 'lg';
  const showValue = (block as unknown as { showValue?: boolean }).showValue ?? false;

  // Clamp value to max
  const clampedValue = clamp(ratingValue, 0, max);

  // Get signal emit configuration
  const emitSignal = block.signals?.emit;
  const interactive = !readOnly;

  // Initialize focused index based on current value
  useEffect(() => {
    const valueBasedIndex = Math.max(0, Math.ceil(clampedValue) - 1);
    setFocusedIndex(valueBasedIndex);
  }, [clampedValue]);

  const handleClick = useCallback((newValue: number) => {
    if (interactive && emitSignal?.name) {
      signalActions.emit(emitSignal.name, String(newValue));
    }
  }, [interactive, emitSignal, signalActions]);

  const handleHover = useCallback((value: number | null) => {
    setHoverValue(value);
  }, []);

  const handleFocus = useCallback((index: number) => {
    setFocusedIndex(index);
  }, []);

  // Keyboard navigation for radiogroup pattern
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!interactive) return;

    let newIndex = focusedIndex;
    let shouldSelect = false;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        newIndex = Math.min(focusedIndex + 1, max - 1);
        shouldSelect = true;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        newIndex = Math.max(focusedIndex - 1, 0);
        shouldSelect = true;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        shouldSelect = true;
        break;
      case 'End':
        e.preventDefault();
        newIndex = max - 1;
        shouldSelect = true;
        break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        // Select current focused option
        handleClick(focusedIndex + 1);
        return;
      default:
        return;
    }

    setFocusedIndex(newIndex);

    // Move focus to the new button
    if (containerRef.current) {
      const buttons = containerRef.current.querySelectorAll('button[role="radio"]');
      const targetButton = buttons[newIndex] as HTMLButtonElement;
      if (targetButton) {
        targetButton.focus();
        // Optionally select on arrow key (common pattern for radiogroups)
        if (shouldSelect) {
          handleClick(newIndex + 1);
        }
      }
    }
  }, [interactive, focusedIndex, max, handleClick]);

  const filledColor = color || defaultFilledColor;
  const emptyColor = defaultEmptyColor;

  // Generate accessible description
  const accessibleLabel = label || 'Rating';

  return (
    <div data-liquid-type="rating" style={styles.wrapper}>
      {label && (
        <span id={`rating-label-${label}`} style={styles.label}>
          {label}
        </span>
      )}
      <div style={styles.container}>
        <div
          ref={containerRef}
          style={styles.iconsWrapper(size)}
          role="radiogroup"
          aria-label={accessibleLabel}
          aria-describedby={showValue ? `rating-value-${label || 'default'}` : undefined}
          aria-readonly={readOnly || undefined}
          onKeyDown={handleKeyDown}
        >
          {Array.from({ length: max }, (_, i) => (
            <RatingIcon
              key={i}
              index={i}
              value={clampedValue}
              max={max}
              hoverValue={hoverValue}
              allowHalf={allowHalf}
              icon={icon}
              size={size}
              filledColor={filledColor}
              emptyColor={emptyColor}
              interactive={interactive}
              isFocused={focusedIndex === i}
              onClick={handleClick}
              onHover={handleHover}
              onFocus={handleFocus}
            />
          ))}
        </div>
        {showValue && (
          <span
            id={`rating-value-${label || 'default'}`}
            style={styles.valueText}
            aria-live="polite"
          >
            {clampedValue}{allowHalf ? '' : ''}/{max}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

export function StaticRating({
  value,
  max = 5,
  onChange,
  readOnly = false,
  allowHalf = false,
  icon = 'star',
  color,
  size = 'md',
  showValue = false,
  label,
  className,
  style: customStyle,
}: StaticRatingProps): React.ReactElement {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const clampedValue = clamp(value, 0, max);
  const interactive = !readOnly && !!onChange;

  // Initialize focused index based on current value
  useEffect(() => {
    const valueBasedIndex = Math.max(0, Math.ceil(clampedValue) - 1);
    setFocusedIndex(valueBasedIndex);
  }, [clampedValue]);

  const handleClick = useCallback((newValue: number) => {
    if (interactive && onChange) {
      onChange(newValue);
    }
  }, [interactive, onChange]);

  const handleHover = useCallback((value: number | null) => {
    setHoverValue(value);
  }, []);

  const handleFocus = useCallback((index: number) => {
    setFocusedIndex(index);
  }, []);

  // Keyboard navigation for radiogroup pattern
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!interactive) return;

    let newIndex = focusedIndex;
    let shouldSelect = false;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        newIndex = Math.min(focusedIndex + 1, max - 1);
        shouldSelect = true;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        newIndex = Math.max(focusedIndex - 1, 0);
        shouldSelect = true;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        shouldSelect = true;
        break;
      case 'End':
        e.preventDefault();
        newIndex = max - 1;
        shouldSelect = true;
        break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        handleClick(focusedIndex + 1);
        return;
      default:
        return;
    }

    setFocusedIndex(newIndex);

    if (containerRef.current) {
      const buttons = containerRef.current.querySelectorAll('button[role="radio"]');
      const targetButton = buttons[newIndex] as HTMLButtonElement;
      if (targetButton) {
        targetButton.focus();
        if (shouldSelect) {
          handleClick(newIndex + 1);
        }
      }
    }
  }, [interactive, focusedIndex, max, handleClick]);

  const filledColor = color || defaultFilledColor;
  const emptyColor = defaultEmptyColor;

  const wrapperStyle = mergeStyles(styles.wrapper, customStyle);

  // Generate unique ID for accessibility
  const ratingId = label ? label.replace(/\s+/g, '-').toLowerCase() : 'static-rating';
  const accessibleLabel = label || 'Rating';

  return (
    <div data-liquid-type="rating" style={wrapperStyle} className={className}>
      {label && (
        <span id={`rating-label-${ratingId}`} style={styles.label}>
          {label}
        </span>
      )}
      <div style={styles.container}>
        <div
          ref={containerRef}
          style={styles.iconsWrapper(size)}
          role="radiogroup"
          aria-label={accessibleLabel}
          aria-describedby={showValue ? `rating-value-${ratingId}` : undefined}
          aria-readonly={readOnly || undefined}
          onKeyDown={handleKeyDown}
        >
          {Array.from({ length: max }, (_, i) => (
            <RatingIcon
              key={i}
              index={i}
              value={clampedValue}
              max={max}
              hoverValue={hoverValue}
              allowHalf={allowHalf}
              icon={icon}
              size={size}
              filledColor={filledColor}
              emptyColor={emptyColor}
              interactive={interactive}
              isFocused={focusedIndex === i}
              onClick={handleClick}
              onHover={handleHover}
              onFocus={handleFocus}
            />
          ))}
        </div>
        {showValue && (
          <span
            id={`rating-value-${ratingId}`}
            style={styles.valueText}
            aria-live="polite"
          >
            {clampedValue}/{max}
          </span>
        )}
      </div>
    </div>
  );
}

export default Rating;
