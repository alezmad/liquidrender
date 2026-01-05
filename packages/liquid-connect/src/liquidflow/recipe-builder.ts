// LiquidFlow - Recipe Builder
// Converts KPI recipes (SemanticMetricDefinition) to LiquidFlow IR
//
// Phase 3 implementation: KPI Recipe → LiquidFlow → SQL → Execution

import type { LiquidFlow, ResolvedMetric, ResolvedFilter, ResolvedSource } from './types';
import type { FilterOperator, AggregationType } from '../types';

/**
 * SemanticMetricDefinition from KPI recipes (simplified for this module)
 * Full type is in @turbostarter/ai/kpi
 */
export interface SemanticMetricDefinition {
  type: 'simple' | 'derived' | 'cumulative';
  expression: string;
  aggregation?: 'SUM' | 'AVG' | 'COUNT' | 'COUNT_DISTINCT' | 'MIN' | 'MAX';
  entity: string;
  timeField?: string;
  timeGranularity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  filters?: FilterCondition[];
  dependencies?: string[];
  label?: string;
  description?: string;
  unit?: string;
  format?: {
    type: 'number' | 'currency' | 'percent' | 'duration';
    decimals?: number;
    currency?: string;
    prefix?: string;
    suffix?: string;
  };
}

/**
 * Filter condition from KPI recipes
 */
export interface FilterCondition {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'IN' | 'NOT IN' | 'LIKE' | 'IS NULL' | 'IS NOT NULL';
  value?: string | number | boolean | (string | number)[];
}

/**
 * KPI Recipe (from @turbostarter/ai/kpi)
 */
export interface CalculatedMetricRecipe {
  name: string;
  description: string;
  category: 'revenue' | 'growth' | 'retention' | 'engagement' | 'efficiency' | 'custom';
  semanticDefinition: SemanticMetricDefinition;
  businessType: string[];
  confidence: number;
  feasible: boolean;
  infeasibilityReason?: string;
  requiredColumns?: Array<{
    tableName: string;
    columnName: string;
    purpose: string;
  }>;
}

/**
 * Options for building LiquidFlow from recipe
 */
export interface RecipeBuildOptions {
  /** Schema to prefix table names */
  schema?: string;
  /** Database/catalog to prefix */
  database?: string;
  /** Time range for the query (ISO date strings) */
  timeRange?: {
    start: string;
    end: string;
  };
  /** Additional filters to apply */
  additionalFilters?: FilterCondition[];
  /** Limit results */
  limit?: number;
}

/**
 * Map KPI filter operator to LiquidFlow filter operator
 */
function mapFilterOperator(op: FilterCondition['operator']): FilterOperator {
  // Most operators are the same
  return op as FilterOperator;
}

/**
 * Map KPI aggregation to LiquidFlow aggregation
 */
function mapAggregation(agg?: SemanticMetricDefinition['aggregation']): AggregationType {
  if (!agg) {
    return 'SUM'; // Default to SUM for simple metrics
  }
  return agg as AggregationType;
}

/**
 * Convert a single filter condition to ResolvedFilter
 */
function convertFilter(filter: FilterCondition): ResolvedFilter {
  return {
    type: 'predicate',
    field: filter.field,
    operator: mapFilterOperator(filter.operator),
    value: filter.value,
  };
}

/**
 * Generate a slug from metric name for use as ref/alias
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Build LiquidFlow from a single KPI recipe
 *
 * This is the core Phase 3 function that converts semantic metric definitions
 * into executable LiquidFlow IR, which can then be emitted to SQL.
 *
 * @param recipe - The calculated metric recipe from KPI generation
 * @param options - Build options (schema, time range, etc.)
 * @returns LiquidFlow IR ready for emission
 */
