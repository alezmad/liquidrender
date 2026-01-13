// KPI Module
// Complete pipeline for KPI recipe execution

export {
  compileRecipeToSQL,
  compileRecipesToSQL,
  executeCompiledMetric,
  executeRecipe,
  executeRecipes,
  previewRecipeSQL,
  type CompiledMetric,
  type MetricExecutionResult,
  type KPIExecutionOptions,
} from './execute';

// Re-export recipe builder types for convenience
export {
  buildLiquidFlowFromRecipe,
  buildLiquidFlowsFromRecipes,
  validateRecipeForFlow,
  type CalculatedMetricRecipe,
  type SemanticMetricDefinition,
  type FilterCondition,
  type RecipeBuildOptions,
} from '../liquidflow/recipe-builder';

// ============================================================================
// NEW: DSL-based KPI Compilation
// ============================================================================

// KPI Semantic Types (dialect-agnostic definitions)
export {
  type KPISemanticDefinition,
  type SimpleKPIDefinition,
  type RatioKPIDefinition,
  type DerivedKPIDefinition,
  type AggregationComponent,
  type KPIFilter,
  isSimpleKPI,
  isRatioKPI,
  isDerivedKPI,
  validateKPIDefinition,
} from './types';

// KPI Compiler (DSL → SQL via emitter)
export {
  compileKPIFormula,
  compileKPIExpression,
  compileMultipleKPIs,
  type CompileKPIOptions,
  type CompileKPIResult,
} from './compiler';
