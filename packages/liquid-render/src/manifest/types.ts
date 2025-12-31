// Component Intelligence Layer - Type Definitions
// Machine-readable manifest system for LLM-assisted UI generation

// ============================================================================
// Theme Metadata
// ============================================================================

/**
 * Metadata about the theme providing the manifest
 */
export interface ThemeMetadata {
  /** Theme name (e.g., "default", "turbostarter") */
  name: string;
  /** Semantic version */
  version: string;
  /** Human-readable description */
  description?: string;
  /** Theme author/organization */
  author?: string;
}

// ============================================================================
// Component Categories
// ============================================================================

/**
 * Hierarchical component category (e.g., "data-display.metrics")
 */
export type ComponentCategory =
  // Layout
  | "layout"
  | "layout.container"
  | "layout.grid"
  // Typography
  | "typography"
  | "typography.heading"
  | "typography.body"
  // Navigation
  | "navigation"
  | "navigation.menu"
  | "navigation.breadcrumb"
  | "navigation.tabs"
  | "navigation.pagination"
  // Data Display
  | "data-display"
  | "data-display.metrics"
  | "data-display.collections"
  | "data-display.media"
  // Charts
  | "charts"
  | "charts.line"
  | "charts.bar"
  | "charts.pie"
  | "charts.scatter"
  | "charts.specialized"
  // Forms
  | "forms"
  | "forms.input"
  | "forms.selection"
  | "forms.specialized"
  // Feedback
  | "feedback"
  | "feedback.status"
  | "feedback.confirmation"
  | "feedback.progress"
  // Overlays
  | "overlays"
  | "overlays.modal"
  | "overlays.popover"
  | "overlays.tooltip"
  // Disclosure
  | "disclosure"
  // Media
  | "media"
  // Actions
  | "actions"
  // Misc
  | "misc";

// ============================================================================
// Usage Guidance
// ============================================================================

/**
 * Guidance on when to use (and when not to use) a component
 */
export interface UsageGuidance {
  /** Scenarios where this component is ideal */
  when: string[];
  /** Scenarios where alternatives are better */
  avoid: string[];
  /** Suggested alternatives with reasons */
  alternatives: AlternativeSpec[];
}

/**
 * Specification for an alternative component
 */
export interface AlternativeSpec {
  /** Component type to use instead */
  type: string;
  /** Why this alternative is better in certain cases */
  reason: string;
}

// ============================================================================
// Property Specifications
// ============================================================================

/**
 * Type literals for prop specifications
 */
export type PropType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "Binding"
  | "ReactNode"
  | "function"
  // Union types represented as string literals
  | string;

/**
 * Specification for a component prop
 */
export interface PropSpec {
  /** Prop name */
  name: string;
  /** TypeScript type */
  type: PropType;
  /** Is this prop required? */
  required: boolean;
  /** Human-readable description */
  description: string;
  /** Default value if not provided */
  default?: unknown;
  /** Example values */
  examples?: string[];
}

// ============================================================================
// Binding Specifications
// ============================================================================

/**
 * Shape of data a binding can resolve to
 */
export interface BindingShape {
  /** The expected type */
  type: "string" | "number" | "boolean" | "object" | "array";
  /** For object types, the expected shape */
  shape?: Record<string, BindingShape | string>;
  /** Human-readable description */
  description: string;
}

/**
 * Specification for component data bindings
 */
export interface BindingSpec {
  /** Expected data shapes */
  expects: BindingShape[];
  /** Example binding expressions and their resolved values */
  resolves?: Array<{
    expression: string;
    value: unknown;
  }>;
}

// ============================================================================
// Composition Rules
// ============================================================================

/**
 * Constraints on how a component can be composed
 */
export interface ComponentComposition {
  /** Component types that can contain this component */
  validParents: string[];
  /** Component types this component can contain */
  validChildren: string[];
  /** Sibling recommendations */
  siblings?: {
    /** Recommended siblings */
    recommended: string[];
    /** Discouraged siblings (semantic mismatch) */
    discouraged: string[];
  };
}

// ============================================================================
// Feature Flags
// ============================================================================

/**
 * Capabilities a component supports
 */
export interface FeatureFlags {
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
  /** Responds to container size */
  responsive?: boolean;
  /** Supports dark mode */
  darkMode?: boolean;
  /** Supports RTL languages */
  rtl?: boolean;
}

// ============================================================================
// Accessibility
// ============================================================================

/**
 * Accessibility requirements for a component
 */
export interface AccessibilitySpec {
  /** ARIA role */
  role?: string;
  /** Live region politeness */
  liveRegion?: "off" | "polite" | "assertive";
  /** A11y requirements the component must meet */
  requirements: string[];
}

// ============================================================================
// Examples
// ============================================================================

/**
 * Example usage of a component
 */
export interface Example {
  /** Example name */
  name: string;
  /** DSL code snippet */
  dsl: string;
  /** Sample data for the example */
  data?: Record<string, unknown>;
  /** What the example renders */
  renders: string;
}

// ============================================================================
// Component Specification (Main Interface)
// ============================================================================

/**
 * Complete specification for a single component
 * Contains everything an LLM needs to generate correct code
 */
export interface ComponentSpec {
  /** Component identifier (matches theme.components key) */
  type: string;
  /** Human-readable description for LLM reasoning */
  description: string;
  /** Semantic category for smart selection */
  category: ComponentCategory;
  /** When to use vs. alternatives */
  usage: UsageGuidance;
  /** Props with full type information */
  props: PropSpec[];
  /** Binding expectations */
  bindings: BindingSpec;
  /** Composition constraints */
  composition: ComponentComposition;
  /** Feature capabilities */
  features: FeatureFlags;
  /** Accessibility requirements */
  a11y: AccessibilitySpec;
  /** Example DSL snippets */
  examples: Example[];
}

