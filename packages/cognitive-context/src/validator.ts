/**
 * Completeness Validator
 *
 * Validates that documented capabilities match extracted code entities.
 * Ensures the knowledge graph stays in sync with actual code.
 */

import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import type {
  KnowledgeGraph,
  ValidationResult,
  ValidationWarning,
  EntityType,
} from './types.js';

// ============================================
// Types
// ============================================

/**
 * Represents a single capability entry in the YAML file
 */
export interface CapabilityEntry {
  /** The file path or package reference */
  path: string;
  /** Original key in the YAML (e.g., 'line', 'bar') */
  key: string;
  /** Full qualified path (e.g., 'ui_components.charts.line') */
  qualifiedPath: string;
  /** Inferred entity type */
  type?: EntityType;
}

/**
 * Parsed capabilities.yaml structure
 */
export interface DocumentedCapabilities {
  /** Flattened list of all capability entries */
  entries: CapabilityEntry[];
  /** Raw YAML structure for reference */
  raw: Record<string, unknown>;
  /** Top-level categories found */
  categories: string[];
  /** File path this was loaded from */
  sourcePath?: string;
}

/**
 * Options for validation
 */
export interface ValidateOptions {
  /**
   * Minimum confidence score to consider an entity match (0-100)
   * @default 80
   */
  minConfidence?: number;

  /**
   * Whether to include warnings for partial matches
   * @default true
   */
  includePartialMatches?: boolean;

  /**
   * Categories to skip during validation
   * @default ['framework', 'packages_available', 'patterns']
   */
  skipCategories?: string[];

  /**
   * Whether to be strict about entity type matching
   * @default false
   */
  strictTypeMatching?: boolean;
}

// ============================================
// Constants
// ============================================

const DEFAULT_OPTIONS: Required<ValidateOptions> = {
  minConfidence: 80,
  includePartialMatches: true,
  skipCategories: ['framework', 'packages_available', 'patterns', 'data_models'],
  strictTypeMatching: false,
};

/**
 * Categories that typically contain code entities (for future use in auto-categorization)
 */
const _CODE_CATEGORIES = ['ui_components', 'hooks', 'utilities', 'schemas', 'api'];
void _CODE_CATEGORIES; // Reserved for future use

// ============================================
// Helper Functions
// ============================================

/**
 * Flatten a nested YAML object into capability entries
 */
function flattenCapabilities(
  obj: unknown,
  parentPath: string = '',
  entries: CapabilityEntry[] = []
): CapabilityEntry[] {
  if (obj === null || obj === undefined) {
    return entries;
  }

  if (typeof obj === 'string') {
    // Leaf node - this is a file path
    const key = parentPath.split('.').pop() || parentPath;
    entries.push({
      path: obj,
      key,
      qualifiedPath: parentPath,
      type: inferEntityType(parentPath, obj),
    });
    return entries;
  }

  if (typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // Skip keys that start with underscore (metadata like _docs)
      if (key.startsWith('_')) {
        continue;
      }

      const newPath = parentPath ? `${parentPath}.${key}` : key;
      flattenCapabilities(value, newPath, entries);
    }
  }

  if (Array.isArray(obj)) {
    // Arrays in capabilities are typically lists of items, not file paths
    // Skip them for validation purposes
    return entries;
  }

  return entries;
}

/**
 * Infer entity type from the qualified path and file path
 */
function inferEntityType(qualifiedPath: string, filePath: string): EntityType | undefined {
  const pathLower = qualifiedPath.toLowerCase();
  const filePathLower = filePath.toLowerCase();

  if (pathLower.includes('component') || pathLower.includes('ui_components')) {
    return 'component';
  }
  if (pathLower.includes('hook') || filePathLower.includes('use')) {
    return 'hook';
  }
  if (pathLower.includes('schema') || filePathLower.includes('schema')) {
    return 'schema';
  }
  if (pathLower.includes('api') || pathLower.includes('endpoint')) {
    return 'endpoint';
  }
  if (pathLower.includes('util') || pathLower.includes('helper')) {
    return 'utility';
  }

  return undefined;
}

/**
 * Extract entity name from a file path
 */
function extractEntityName(filePath: string): string {
  // Handle paths like 'liquid-render/components/data-table.tsx'
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1];

  // Remove extension
  const nameWithoutExt = fileName.replace(/\.(tsx?|jsx?|js)$/, '');

  // Convert kebab-case to PascalCase for components
  return nameWithoutExt
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Normalize an entity name for comparison
 */
function normalizeEntityName(name: string): string {
  return name
    .toLowerCase()
    // Remove common prefixes/suffixes
    .replace(/^(use|get|set|is|has)/, '')
    .replace(/(component|hook|util|helper|schema)$/, '')
    // Convert any case to lowercase
    .replace(/([A-Z])/g, '-$1')
    .replace(/^-/, '')
    .replace(/-+/g, '-');
}

