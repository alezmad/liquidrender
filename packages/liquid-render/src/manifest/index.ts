// Component Intelligence Layer - Barrel Exports
// Machine-readable manifest system for LLM-assisted UI generation

// ============================================================================
// Types
// ============================================================================

export type {
  // Metadata
  ThemeMetadata,
  ComponentCategory,
  // Usage
  UsageGuidance,
  AlternativeSpec,
  // Props
  PropType,
  PropSpec,
  // Bindings
  BindingShape,
  BindingSpec,
  // Composition
  ComponentComposition,
  // Features
  FeatureFlags,
  // Accessibility
  AccessibilitySpec,
  // Examples
  Example,
  // Component Spec
  ComponentSpec,
  // Semantic Graph
  CategoryNode,
  CategoryTree,
  ComponentRelationship,
  CompositionPattern,
  AntiPattern,
  SemanticGraph,
  // Tokens
  TokenValue,
  TokenManifest,
  // Composition Rules
  CompositionRules,
  // Query Types
  DataShape,
  ValidationResult,
  ManifestContext,
  // Main Interfaces
  ComponentManifest,
  ManifestQuery,
} from "./types";

// ============================================================================
// Specs (Wave 1 - Complete)
// ============================================================================

export { layoutSpecs } from "./specs/layout";
export { formSpecs } from "./specs/forms";
export { dataDisplaySpecs } from "./specs/data-display";
export { chartSpecs } from "./specs/charts";

// ============================================================================
// Tokens
// ============================================================================

export { tokenManifest, chartColorManifest } from "./tokens";

// ============================================================================
// Semantics (Wave 2)
// ============================================================================

export { categoryTree } from "./semantics/categories";
export {
  compositionRules,
  compositionPatterns,
  antiPatterns,
} from "./semantics/composition";

// ============================================================================
// Builder (Wave 3)
// ============================================================================

export {
  buildManifest,
  buildDefaultManifest,
  getManifestStats,
  validateManifest,
} from "./builder";

export type {
  BuildManifestOptions,
  ManifestStats,
  ManifestValidationResult,
} from "./builder";

// ============================================================================
// Query API (Wave 3)
// ============================================================================

export {
  createManifestQuery,
  queryManifest,
  ManifestQueryBuilder,
  findComponentForIntent,
  getComponent,
  getLeafComponents,
  getContainerComponents,
  getSiblingComponents,
  getRelatedComponents,
  getBudgetedSpecs,
} from "./query";

// ============================================================================
// LLM Context (Wave 4)
// ============================================================================

export {
  generateLLMContext,
  generateQuickContext,
  generateComponentContext,
  generateCompositionContext,
} from "./llm-context";

export type { LLMContext, GenerateContextOptions } from "./llm-context";
