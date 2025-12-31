// Theme Types for Liquid Protocol
// Enables theme switching and component adaptation
// Integrates with Component Intelligence Layer for LLM-assisted generation

import type { ComponentType, ReactNode } from "react";
import type { Block } from "../compiler/ui-emitter";
import type { DataContext } from "../renderer/data-context";
import type { ComponentManifest, ComponentSpec } from "../manifest/types";

// ============================================================================
// Legacy Component Interface (Current Format)
// ============================================================================

/**
 * Props interface for legacy Liquid components
 * Current components receive (block, data) directly
 */
export interface LiquidComponentProps {
  block: Block;
  data: DataContext;
  children?: ReactNode;
  className?: string;
}

/**
 * Legacy component type - receives block and data directly
 * This is the current format used by all 77 existing components
 */
export type LiquidLegacyComponent = ComponentType<LiquidComponentProps>;

// ============================================================================
// New Adapter Interface
// ============================================================================

/**
 * Resolve function for binding expressions
 * Converts "{{path.to.value}}" to the resolved value
 */
export type BindingResolver = <T>(expr: string | T) => T;

/**
 * Function that maps block props to component props
 */
export type PropMapper<TProps = Record<string, unknown>> = (
  block: Record<string, unknown>,
  data: Record<string, unknown>,
  resolve: BindingResolver
) => TProps;

/**
 * Feature flags a component can declare
 */
export interface LiquidFeatures {
  /** Supports loading/skeleton state */
  loading?: boolean;
  /** Supports error state */
  error?: boolean;
  /** Supports empty state */
  empty?: boolean;
  /** Supports pagination */
  pagination?: boolean;
  /** Supports sorting */
  sorting?: boolean;
  /** Supports filtering */
  filtering?: boolean;
  /** Supports selection */
  selection?: boolean;
  /** Supports drag and drop */
  dragDrop?: boolean;
  /** Supports responsive breakpoints */
  responsive?: boolean;
  /** Supports dark mode */
  darkMode?: boolean;
  /** Supports RTL */
  rtl?: boolean;
}

/**
 * Adapter for mapping a block type to a component
 * New format that enables any component library integration
 */
export interface LiquidComponentAdapter<TProps = Record<string, unknown>> {
  /** The component to render */
  component: ComponentType<TProps>;

  /** Optional: Map block props to component props */
  mapProps?: PropMapper<TProps>;

  /** Optional: Feature flags */
  features?: LiquidFeatures;
}

// ============================================================================
// Theme Interface
// ============================================================================

/**
 * Union type for component entries in a theme
 * Supports both legacy (function) and new adapter (object) formats
 */
export type ThemeComponent<TProps = Record<string, unknown>> =
  | LiquidLegacyComponent
  | LiquidComponentAdapter<TProps>;

/**
 * A theme is a collection of component adapters keyed by block type
 */
export interface LiquidTheme {
  /** Theme identifier */
  name: string;

  /** Version string */
  version: string;

  /** Component adapters keyed by block type */
  components: Record<string, ThemeComponent>;

  /** Fallback component for unknown block types */
  fallback?: ThemeComponent;

  /** Component Intelligence manifest (for LLM-assisted generation) */
  manifest?: ComponentManifest;
}

/**
 * Theme with a required manifest (for LLM-aware themes)
 */
export interface LiquidThemeWithManifest extends LiquidTheme {
  manifest: ComponentManifest;
}

/**
 * Check if a theme has a manifest
 */
export function hasManifest(theme: LiquidTheme): theme is LiquidThemeWithManifest {
  return theme.manifest !== undefined;
}

/**
 * Get component spec from theme manifest
 */
export function getComponentSpec(
  theme: LiquidTheme,
  type: string
): ComponentSpec | undefined {
  return theme.manifest?.components[type];
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a component entry is a legacy component (function)
 */
export function isLegacyComponent(
  component: ThemeComponent
): component is LiquidLegacyComponent {
  return typeof component === "function";
}

/**
 * Check if a component entry is a new adapter (object with component property)
 */
export function isComponentAdapter<TProps = Record<string, unknown>>(
  component: ThemeComponent<TProps>
): component is LiquidComponentAdapter<TProps> {
  return (
    typeof component === "object" &&
    component !== null &&
    "component" in component
  );
}

// ============================================================================
// Theme Utilities
// ============================================================================

/**
 * Merge two themes, with overrides taking precedence
 * Useful for extending the default theme with custom components
 */
export function mergeThemes(
  base: LiquidTheme,
  overrides: Partial<LiquidTheme>
): LiquidTheme {
  return {
    name: overrides.name ?? base.name,
    version: overrides.version ?? base.version,
    components: {
      ...base.components,
      ...overrides.components,
    },
    fallback: overrides.fallback ?? base.fallback,
  };
}

/**
 * Create a partial theme that can be merged with a base theme
 */
export function createThemeOverride(
  overrides: Partial<LiquidTheme>
): Partial<LiquidTheme> {
  return overrides;
}
