// Component Intelligence Layer - LLM Context Generator
// Generates optimized, token-budgeted context for LLM consumption
// Enables adaptive manifest delivery based on context and requirements

import type {
  ComponentManifest,
  ComponentSpec,
  ManifestContext,
  CompositionPattern,
  AntiPattern,
  TokenManifest,
} from "./types";
import { buildDefaultManifest } from "./builder";
import { createManifestQuery, getBudgetedSpecs } from "./query";

// ============================================================================
// LLM Context Types
// ============================================================================

export interface LLMContext {
  /** Context version for cache invalidation */
  version: string;
  /** Generation timestamp */
  generatedAt: string;
  /** Token budget used */
  tokensUsed: number;
  /** System prompt section */
  systemPrompt: string;
  /** Component reference (condensed specs) */
  componentReference: string;
  /** Composition guidance */
  compositionGuidance: string;
  /** Design tokens summary */
  tokensSummary: string;
}

export interface GenerateContextOptions {
  /** Manifest to generate context from */
  manifest?: ComponentManifest;
  /** Context settings (device, audience, fidelity, budget) */
  context: ManifestContext;
  /** Component types to prioritize */
  priorityTypes?: string[];
  /** Include examples in component specs */
  includeExamples?: boolean;
  /** Include accessibility info */
  includeA11y?: boolean;
  /** Include composition patterns */
  includePatterns?: boolean;
}

// ============================================================================
// Context Generation
// ============================================================================

/**
 * Generate optimized LLM context from a manifest
 * Respects token budget and adapts to context
 *
 * @example
 * const context = generateLLMContext({
 *   context: { device: "desktop", audience: "developer", fidelity: "production", tokenBudget: 10000 },
 *   priorityTypes: ["card", "data-table", "bar-chart"],
 * });
 */
export function generateLLMContext(options: GenerateContextOptions): LLMContext {
  const {
    manifest = buildDefaultManifest(),
    context,
    priorityTypes,
    includeExamples = true,
    includeA11y = false,
    includePatterns = true,
  } = options;

  // Get budgeted specs
  const specs = getBudgetedSpecs(manifest, context, priorityTypes);

  // Generate sections
  const systemPrompt = generateSystemPrompt(manifest, context);
  const componentReference = generateComponentReference(specs, includeExamples, includeA11y);
  const compositionGuidance = includePatterns
    ? generateCompositionGuidance(manifest)
    : "";
  const tokensSummary = generateTokensSummary(manifest.tokens);

  // Estimate tokens (rough: 4 chars per token)
  const totalText = systemPrompt + componentReference + compositionGuidance + tokensSummary;
  const tokensUsed = Math.ceil(totalText.length / 4);

  return {
    version: manifest.version,
    generatedAt: new Date().toISOString(),
    tokensUsed,
    systemPrompt,
    componentReference,
    compositionGuidance,
    tokensSummary,
  };
}

// ============================================================================
// Section Generators
// ============================================================================

function generateSystemPrompt(manifest: ComponentManifest, context: ManifestContext): string {
  const lines = [
    "# LiquidRender Component System",
    "",
    `Theme: ${manifest.meta.name} v${manifest.meta.version}`,
    `Components: ${Object.keys(manifest.components).length}`,
    `Target: ${context.device} / ${context.audience} / ${context.fidelity}`,
    "",
    "## DSL Syntax",
    "",
    "Components are specified as JSON with:",
    "- `type`: Component type (e.g., 'card', 'data-table')",
    "- `props`: Static properties",
    "- `binding`: Data binding expression (e.g., '{{data.users}}')",
    "- `children`: Nested components",
    "",
    "Example:",
    "```json",
    "{",
    '  "type": "card",',
    '  "props": { "title": "Users" },',
    '  "children": [',
    '    { "type": "data-table", "binding": "{{data.users}}" }',
    "  ]",
    "}",
    "```",
    "",
  ];

  return lines.join("\n");
}

function generateComponentReference(
  specs: ComponentSpec[],
  includeExamples: boolean,
  includeA11y: boolean
): string {
  const lines = ["## Component Reference", ""];

  // Group by category
  const byCategory = new Map<string, ComponentSpec[]>();
  for (const spec of specs) {
    const root = spec.category.split(".")[0] ?? "misc";
    const existing = byCategory.get(root) ?? [];
    existing.push(spec);
    byCategory.set(root, existing);
  }

  for (const [category, categorySpecs] of byCategory) {
    lines.push(`### ${capitalize(category)}`, "");

    for (const spec of categorySpecs) {
      lines.push(`#### ${spec.type}`, "");
      lines.push(spec.description, "");

      // Props summary (condensed)
      const requiredProps = spec.props.filter((p) => p.required);
      if (requiredProps.length > 0) {
        lines.push("**Required props:**");
        for (const prop of requiredProps) {
          lines.push(`- \`${prop.name}\`: ${prop.type} - ${prop.description}`);
        }
        lines.push("");
      }

      // Binding info
      if (spec.bindings.expects.length > 0) {
        const bindingTypes = spec.bindings.expects.map((e) => e.type).join(" | ");
        lines.push(`**Binding:** ${bindingTypes}`, "");
      }

      // Features (condensed)
      const activeFeatures = Object.entries(spec.features)
        .filter(([, v]) => v)
        .map(([k]) => k);
      if (activeFeatures.length > 0) {
        lines.push(`**Features:** ${activeFeatures.join(", ")}`, "");
      }

      // Usage guidance
      if (spec.usage.when.length > 0) {
        lines.push(`**Use when:** ${spec.usage.when[0]}`);
      }
      if (spec.usage.avoid.length > 0) {
        lines.push(`**Avoid when:** ${spec.usage.avoid[0]}`);
      }
      lines.push("");

      // A11y (optional)
      if (includeA11y && spec.a11y.requirements.length > 0) {
        lines.push(`**A11y:** ${spec.a11y.requirements.join("; ")}`, "");
      }

      // Example (optional, first one only)
      if (includeExamples && spec.examples.length > 0) {
        const ex = spec.examples[0]!;
        lines.push("**Example:**", "```json", ex.dsl, "```", "");
      }
    }
  }

  return lines.join("\n");
}