/**
 * Calculate similarity between two strings (0-100)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeEntityName(str1);
  const s2 = normalizeEntityName(str2);

  if (s1 === s2) return 100;

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    return Math.round((shorter.length / longer.length) * 100);
  }

  // Levenshtein distance-based similarity
  const matrix: number[][] = [];
  const n = s1.length;
  const m = s2.length;

  if (n === 0) return m === 0 ? 100 : 0;
  if (m === 0) return 0;

  for (let i = 0; i <= n; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= m; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(n, m);
  const distance = matrix[n][m];
  return Math.round(((maxLen - distance) / maxLen) * 100);
}

/**
 * Find the best matching documented entity for a code entity
 */
function findBestMatch(
  entityName: string,
  documentedEntries: CapabilityEntry[],
  minConfidence: number
): { entry: CapabilityEntry; confidence: number } | null {
  let bestMatch: { entry: CapabilityEntry; confidence: number } | null = null;

  for (const entry of documentedEntries) {
    const documentedName = extractEntityName(entry.path);
    const similarity = calculateSimilarity(entityName, documentedName);

    // Also check the key itself
    const keySimilarity = calculateSimilarity(entityName, entry.key);
    const maxSimilarity = Math.max(similarity, keySimilarity);

    if (maxSimilarity >= minConfidence) {
      if (!bestMatch || maxSimilarity > bestMatch.confidence) {
        bestMatch = { entry, confidence: maxSimilarity };
      }
    }
  }

  return bestMatch;
}

/**
 * Calculate the completeness score
 */
