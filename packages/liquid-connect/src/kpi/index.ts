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