function generateCompositionGuidance(manifest: ComponentManifest): string {
  const lines = ["## Composition Patterns", ""];

  // Top patterns
  const patterns = manifest.semantics.patterns.slice(0, 5);
  for (const pattern of patterns) {
    lines.push(`### ${pattern.name}`, "");
    lines.push(pattern.description, "");
    lines.push("```", pattern.structure, "```", "");
  }

  // Anti-patterns
  lines.push("## Anti-Patterns (Avoid)", "");
  const antiPatterns = manifest.semantics.antiPatterns.slice(0, 5);
  for (const ap of antiPatterns) {
    lines.push(`- **${ap.name}**: ${ap.description}`);
    lines.push(`  Fix: ${ap.fix}`);
  }
  lines.push("");

  // Composition rules
  lines.push("## Composition Rules", "");
  lines.push(`- Max nesting depth: ${manifest.composition.maxNestingDepth}`);
  lines.push(`- Leaf components (no children): ${manifest.composition.leafComponents.slice(0, 10).join(", ")}...`);
  lines.push(`- Container components (require children): ${manifest.composition.containerComponents.slice(0, 10).join(", ")}...`);
  lines.push("");

  return lines.join("\n");
}

function generateTokensSummary(tokens: TokenManifest): string {
  const lines = ["## Design Tokens", ""];

  // Colors (key ones)
  lines.push("**Colors:**");
  const keyColors = ["primary", "secondary", "success", "warning", "danger", "muted"];
  for (const key of keyColors) {
    const token = tokens.colors[key];
    if (token) {
      lines.push(`- ${key}: ${token.value}`);
    }
  }
  lines.push("");

  // Spacing
  lines.push("**Spacing:** " + Object.keys(tokens.spacing).join(", "));

  // Radius
  lines.push("**Border radius:** " + Object.keys(tokens.radius).join(", "));

  // Font sizes
  lines.push("**Font sizes:** " + Object.keys(tokens.fontSize).join(", "));

  lines.push("");

  return lines.join("\n");
}

// ============================================================================
// Specialized Context Generators
// ============================================================================

/**
 * Generate minimal context for quick component suggestions
 */
export function generateQuickContext(
  intent: string,
  manifest?: ComponentManifest
): string {
  const m = manifest ?? buildDefaultManifest();
  const query = createManifestQuery(m);
  const matches = query.search(intent).slice(0, 5);

  const lines = [
    `# Components for "${intent}"`,
    "",
    ...matches.map((spec) => {
      return `- **${spec.type}**: ${spec.description}`;
    }),
  ];

  return lines.join("\n");
}

/**
 * Generate context focused on a specific component
 */
export function generateComponentContext(
  type: string,
  manifest?: ComponentManifest
): string {
  const m = manifest ?? buildDefaultManifest();
  const spec = m.components[type];

  if (!spec) {
    return `Component "${type}" not found.`;
  }

  const lines = [
    `# ${spec.type}`,
    "",
    spec.description,
    "",
    "## Props",
    "",
    ...spec.props.map((p) => {
      const req = p.required ? "(required)" : "(optional)";
      const def = p.default !== undefined ? ` default: ${JSON.stringify(p.default)}` : "";
      return `- \`${p.name}\`: ${p.type} ${req}${def} - ${p.description}`;
    }),
    "",
    "## Binding",
    "",
    ...spec.bindings.expects.map((e) => `- ${e.type}: ${e.description}`),
    "",
    "## Valid Children",
    "",
    spec.composition.validChildren.length > 0
      ? spec.composition.validChildren.join(", ")
      : "(leaf component)",
    "",
    "## Examples",
    "",
    ...spec.examples.map((ex) => [`### ${ex.name}`, "```json", ex.dsl, "```", ""]).flat(),
  ];

  return lines.join("\n");
}

/**
 * Generate context for composition validation
 */
export function generateCompositionContext(
  parentType: string,
  manifest?: ComponentManifest
): string {
  const m = manifest ?? buildDefaultManifest();
  const spec = m.components[parentType];

  if (!spec) {
    return `Component "${parentType}" not found.`;
  }

  const lines = [
    `# Composition for ${spec.type}`,
    "",
    "## Valid Children",
    "",
    ...spec.composition.validChildren.map((c) => {
      const childSpec = m.components[c];
      return `- **${c}**: ${childSpec?.description ?? "Unknown"}`;
    }),
    "",
    "## Siblings (recommended)",
    "",
    ...(spec.composition.siblings?.recommended ?? []).map((s) => `- ${s}`),
    "",
    "## Avoid with",
    "",
    ...(spec.composition.siblings?.discouraged ?? []).map((s) => `- ${s}`),
  ];

  return lines.join("\n");
}

// ============================================================================
// Utilities
// ============================================================================

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// Exports
// ============================================================================

export default generateLLMContext;
