// Manifest Query API
// Provides fluent query interface for component discovery and validation
// Enables LLMs to find the right component for any use case

import type {
  ComponentManifest,
  ComponentSpec,
  ManifestQuery,
  ManifestContext,
  DataShape,
  FeatureFlags,
  ValidationResult,
  AlternativeSpec,
  ComponentCategory,
  BindingShape,
} from "./types";

// ============================================================================
// Query Implementation
// ============================================================================

/**
 * Create a query API for a component manifest
 * Provides fluent methods for component discovery
 */
export function createManifestQuery(manifest: ComponentManifest): ManifestQuery {
  const components = Object.values(manifest.components);
  const componentMap = manifest.components;

  return {
    /**
     * Find components by category
     * Supports both exact matches and prefix matches (e.g., "charts" matches "charts.line")
     */
    byCategory(category: ComponentCategory | string): ComponentSpec[] {
      return components.filter((spec) => {
        // Exact match
        if (spec.category === category) return true;
        // Prefix match (e.g., "charts" matches "charts.line", "charts.bar")
        if (spec.category.startsWith(`${category}.`)) return true;
        return false;
      });
    },

    /**
     * Find components that can accept a given data shape
     * Matches against binding expectations
     */
    byDataShape(shape: DataShape): ComponentSpec[] {
      return components.filter((spec) => {
        return spec.bindings.expects.some((expected) => matchesDataShape(shape, expected));
      });
    },

    /**
     * Find components with specific feature capabilities
     * Returns components that have ALL requested features
     */
    byFeatures(features: Partial<FeatureFlags>): ComponentSpec[] {
      return components.filter((spec) => {
        for (const [feature, required] of Object.entries(features)) {
          if (required && !spec.features[feature as keyof FeatureFlags]) {
            return false;
          }
        }
        return true;
      });
    },

    /**
     * Get suggested child components for a parent
     * Based on composition rules and semantic relationships
     */
    suggestChildren(parentType: string): ComponentSpec[] {
      const parentSpec = componentMap[parentType];
      if (!parentSpec) return [];

      // Get valid children from composition rules
      const validChildren = new Set(parentSpec.composition.validChildren);

      // Also check global composition rules
      for (const rule of manifest.composition.rules) {
        if (rule.parent === parentType) {
          for (const child of rule.allowedChildren) {
            validChildren.add(child);
          }
        }
      }

      // Return specs for valid children, ordered by relationship strength
      const relationships = manifest.semantics.relationships.filter(
        (rel) => rel.from === parentType && rel.type === "contains"
      );

      // Sort by strength (highest first)
      relationships.sort((a, b) => (b.strength ?? 0.5) - (a.strength ?? 0.5));

      const results: ComponentSpec[] = [];
      const seen = new Set<string>();

      // Add relationship-based children first (by strength)
      for (const rel of relationships) {
        if (componentMap[rel.to] && !seen.has(rel.to)) {
          results.push(componentMap[rel.to]!);
          seen.add(rel.to);
        }
      }

      // Add remaining valid children
      for (const childType of validChildren) {
        if (componentMap[childType] && !seen.has(childType)) {
          results.push(componentMap[childType]!);
          seen.add(childType);
        }
      }

      return results;
    },

    /**
     * Validate a component composition
     * Checks parent-child relationships against composition rules
     */
    validateComposition(parent: string, children: string[]): ValidationResult {
      const parentSpec = componentMap[parent];

      // Parent must exist
      if (!parentSpec) {
        return {
          valid: false,
          reason: `Unknown component type: ${parent}`,
          severity: "error",
        };
      }

      // Check if parent is a leaf component (no children allowed)
      if (manifest.composition.leafComponents.includes(parent)) {
        if (children.length > 0) {
          return {
            valid: false,
            reason: `${parent} is a leaf component and cannot have children`,
            suggestion: `Remove children or use a container component`,
            severity: "error",
          };
        }
        return { valid: true };
      }

      // Check each child
      const validChildren = new Set(parentSpec.composition.validChildren);
      const invalidChildren: string[] = [];
      const unknownChildren: string[] = [];

      for (const child of children) {
        // Check if child exists
        if (!componentMap[child]) {
          unknownChildren.push(child);
          continue;
        }

        // Check if child is valid for this parent
        // Allow any child if validChildren is empty (permissive)
        if (validChildren.size > 0 && !validChildren.has(child)) {
          // Also check wildcards (e.g., "any" or category matches)
          const childSpec = componentMap[child]!;
          const categoryMatch = Array.from(validChildren).some(
            (v) => v === "any" || childSpec.category.startsWith(v)
          );
          if (!categoryMatch) {
            invalidChildren.push(child);
          }
        }
      }

      // Report unknown children first (higher severity)
      if (unknownChildren.length > 0) {
        return {
          valid: false,
          reason: `Unknown component types: ${unknownChildren.join(", ")}`,
          severity: "error",
        };
      }

      // Report invalid children
      if (invalidChildren.length > 0) {
        const suggestions = invalidChildren
          .map((c) => {
            const alt = componentMap[c]?.usage.alternatives[0];
            return alt ? `${c} -> ${alt.type}` : null;
          })
          .filter(Boolean);

        return {
          valid: false,
          reason: `Invalid children for ${parent}: ${invalidChildren.join(", ")}`,
          suggestion:
            suggestions.length > 0
              ? `Consider: ${suggestions.join(", ")}`
              : `Check composition.validChildren for ${parent}`,
          severity: "warning",
        };
      }

      return { valid: true };
    },

    /**
     * Get alternative components for a given type
     * Based on usage.alternatives
     */
    getAlternatives(type: string): AlternativeSpec[] {
      const spec = componentMap[type];
      if (!spec) return [];

      // Include direct alternatives
      const alternatives: AlternativeSpec[] = [...spec.usage.alternatives];

      // Also include semantic alternatives from relationships
      const semanticAlts = manifest.semantics.relationships.filter(
        (rel) => rel.from === type && rel.type === "alternative"
      );

      for (const rel of semanticAlts) {
        // Avoid duplicates
        if (!alternatives.some((a) => a.type === rel.to)) {
          const altSpec = componentMap[rel.to];
          alternatives.push({
            type: rel.to,
            reason: altSpec?.description ?? `Similar to ${type}`,
          });
        }
      }

      return alternatives;
    },

    /**
     * Search components by text query
     * Searches type, description, category, and usage guidance
     */
    search(query: string): ComponentSpec[] {
      const lowerQuery = query.toLowerCase();
      const terms = lowerQuery.split(/\s+/).filter(Boolean);

      // Score each component based on matches
      const scored = components.map((spec) => {
        let score = 0;

        for (const term of terms) {
          // Type match (highest weight)
          if (spec.type.toLowerCase().includes(term)) {
            score += 10;
          }

          // Category match
          if (spec.category.toLowerCase().includes(term)) {
            score += 5;
          }

          // Description match
          if (spec.description.toLowerCase().includes(term)) {
            score += 3;
          }

          // Usage "when" match
          if (spec.usage.when.some((w) => w.toLowerCase().includes(term))) {
            score += 2;
          }

          // Example names match
          if (spec.examples.some((e) => e.name.toLowerCase().includes(term))) {
            score += 1;
          }
        }

        return { spec, score };
      });

      // Return components with score > 0, sorted by score
      return scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((s) => s.spec);
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a data shape matches a binding expectation
 */
function matchesDataShape(data: DataShape, expected: BindingShape): boolean {
  // Type must match
  if (data.type !== expected.type) {
    return false;
  }

  // For arrays, check item type if specified
  if (data.type === "array" && expected.type === "array") {
    // If expected has shape constraints, data must have items
    if (expected.shape && data.items) {
      // Check if any expected shape property matches items
      return true; // Simplified - arrays are flexible
    }
    return true;
  }

  // For objects, check property overlap
  if (data.type === "object" && expected.type === "object") {
    if (data.properties && expected.shape) {
      // At least one property should match
      const dataKeys = Object.keys(data.properties);
      const expectedKeys = Object.keys(expected.shape);
      return dataKeys.some((k) => expectedKeys.includes(k));
    }
    return true;
  }

  // Primitive types match directly
  return true;
}

// ============================================================================
// Query Builder (Fluent API)
// ============================================================================

/**
 * Fluent query builder for chaining filters
 */
export class ManifestQueryBuilder {
  private manifest: ComponentManifest;
  private results: ComponentSpec[];

  constructor(manifest: ComponentManifest) {
    this.manifest = manifest;
    this.results = Object.values(manifest.components);
  }

  /**
   * Filter by category
   */
  category(category: ComponentCategory | string): ManifestQueryBuilder {
    this.results = this.results.filter(
      (spec) => spec.category === category || spec.category.startsWith(`${category}.`)
    );
    return this;
  }

  /**
   * Filter by features
   */
  hasFeature(feature: keyof FeatureFlags): ManifestQueryBuilder {
    this.results = this.results.filter((spec) => spec.features[feature]);
    return this;
  }

  /**
   * Filter by multiple features
   */
  hasFeatures(features: (keyof FeatureFlags)[]): ManifestQueryBuilder {
    this.results = this.results.filter((spec) =>
      features.every((f) => spec.features[f])
    );
    return this;
  }

  /**
   * Filter by data type acceptance
   */
  acceptsType(type: DataShape["type"]): ManifestQueryBuilder {
    this.results = this.results.filter((spec) =>
      spec.bindings.expects.some((b) => b.type === type)
    );
    return this;
  }

  /**
   * Filter by text search
   */
  matching(query: string): ManifestQueryBuilder {
    const lowerQuery = query.toLowerCase();
    this.results = this.results.filter(
      (spec) =>
        spec.type.toLowerCase().includes(lowerQuery) ||
        spec.description.toLowerCase().includes(lowerQuery) ||
        spec.category.toLowerCase().includes(lowerQuery)
    );
    return this;
  }

  /**
   * Limit results
   */
  limit(n: number): ManifestQueryBuilder {
    this.results = this.results.slice(0, n);
    return this;
  }

  /**
   * Sort by a field
   */
  sortBy(field: "type" | "category"): ManifestQueryBuilder {
    this.results = [...this.results].sort((a, b) => a[field].localeCompare(b[field]));
    return this;
  }

  /**
   * Get results
   */
  get(): ComponentSpec[] {
    return this.results;
  }

  /**
   * Get first result
   */
  first(): ComponentSpec | undefined {
    return this.results[0];
  }

  /**
   * Get count
   */
  count(): number {
    return this.results.length;
  }

  /**
   * Get types only
   */
  types(): string[] {
    return this.results.map((s) => s.type);
  }
}

/**
 * Create a fluent query builder
 */
export function queryManifest(manifest: ComponentManifest): ManifestQueryBuilder {
  return new ManifestQueryBuilder(manifest);
}

// ============================================================================
// Specialized Query Functions
// ============================================================================

/**
 * Find the best component for a given intent
 * Uses semantic matching against usage guidance
 */
export function findComponentForIntent(
  manifest: ComponentManifest,
  intent: string
): ComponentSpec | undefined {
  const query = createManifestQuery(manifest);
  const results = query.search(intent);
  return results[0];
}

/**
 * Get a component by type with validation
 */
export function getComponent(
  manifest: ComponentManifest,
  type: string
): ComponentSpec | undefined {
  return manifest.components[type];
}

/**
 * Get all leaf components (no children allowed)
 */
export function getLeafComponents(manifest: ComponentManifest): ComponentSpec[] {
  return manifest.composition.leafComponents
    .map((type) => manifest.components[type])
    .filter((spec): spec is ComponentSpec => spec !== undefined);
}

/**
 * Get all container components (must have children)
 */
export function getContainerComponents(manifest: ComponentManifest): ComponentSpec[] {
  return manifest.composition.containerComponents
    .map((type) => manifest.components[type])
    .filter((spec): spec is ComponentSpec => spec !== undefined);
}

/**
 * Get components that can be siblings
 */
export function getSiblingComponents(
  manifest: ComponentManifest,
  type: string
): ComponentSpec[] {
  const spec = manifest.components[type];
  if (!spec?.composition.siblings) return [];

  return spec.composition.siblings.recommended
    .map((t) => manifest.components[t])
    .filter((s): s is ComponentSpec => s !== undefined);
}

/**
 * Get components by a specific relationship type
 */
export function getRelatedComponents(
  manifest: ComponentManifest,
  type: string,
  relationshipType: "contains" | "sibling" | "alternative" | "extends"
): ComponentSpec[] {
  const relationships = manifest.semantics.relationships.filter(
    (rel) => rel.from === type && rel.type === relationshipType
  );

  return relationships
    .sort((a, b) => (b.strength ?? 0.5) - (a.strength ?? 0.5))
    .map((rel) => manifest.components[rel.to])
    .filter((spec): spec is ComponentSpec => spec !== undefined);
}

// ============================================================================
// Budgeted Specs (for LLM context generation)
// ============================================================================

/**
 * Get component specs within a token budget
 * Prioritizes specified types, then fills with most common components
 *
 * @param manifest - The component manifest
 * @param context - Context settings (device, audience, fidelity, tokenBudget)
 * @param priorityTypes - Component types to include first
 * @returns Array of component specs within budget
 */
export function getBudgetedSpecs(
  manifest: ComponentManifest,
  context: ManifestContext,
  priorityTypes?: string[]
): ComponentSpec[] {
  const allSpecs = Object.values(manifest.components);
  const budget = context.tokenBudget;

  // Estimate tokens per spec (rough: JSON.stringify length / 4)
  const estimateTokens = (spec: ComponentSpec): number => {
    // Condensed spec tokens (type, description, props summary, bindings)
    const baseTokens = 50; // Type + description
    const propTokens = spec.props.length * 15; // Per prop estimate
    const exampleTokens = context.fidelity === "production" ? spec.examples.length * 30 : 0;
    return baseTokens + propTokens + exampleTokens;
  };

  const results: ComponentSpec[] = [];
  let usedTokens = 0;

  // Add priority types first
  if (priorityTypes) {
    for (const type of priorityTypes) {
      const spec = manifest.components[type];
      if (spec) {
        const tokens = estimateTokens(spec);
        if (usedTokens + tokens <= budget) {
          results.push(spec);
          usedTokens += tokens;
        }
      }
    }
  }

  // Priority order for remaining components based on context
  const categoryPriority = getCategoryPriority(context);

  // Sort remaining specs by priority
  const remaining = allSpecs
    .filter((spec) => !results.includes(spec))
    .sort((a, b) => {
      const aRootCategory = a.category.split(".")[0] ?? "misc";
      const bRootCategory = b.category.split(".")[0] ?? "misc";
      const aIndex = categoryPriority.indexOf(aRootCategory);
      const bIndex = categoryPriority.indexOf(bRootCategory);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

  // Fill with remaining specs
  for (const spec of remaining) {
    const tokens = estimateTokens(spec);
    if (usedTokens + tokens <= budget) {
      results.push(spec);
      usedTokens += tokens;
    }
  }

  return results;
}

/**
 * Get category priority based on context
 */
function getCategoryPriority(context: ManifestContext): string[] {
  // Different priorities based on audience and device
  if (context.audience === "developer") {
    return ["forms", "data-display", "charts", "layout", "feedback", "navigation", "overlays"];
  }
  if (context.audience === "designer") {
    return ["layout", "typography", "data-display", "navigation", "forms", "feedback", "overlays"];
  }
  // business audience
  return ["charts", "data-display", "layout", "forms", "navigation", "feedback", "overlays"];
}

// ============================================================================
// Exports
// ============================================================================

export default createManifestQuery;