export function buildLiquidFlowFromRecipe(
  recipe: CalculatedMetricRecipe,
  options: RecipeBuildOptions = {}
): LiquidFlow {
  const { semanticDefinition } = recipe;
  const metricRef = slugify(recipe.name);

  // Build the resolved metric
  const metric: ResolvedMetric = {
    ref: metricRef,
    alias: recipe.name,
    aggregation: mapAggregation(semanticDefinition.aggregation),
    expression: semanticDefinition.expression,
    sourceEntity: semanticDefinition.entity,
    timeField: semanticDefinition.timeField,
    derived: semanticDefinition.type === 'derived',
  };

  // Build the source
  const source: ResolvedSource = {
    alias: semanticDefinition.entity,
    table: semanticDefinition.entity,
    schema: options.schema,
    database: options.database,
  };

  // Build filters from recipe + options
  const filters: ResolvedFilter[] = [];

  // Add recipe filters
  if (semanticDefinition.filters) {
    for (const filter of semanticDefinition.filters) {
      filters.push(convertFilter(filter));
    }
  }

  // Add additional filters from options
  if (options.additionalFilters) {
    for (const filter of options.additionalFilters) {
      filters.push(convertFilter(filter));
    }
  }

  // Build time constraint if timeField is specified
  let time: LiquidFlow['time'];
  if (semanticDefinition.timeField && options.timeRange) {
    time = {
      field: `${semanticDefinition.entity}.${semanticDefinition.timeField}`,
      start: options.timeRange.start,
      end: options.timeRange.end,
      expression: `BETWEEN '${options.timeRange.start}' AND '${options.timeRange.end}'`,
    };
  }

  // Build the LiquidFlow IR
  const flow: LiquidFlow = {
    version: '0.1.0',
    type: 'metric',
    metrics: [metric],
    sources: [source],
    joins: [],
    filters: filters.length > 0 ? filters : undefined,
    time,
    limit: options.limit,
    metadata: {
      compiledAt: new Date().toISOString(),
      compilerVersion: '0.1.0',
      originalQuery: `KPI: ${recipe.name}`,
      complexity: estimateComplexity(recipe),
    },
  };

  return flow;
}

/**
 * Build LiquidFlow for multiple recipes (batch execution)
 *
 * When metrics share the same entity, they can be computed in a single query.
 * This function groups recipes by entity and creates optimized flows.
 *
 * @param recipes - Array of calculated metric recipes
 * @param options - Build options
 * @returns Array of LiquidFlow IRs (grouped by entity for efficiency)
 */
export function buildLiquidFlowsFromRecipes(
  recipes: CalculatedMetricRecipe[],
  options: RecipeBuildOptions = {}
): LiquidFlow[] {
  // Group recipes by entity for query optimization
  const byEntity = new Map<string, CalculatedMetricRecipe[]>();

  for (const recipe of recipes) {
    const entity = recipe.semanticDefinition.entity;
    const existing = byEntity.get(entity) || [];
    existing.push(recipe);
    byEntity.set(entity, existing);
  }

  // Build a flow for each entity group
  const flows: LiquidFlow[] = [];

  for (const [entity, entityRecipes] of byEntity) {
    if (entityRecipes.length === 1) {
      // Single recipe - use simple builder
      flows.push(buildLiquidFlowFromRecipe(entityRecipes[0]!, options));
    } else {
      // Multiple recipes for same entity - combine into single flow
      flows.push(buildCombinedFlow(entityRecipes, entity, options));
    }
  }

  return flows;
}

/**
 * Build a combined LiquidFlow for multiple metrics on the same entity
 */