function calculateScore(
  totalEntities: number,
  missingCount: number,
  staleCount: number
): number {
  if (totalEntities === 0) {
    return 100; // Nothing to validate
  }

  const issueCount = missingCount + staleCount;
  const score = 100 - (issueCount / totalEntities) * 100;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Generate suggestions based on validation findings
 */
function generateSuggestions(
  missing: string[],
  stale: string[],
  warnings: ValidationWarning[]
): string[] {
  const suggestions: string[] = [];

  if (missing.length > 0) {
    if (missing.length <= 3) {
      suggestions.push(
        `Add documentation for: ${missing.join(', ')}`
      );
    } else {
      suggestions.push(
        `Add documentation for ${missing.length} undocumented entities (run with --verbose for full list)`
      );
    }
  }

  if (stale.length > 0) {
    if (stale.length <= 3) {
      suggestions.push(
        `Remove or update stale entries: ${stale.join(', ')}`
      );
    } else {
      suggestions.push(
        `Clean up ${stale.length} stale documentation entries`
      );
    }
  }

  const lowConfidenceWarnings = warnings.filter(w => w.type === 'low-confidence');
  if (lowConfidenceWarnings.length > 0) {
    suggestions.push(
      'Review entities with low-confidence matches - names may have drifted'
    );
  }

  const incompleteWarnings = warnings.filter(w => w.type === 'incomplete');
  if (incompleteWarnings.length > 0) {
    suggestions.push(
      'Some documented entries reference files that could not be verified'
    );
  }

  if (suggestions.length === 0) {
    suggestions.push('Documentation is complete and up-to-date!');
  }

  return suggestions;
}

/**
 * Check if a category should be validated (contains code references)
 */
function shouldValidateCategory(category: string, skipCategories: string[]): boolean {
  return !skipCategories.includes(category);
}

// ============================================
// YAML Parsing
// ============================================

/**
 * Parse a capabilities YAML file into structured format
 */
export function parseCapabilitiesYaml(
  content: string,
  sourcePath?: string
): DocumentedCapabilities {
  const raw = parseYaml(content) as Record<string, unknown>;
  const categories = Object.keys(raw).filter(k => !k.startsWith('_'));
  const entries = flattenCapabilities(raw);

  return {
    entries,
    raw,
    categories,
    sourcePath,
  };
}

/**
 * Load and parse a capabilities.yaml file
 */
export async function loadCapabilitiesFile(
  filePath: string
): Promise<DocumentedCapabilities> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return parseCapabilitiesYaml(content, filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File doesn't exist - return empty capabilities
      return {
        entries: [],
        raw: {},
        categories: [],
        sourcePath: filePath,
      };
    }
    throw new Error(
      `Failed to load capabilities file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ============================================
// Main Validation Functions
// ============================================

/**
 * Validate that documented capabilities match the knowledge graph
 *
 * @param knowledgeGraph - Extracted entities from code
 * @param documentedCapabilities - Parsed capabilities.yaml content
 * @param options - Validation options
 * @returns Validation result with score, missing/stale entities, and suggestions
 */
export function validateCompleteness(
  knowledgeGraph: KnowledgeGraph,
  documentedCapabilities: DocumentedCapabilities,
  options: ValidateOptions = {}
): ValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const missing: string[] = [];
  const stale: string[] = [];
  const warnings: ValidationWarning[] = [];

  // Get entities from the knowledge graph
  const codeEntities = Object.values(knowledgeGraph.entities);

  // Filter documented entries to only include code-relevant categories
  const codeRelatedEntries = documentedCapabilities.entries.filter(entry => {
    const category = entry.qualifiedPath.split('.')[0];
    return shouldValidateCategory(category, opts.skipCategories);
  });

  // Track which documented entries have been matched
  const matchedDocumentedEntries = new Set<string>();
  const matchedCodeEntities = new Set<string>();

  // Check each code entity against documentation
  for (const entity of codeEntities) {
    const match = findBestMatch(entity.name, codeRelatedEntries, opts.minConfidence);

    if (match) {
      matchedDocumentedEntries.add(match.entry.qualifiedPath);
      matchedCodeEntities.add(entity.name);

      // Add warning for low-confidence matches
      if (match.confidence < 100 && match.confidence >= opts.minConfidence) {
        warnings.push({
          type: 'low-confidence',
          entity: entity.name,
          message: `Matched to '${match.entry.qualifiedPath}' with ${match.confidence}% confidence`,
        });
      }

      // Check type mismatch if strict matching is enabled
      if (opts.strictTypeMatching && match.entry.type && match.entry.type !== entity.type) {
        warnings.push({
          type: 'incomplete',
          entity: entity.name,
          message: `Type mismatch: documented as '${match.entry.type}', code is '${entity.type}'`,
        });
      }
    } else {
      // Entity in code but not documented
      missing.push(entity.name);
    }
  }

  // Find stale documentation (documented but not in code)
  for (const entry of codeRelatedEntries) {
    if (!matchedDocumentedEntries.has(entry.qualifiedPath)) {
      // Check if the path contains a package reference (not a file path)
      const isPackageRef = entry.path.startsWith('@') || !entry.path.includes('/');

      if (!isPackageRef) {
        stale.push(entry.qualifiedPath);
        warnings.push({
          type: 'outdated',
          entity: entry.qualifiedPath,
          message: `Documented entry '${entry.path}' not found in extracted code`,
        });
      }
    }
  }

  // Calculate total entities for scoring
  // Consider both documented and code entities
  const totalEntities = new Set([
    ...codeEntities.map(e => e.name),
    ...codeRelatedEntries.map(e => e.qualifiedPath),
  ]).size;

  const score = calculateScore(totalEntities, missing.length, stale.length);
  const suggestions = generateSuggestions(missing, stale, warnings);

  return {
    score,
    missing,
    stale,
    warnings,
    suggestions,
    validatedAt: new Date(),
  };
}

/**
 * Validate a capabilities file against a knowledge graph
 *
 * Convenience function that loads the capabilities file and runs validation.
 *
 * @param filePath - Path to capabilities.yaml file
 * @param knowledgeGraph - Extracted knowledge graph
 * @param options - Validation options
 * @returns Validation result
 */
export async function validateCapabilitiesFile(
  filePath: string,
  knowledgeGraph: KnowledgeGraph,
  options: ValidateOptions = {}
): Promise<ValidationResult> {
  const capabilities = await loadCapabilitiesFile(filePath);
  return validateCompleteness(knowledgeGraph, capabilities, options);
}

/**
 * Create an empty validation result (for cases with no data)
 */
export function createEmptyValidationResult(): ValidationResult {
  return {
    score: 100,
    missing: [],
    stale: [],
    warnings: [],
    suggestions: ['No entities to validate'],
    validatedAt: new Date(),
  };
}

/**
 * Check if a validation result indicates issues
 */
export function hasValidationIssues(result: ValidationResult): boolean {
  return result.missing.length > 0 || result.stale.length > 0;
}

/**
 * Format validation result as a human-readable string
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push(`Completeness Score: ${result.score}%`);
  lines.push('');

  if (result.missing.length > 0) {
    lines.push(`Missing from documentation (${result.missing.length}):`);
    for (const entity of result.missing.slice(0, 10)) {
      lines.push(`  - ${entity}`);
    }
    if (result.missing.length > 10) {
      lines.push(`  ... and ${result.missing.length - 10} more`);
    }
    lines.push('');
  }

  if (result.stale.length > 0) {
    lines.push(`Stale documentation (${result.stale.length}):`);
    for (const entry of result.stale.slice(0, 10)) {
      lines.push(`  - ${entry}`);
    }
    if (result.stale.length > 10) {
      lines.push(`  ... and ${result.stale.length - 10} more`);
    }
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push(`Warnings (${result.warnings.length}):`);
    for (const warning of result.warnings.slice(0, 5)) {
      lines.push(`  [${warning.type}] ${warning.entity}: ${warning.message}`);
    }
    if (result.warnings.length > 5) {
      lines.push(`  ... and ${result.warnings.length - 5} more`);
    }
    lines.push('');
  }

  lines.push('Suggestions:');
  for (const suggestion of result.suggestions) {
    lines.push(`  - ${suggestion}`);
  }

  return lines.join('\n');
}
