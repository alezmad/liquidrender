// Focus Trap Utility
// Manages focus containment within modal dialogs and overlays

// ============================================================================
// Types
// ============================================================================

export interface FocusTrapOptions {
  /** Element to trap focus within */
  container: HTMLElement;
  /** Element to return focus to when trap is released */
  returnFocusTo?: HTMLElement | null;
  /** Called when escape key is pressed */
  onEscape?: () => void;
  /** Called when click outside container */
  onClickOutside?: () => void;
  /** Initial element to focus (defaults to first focusable) */
  initialFocus?: HTMLElement | null;
  /** Whether to auto-focus on mount */
  autoFocus?: boolean;
}

export interface FocusTrap {
  /** Activate the focus trap */
  activate: () => void;
  /** Deactivate the focus trap and restore focus */
  deactivate: () => void;
  /** Check if trap is currently active */
  isActive: () => boolean;
  /** Update options dynamically */
  updateOptions: (options: Partial<FocusTrapOptions>) => void;
}

// ============================================================================
// Constants
// ============================================================================

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
  return Array.from(elements).filter((el) => {
    // Filter out hidden elements
    if (el.offsetParent === null && el.style.position !== 'fixed') return false;
    // Filter out elements with visibility: hidden
    const style = window.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    return true;
  });
}

/**
 * Get the first focusable element in a container
 */
export function getFirstFocusable(container: HTMLElement): HTMLElement | null {
  const focusable = getFocusableElements(container);
  return focusable[0] || null;
}

/**
 * Get the last focusable element in a container
 */
export function getLastFocusable(container: HTMLElement): HTMLElement | null {
  const focusable = getFocusableElements(container);
  return focusable[focusable.length - 1] || null;
}

/**
 * Check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  return element.matches(FOCUSABLE_SELECTORS);
}

// ============================================================================
// Focus Trap Factory
// ============================================================================

/**
 * Create a focus trap for modal dialogs
 *
 * @example
 * ```tsx
 * const trap = createFocusTrap({
 *   container: dialogRef.current,
 *   onEscape: () => setOpen(false),
 *   onClickOutside: () => setOpen(false),
 * });
 *
 * useEffect(() => {
 *   if (isOpen) {
 *     trap.activate();
 *     return () => trap.deactivate();
 *   }
 * }, [isOpen]);
 * ```
 */
export function createFocusTrap(options: FocusTrapOptions): FocusTrap {
  let opts = { ...options };
  let active = false;
  let previouslyFocused: HTMLElement | null = null;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!active) return;

    // Handle Escape
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      opts.onEscape?.();
      return;
    }

    // Handle Tab
    if (event.key === 'Tab') {
      const focusable = getFocusableElements(opts.container);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      if (event.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (activeElement === first || !opts.container.contains(activeElement)) {
          event.preventDefault();
          last?.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (activeElement === last || !opts.container.contains(activeElement)) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (!active) return;
    const target = event.target as Node;
    if (!opts.container.contains(target)) {
      opts.onClickOutside?.();
    }
  };

  const handleFocusIn = (event: FocusEvent) => {
    if (!active) return;
    const target = event.target as Node;

    // If focus moved outside container, bring it back
    if (!opts.container.contains(target)) {
      event.preventDefault();
      const first = getFirstFocusable(opts.container);
      first?.focus();
    }
  };

  const activate = () => {
    if (active) return;
    active = true;

    // Store previously focused element
    previouslyFocused = (opts.returnFocusTo || document.activeElement) as HTMLElement;

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('focusin', handleFocusIn);

    // Auto-focus if enabled
    if (opts.autoFocus !== false) {
      requestAnimationFrame(() => {
        if (!active) return;
        const toFocus = opts.initialFocus || getFirstFocusable(opts.container);
        toFocus?.focus();
      });
    }
  };

  const deactivate = () => {
    if (!active) return;
    active = false;

    // Remove event listeners
    document.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('mousedown', handleClickOutside, true);
    document.removeEventListener('focusin', handleFocusIn);

    // Restore focus
    if (previouslyFocused && document.body.contains(previouslyFocused)) {
      previouslyFocused.focus();
    }
    previouslyFocused = null;
  };

  const isActive = () => active;

  const updateOptions = (newOptions: Partial<FocusTrapOptions>) => {
    opts = { ...opts, ...newOptions };
  };

  return {
    activate,
    deactivate,
    isActive,
    updateOptions,
  };
}

// ============================================================================
// React Hook
// ============================================================================

/**
 * React hook for focus trap
 *
 * @example
 * ```tsx
 * function Dialog({ isOpen, onClose, children }) {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *
 *   useFocusTrap(containerRef, isOpen, {
 *     onEscape: onClose,
 *     onClickOutside: onClose,
 *   });
 *
 *   if (!isOpen) return null;
 *
 *   return (
 *     <div ref={containerRef} role="dialog" aria-modal="true">
 *       {children}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFocusTrapEffect(
  containerRef: React.RefObject<HTMLElement>,
  isActive: boolean,
  options: Omit<FocusTrapOptions, 'container'> = {}
): void {
  // This is a documentation placeholder - the actual hook should be
  // implemented in a React context. Import React and use useEffect:
  //
  // import { useEffect, useRef } from 'react';
  //
  // useEffect(() => {
  //   if (!isActive || !containerRef.current) return;
  //
  //   const trap = createFocusTrap({
  //     container: containerRef.current,
  //     ...options,
  //   });
  //
  //   trap.activate();
  //   return () => trap.deactivate();
  // }, [isActive, containerRef.current, options.onEscape, options.onClickOutside]);
}

// ============================================================================
// Portal Helper
// ============================================================================

/**
 * Check if we're in a browser environment
 */
export const canUseDOM = !!(
  typeof window !== 'undefined' &&
  window.document &&
  window.document.createElement
);

/**
 * Get the portal container element, creating it if needed
 */
export function getPortalContainer(id = 'liquid-portal-root'): HTMLElement | null {
  if (!canUseDOM) return null;

  let container = document.getElementById(id);
  if (!container) {
    container = document.createElement('div');
    container.id = id;
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }
  return container;
}

export default createFocusTrap;