function buildCombinedFlow(
  recipes: CalculatedMetricRecipe[],
  entity: string,
  options: RecipeBuildOptions
): LiquidFlow {
  // Build metrics array
  const metrics: ResolvedMetric[] = recipes.map((recipe) => {
    const metricRef = slugify(recipe.name);
    return {
      ref: metricRef,
      alias: recipe.name,
      aggregation: mapAggregation(recipe.semanticDefinition.aggregation),
      expression: recipe.semanticDefinition.expression,
      sourceEntity: entity,
      timeField: recipe.semanticDefinition.timeField,
      derived: recipe.semanticDefinition.type === 'derived',
    };
  });

  // Build the source
  const source: ResolvedSource = {
    alias: entity,
    table: entity,
    schema: options.schema,
    database: options.database,
  };

  // Collect all unique filters
  const filterMap = new Map<string, ResolvedFilter>();
  for (const recipe of recipes) {
    if (recipe.semanticDefinition.filters) {
      for (const filter of recipe.semanticDefinition.filters) {
        const key = `${filter.field}:${filter.operator}:${JSON.stringify(filter.value)}`;
        if (!filterMap.has(key)) {
          filterMap.set(key, convertFilter(filter));
        }
      }
    }
  }

  // Add additional filters from options
  if (options.additionalFilters) {
    for (const filter of options.additionalFilters) {
      const key = `${filter.field}:${filter.operator}:${JSON.stringify(filter.value)}`;
      if (!filterMap.has(key)) {
        filterMap.set(key, convertFilter(filter));
      }
    }
  }

  const filters = Array.from(filterMap.values());

  // Find common time field (use first one that has it)
  const timeField = recipes.find((r) => r.semanticDefinition.timeField)?.semanticDefinition.timeField;

  let time: LiquidFlow['time'];
  if (timeField && options.timeRange) {
    time = {
      field: `${entity}.${timeField}`,
      start: options.timeRange.start,
      end: options.timeRange.end,
      expression: `BETWEEN '${options.timeRange.start}' AND '${options.timeRange.end}'`,
    };
  }

  return {
    version: '0.1.0',
    type: 'metric',
    metrics,
    sources: [source],
    joins: [],
    filters: filters.length > 0 ? filters : undefined,
    time,
    limit: options.limit,
    metadata: {
      compiledAt: new Date().toISOString(),
      compilerVersion: '0.1.0',
      originalQuery: `Combined KPIs: ${recipes.map((r) => r.name).join(', ')}`,
      complexity: recipes.reduce((sum, r) => sum + estimateComplexity(r), 0),
    },
  };
}

/**
 * Estimate query complexity for optimization hints
 */
function estimateComplexity(recipe: CalculatedMetricRecipe): number {
  let complexity = 1;

  const def = recipe.semanticDefinition;

  // Derived metrics are more complex
  if (def.type === 'derived') {
    complexity += 2;
  }

  // Each filter adds complexity
  if (def.filters) {
    complexity += def.filters.length * 0.5;
  }

  // Time-series adds complexity
  if (def.timeField) {
    complexity += 1;
  }

  // COUNT_DISTINCT is expensive
  if (def.aggregation === 'COUNT_DISTINCT') {
    complexity += 2;
  }

  return Math.round(complexity);
}

/**
 * Validate that a recipe can be converted to LiquidFlow
 *
 * @param recipe - Recipe to validate
 * @returns Validation result with any errors
 */
export function validateRecipeForFlow(recipe: CalculatedMetricRecipe): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check feasibility
  if (!recipe.feasible) {
    errors.push(`Recipe "${recipe.name}" is marked as infeasible: ${recipe.infeasibilityReason || 'unknown reason'}`);
  }

  // Check required fields
  const def = recipe.semanticDefinition;

  if (!def.entity) {
    errors.push('Missing entity (source table)');
  }

  if (!def.expression) {
    errors.push('Missing expression (column or formula)');
  }

  // Simple metrics require aggregation
  if (def.type === 'simple' && !def.aggregation) {
    errors.push('Simple metrics require an aggregation function');
  }

  // Derived metrics require dependencies
  if (def.type === 'derived' && (!def.dependencies || def.dependencies.length === 0)) {
    // Not strictly required, but warn
    // errors.push('Derived metrics typically have dependencies');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