// ============================================================================
// Semantic Graph
// ============================================================================

/**
 * Node in the category tree
 */
export interface CategoryNode {
  /** Human-readable description */
  description: string;
  /** Components in this category */
  components: string[];
  /** Nested subcategories */
  subcategories?: Record<string, CategoryNode>;
}

/**
 * Full category hierarchy
 */
export type CategoryTree = Record<string, CategoryNode>;

/**
 * Relationship between components
 */
export interface ComponentRelationship {
  /** Source component */
  from: string;
  /** Relationship type */
  type: "contains" | "sibling" | "alternative" | "extends";
  /** Target component */
  to: string;
  /** Strength of relationship (0-1) */
  strength?: number;
}

/**
 * A reusable composition pattern
 */
export interface CompositionPattern {
  /** Pattern name */
  name: string;
  /** Human-readable description */
  description: string;
  /** DSL structure */
  structure: string;
  /** When to use this pattern */
  when: string[];
}

/**
 * An anti-pattern to avoid
 */
export interface AntiPattern {
  /** Anti-pattern name */
  name: string;
  /** Why this is problematic */
  description: string;
  /** Example of the anti-pattern */
  example: string;
  /** How to fix it */
  fix: string;
}

/**
 * Semantic graph for LLM reasoning
 */
export interface SemanticGraph {
  /** Category hierarchy */
  categories: CategoryTree;
  /** Component relationships */
  relationships: ComponentRelationship[];
  /** Common patterns */
  patterns: CompositionPattern[];
  /** Anti-patterns to avoid */
  antiPatterns: AntiPattern[];
}

// ============================================================================
// Design Tokens
// ============================================================================

/**
 * Token value with metadata
 */
export interface TokenValue {
  /** The token value (CSS value) */
  value: string;
  /** Human-readable description */
  description?: string;
}

/**
 * Design token manifest
 */
export interface TokenManifest {
  /** Color tokens */
  colors: Record<string, TokenValue>;
  /** Spacing tokens */
  spacing: Record<string, TokenValue>;
  /** Border radius tokens */
  radius: Record<string, TokenValue>;
  /** Font size tokens */
  fontSize: Record<string, TokenValue>;
  /** Font weight tokens */
  fontWeight: Record<string, TokenValue>;
  /** Shadow tokens */
  shadows?: Record<string, TokenValue>;
  /** Transition tokens */
  transitions?: Record<string, TokenValue>;
}

// ============================================================================
// Composition Rules
// ============================================================================

/**
 * Global composition rules for the theme
 */
export interface CompositionRules {
  /** Maximum nesting depth recommended */
  maxNestingDepth: number;
  /** Components that should always be leaf nodes */
  leafComponents: string[];
  /** Components that require children */
  containerComponents: string[];
  /** Specific composition rules */
  rules: Array<{
    /** Rule name */
    name: string;
    /** Condition (parent type) */
    parent: string;
    /** Allowed children */
    allowedChildren: string[];
    /** Reason for restriction */
    reason?: string;
  }>;
}

// ============================================================================
// Manifest Query API Types
// ============================================================================

/**
 * Data shape for querying components
 */
export interface DataShape {
  type: "string" | "number" | "boolean" | "object" | "array";
  /** For arrays, the item type */
  items?: DataShape;
  /** For objects, the properties */
  properties?: Record<string, DataShape>;
}

/**
 * Validation result for composition
 */
export interface ValidationResult {
  /** Is the composition valid? */
  valid: boolean;
  /** Reason for invalidity */
  reason?: string;
  /** Suggested fix */
  suggestion?: string;
  /** Severity level */
  severity?: "error" | "warning" | "info";
}

// ============================================================================
// Manifest Context
// ============================================================================

/**
 * Context for adaptive manifest generation
 */
export interface ManifestContext {
  /** Target device */
  device: "desktop" | "tablet" | "mobile";
  /** User role/expertise */
  audience: "developer" | "designer" | "business";
  /** Fidelity level */
  fidelity: "sketch" | "wireframe" | "production";
  /** Token budget for LLM context */
  tokenBudget: number;
}

// ============================================================================
// Component Manifest (Main Export)
// ============================================================================

/**
 * Complete machine-readable manifest for a theme
 * Enables LLMs to reason about, compose, and generate correct UI
 */
export interface ComponentManifest {
  /** Schema version for manifest format */
  version: "1.0";
  /** Theme metadata */
  meta: ThemeMetadata;
  /** All component specifications */
  components: Record<string, ComponentSpec>;
  /** Global composition rules */
  composition: CompositionRules;
  /** Semantic categories and patterns */
  semantics: SemanticGraph;
  /** Design tokens available */
  tokens: TokenManifest;
}

// ============================================================================
// Query API Interface
// ============================================================================

/**
 * Interface for querying the manifest
 */
export interface ManifestQuery {
  /** Find components by category */
  byCategory(category: ComponentCategory | string): ComponentSpec[];
  /** Find components that accept a data shape */
  byDataShape(shape: DataShape): ComponentSpec[];
  /** Find components with specific features */
  byFeatures(features: Partial<FeatureFlags>): ComponentSpec[];
  /** Get composition suggestions for a parent */
  suggestChildren(parentType: string): ComponentSpec[];
  /** Validate a composition */
  validateComposition(parent: string, children: string[]): ValidationResult;
  /** Get alternatives for a component */
  getAlternatives(type: string): AlternativeSpec[];
  /** Search components by text */
  search(query: string): ComponentSpec[];
}
