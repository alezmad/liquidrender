// Manifest Builder
// Constructs complete ComponentManifest from all component specs
// Enables theme-agnostic manifest generation for LLM consumption

import type {
  ComponentManifest,
  ComponentSpec,
  ThemeMetadata,
  SemanticGraph,
  CompositionRules,
  TokenManifest,
  CompositionPattern,
  AntiPattern,
  ComponentRelationship,
} from "./types";

import { layoutSpecs } from "./specs/layout";
import { formSpecs } from "./specs/forms";
import { dataDisplaySpecs } from "./specs/data-display";
import { chartSpecs } from "./specs/charts";
import { categoryTree } from "./semantics/categories";
import { compositionRules, compositionPatterns, antiPatterns } from "./semantics/composition";
import { tokenManifest } from "./tokens";

// ============================================================================
// Builder Options
// ============================================================================

export interface BuildManifestOptions {
  /** Theme metadata */
  meta: ThemeMetadata;
  /** Additional component specs to include */
  additionalSpecs?: ComponentSpec[];
  /** Override composition rules */
  compositionOverrides?: Partial<CompositionRules>;
  /** Override token manifest */
  tokenOverrides?: Partial<TokenManifest>;
  /** Additional relationships to include */
  additionalRelationships?: ComponentRelationship[];
  /** Additional patterns to include */
  additionalPatterns?: CompositionPattern[];
}

// ============================================================================
// Build Manifest
// ============================================================================

/**
 * Build a complete ComponentManifest from specs and semantics
 * This is the main entry point for generating the manifest
 */
export function buildManifest(options: BuildManifestOptions): ComponentManifest {
  const { meta, additionalSpecs = [], compositionOverrides, tokenOverrides, additionalRelationships = [], additionalPatterns = [] } = options;

  // Collect all component specs
  const allSpecs = [
    ...layoutSpecs,
    ...formSpecs,
    ...dataDisplaySpecs,
    ...chartSpecs,
    ...additionalSpecs,
  ];

  // Build component lookup by type
  const components: Record<string, ComponentSpec> = {};
  for (const spec of allSpecs) {
    components[spec.type] = spec;
  }

  // Build relationships from component specs
  const relationships = buildRelationships(allSpecs);

  // Merge with additional relationships
  const allRelationships = [...relationships, ...additionalRelationships];

  // Build semantic graph
  const semantics: SemanticGraph = {
    categories: categoryTree,
    relationships: allRelationships,
    patterns: [...compositionPatterns, ...additionalPatterns],
    antiPatterns: antiPatterns,
  };

  // Merge composition rules
  const composition: CompositionRules = {
    ...compositionRules,
    ...compositionOverrides,
  };

  // Merge tokens
  const tokens: TokenManifest = {
    ...tokenManifest,
    ...tokenOverrides,
  };

  return {
    version: "1.0",
    meta,
    components,
    composition,
    semantics,
    tokens,
  };
}

// ============================================================================
// Relationship Builder
// ============================================================================

/**
 * Build component relationships from spec definitions
 * Extracts contains/alternative relationships from component usage guidance
 */
function buildRelationships(specs: ComponentSpec[]): ComponentRelationship[] {
  const relationships: ComponentRelationship[] = [];

  for (const spec of specs) {
    // Extract "alternative" relationships from usage.alternatives
    for (const alt of spec.usage.alternatives) {
      relationships.push({
        from: spec.type,
        to: alt.type,
        type: "alternative",
        strength: 0.7,
      });
    }

    // Extract "contains" relationships from composition.validChildren
    for (const child of spec.composition.validChildren) {
      relationships.push({
        from: spec.type,
        to: child,
        type: "contains",
        strength: 0.8,
      });
    }

    // Extract "sibling" relationships from composition.siblings
    if (spec.composition.siblings) {
      for (const sibling of spec.composition.siblings.recommended) {
        relationships.push({
          from: spec.type,
          to: sibling,
          type: "sibling",
          strength: 0.6,
        });
      }
    }
  }

  // Deduplicate relationships
  const seen = new Set<string>();
  return relationships.filter((rel) => {
    const key = `${rel.from}:${rel.type}:${rel.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================================================
// Default Manifest
// ============================================================================

/**
 * Build the default LiquidRender manifest
 * Includes all built-in components with default theme
 */
export function buildDefaultManifest(): ComponentManifest {
  return buildManifest({
    meta: {
      name: "liquidrender-default",
      version: "1.0.0",
      description: "Default LiquidRender theme with 77+ components",
      author: "LiquidRender Team",
    },
  });
}

// ============================================================================
// Manifest Statistics
// ============================================================================

export interface ManifestStats {
  totalComponents: number;
  byCategory: Record<string, number>;
  totalRelationships: number;
  totalPatterns: number;
  totalAntiPatterns: number;
}

/**
 * Get statistics about a manifest
 */
export function getManifestStats(manifest: ComponentManifest): ManifestStats {
  const byCategory: Record<string, number> = {};

  for (const spec of Object.values(manifest.components)) {
    const rootCategory = spec.category.split(".")[0] ?? "misc";
    byCategory[rootCategory] = (byCategory[rootCategory] ?? 0) + 1;
  }

  return {
    totalComponents: Object.keys(manifest.components).length,
    byCategory,
    totalRelationships: manifest.semantics.relationships.length,
    totalPatterns: manifest.semantics.patterns.length,
    totalAntiPatterns: manifest.semantics.antiPatterns.length,
  };
}

// ============================================================================
// Manifest Validation
// ============================================================================

export interface ManifestValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a manifest for completeness and consistency
 */
export function validateManifest(manifest: ComponentManifest): ManifestValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check version
  if (manifest.version !== "1.0") {
    errors.push(`Unsupported manifest version: ${manifest.version}`);
  }

  // Check meta
  if (!manifest.meta.name) {
    errors.push("Missing theme name in metadata");
  }
  if (!manifest.meta.version) {
    errors.push("Missing theme version in metadata");
  }

  // Check component specs
  for (const [type, spec] of Object.entries(manifest.components)) {
    if (!spec.description) {
      warnings.push(`Component ${type} missing description`);
    }
    if (!spec.category) {
      errors.push(`Component ${type} missing category`);
    }
    if (spec.examples.length === 0) {
      warnings.push(`Component ${type} has no examples`);
    }
  }

  // Check relationships reference valid components
  for (const rel of manifest.semantics.relationships) {
    if (!manifest.components[rel.from]) {
      warnings.push(`Relationship references unknown component: ${rel.from}`);
    }
    if (!manifest.components[rel.to]) {
      warnings.push(`Relationship references unknown component: ${rel.to}`);
    }
  }

  // Check composition rules reference valid components
  for (const rule of manifest.composition.rules) {
    if (!manifest.components[rule.parent]) {
      warnings.push(`Composition rule references unknown parent: ${rule.parent}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default buildManifest;
