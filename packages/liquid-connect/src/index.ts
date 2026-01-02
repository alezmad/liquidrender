// LiquidConnect - Universal Analytical Query Language
// Main Entry Point

// =============================================================================
// CORE TYPES
// =============================================================================

export type {
  QueryType,
  FilterOperator,
  BooleanOperator,
  SortDirection,
  AggregationType,
  FieldType,
} from './types';

// =============================================================================
// COMPILER
// =============================================================================

export {
  Scanner,
  Parser,
  parseToAST,
  compile,
  compileWithResult,
  validate,
  LiquidError,
  ErrorCode,
  DiagnosticsCollector,
  getErrorCategory,
  isSigil,
  isFilterOperator,
  isBooleanOperator,
  isTimeToken,
  type Token,
  type TokenType,
  type QueryNode,
  type MetricNode,
  type EntityNode,
  type DimensionNode,
  type FilterExprNode,
  type NamedFilterNode,
  type ExplicitFilterNode,
  type BinaryFilterNode,
  type UnaryFilterNode,
  type GroupedFilterNode,
  type ValueNode,
  type TimeNode,
  type DurationNode,
  type PeriodNode,
  type SpecificDateNode,
  type TimeRangeNode,
  type LimitNode,
  type OrderByNode,
  type CompareNode,
  type ErrorCategory,
  type Diagnostic,
  type DiagnosticSeverity,
} from './compiler';

// =============================================================================
// LIQUIDFLOW IR
// =============================================================================

export {
  LiquidFlowBuilder,
  validateFlow,
  isValidFlow,
  serializeFlow,
  deserializeFlow,
  LIQUIDFLOW_VERSION,
  type LiquidFlow,
  type ResolvedMetric,
  type ResolvedEntity,
  type ResolvedDimension,
  type ResolvedFilter,
  type ResolvedTime,
  type ResolvedOrderBy,
  type ResolvedCompare,
  type ResolvedSource,
  type ResolvedJoin,
  type ResolvedField,
  type FlowMetadata,
  type FlowValidation,
  type FlowValidationError,
  type FlowValidationWarning,
} from './liquidflow';

// =============================================================================
// SEMANTIC LAYER
// =============================================================================

export {
  SemanticRegistry,
  createRegistry,
  loadFromYAML,
  loadFromObject,
  validateSemanticLayer,
  mergeLayers,
  generateSemanticLayer,
  type SemanticLayer,
  type SourceDefinition,
  type EntityDefinition,
  type FieldDefinition,
  type MetricDefinition,
  type MetricFormat,
  type DimensionDefinition,
  type TimeGranularity,
  type FilterDefinition,
  type FilterCondition,
  type RelationshipDefinition,
  type JoinCondition,
  type FreshnessConfig,
  type ResolvedReference,
  type ResolutionError,
  type ResolutionResult,
  type LoaderOptions,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  type ResolvedVocabulary,
  type ResolvedVocabularyItem,
  type GenerateSemanticLayerOptions,
} from './semantic';

// =============================================================================
// RESOLVER
// =============================================================================

export {
  Resolver,
  createResolver,
  resolve,
  resolveTime,
  resolveFilter,
  combineFilters,
  getComparisonPeriod,
  createDefaultContext,
  type ResolverContext,
  type ResolverOptions,
  type ResolverResult,
  type ResolverError,
  type ResolverErrorCode,
  type ResolverWarning,
  type ResolvedTimeRange,
  type SourceTracker,
  type JoinRequirement,
} from './resolver';

// =============================================================================
// EMITTERS
// =============================================================================

export {
  BaseEmitter,
  DuckDBEmitter,
  TrinoEmitter,
  PostgresEmitter,
  createEmitter,
  createDuckDBEmitter,
  createTrinoEmitter,
  createPostgresEmitter,
  emit,
  emitAll,
  type Dialect,
  type EmitResult,
  type EmitDebug,
  type SQLParts,
  type EmitterOptions,
  type DialectTraits,
  type DateFunctions,
  type AggregateFunctions,
} from './emitters';

// =============================================================================
// QUERY EXECUTOR
// =============================================================================

export {
  QueryExecutor,
  createExecutor,
  executeQuery,
  TimeoutError,
  // Provenance (Block Trust Metadata)
  calculateConfidence,
  generateProvenance,
  formatFreshness,
  truncateQuery,
  extractTablesFromQuery,
  detectAssumptions,
  getConfidenceLevelDescription,
  getConfidenceLevelColor,
  formatConfidenceScore,
  type ExecutorConfig,
  type ExecutorStatus,
  type QueryResult as ExecutorQueryResult,
  // Provenance types
  type Provenance,
  type ProvenanceSource,
  type ConfidenceLevel,
  type ConfidenceResult,
} from './executor';

// =============================================================================
// UNIVERSAL VOCABULARY BUILDER (UVB)
// =============================================================================

export type {
  DetectedVocabulary,
  ExtractedSchema,
  DetectedEntity,
  DetectedMetric,
  DetectedDimension,
  DetectedTimeField,
  DetectedFilter,
  DetectedRelationship,
  Table,
  Column,
  DatabaseType,
  AggregationType as UVBAggregationType,
  RelationshipType,
} from './uvb';

// =============================================================================
// VOCABULARY (Query Engine - Wave 1)
// =============================================================================

export {
  // Types
  type SlotEntry,
  type MetricSlotEntry,
  type DimensionSlotEntry,
  type Pattern,
  type SlotType,
  type SynonymRegistry,
  type CompiledVocabulary,
  type VocabularyCompilerOptions,
  // Patterns
  DEFAULT_PATTERNS,
  TIME_SLOTS,
  createPattern,
  // Synonyms
  GLOBAL_SYNONYMS,
  ACTION_WORDS,
  createSynonymRegistry,
  resolveSynonym,
  // Compiler
  compileVocabulary,
  generatePatternsFromVocabulary,
} from './vocabulary';

// =============================================================================
// QUERY ENGINE (Query Engine - Wave 2 & 3)
// =============================================================================

export {
  // Types
  type QueryContext,
  type RoleContext,
  type QueryOptions as NLQueryOptions,
  type NormalizeResult,
  type Substitution,
  type MatchResult,
  type VocabularyResolution,
  type QueryTrace,
  type FallbackResult,
  type QueryResult as NLQueryResult,
  type QueryErrorCode,
  // Normalizer
  normalize,
  tokenize,
  applySynonyms,
  // Matcher
  match,
  matchPattern,
  fillSlots,
  buildOutput,
  // Engine
  query as nlQuery,
  createQueryEngine,
  QueryEngine,
} from './query';

// =============================================================================
// BUSINESS TYPES (Wave 1)
// =============================================================================

export {
  detectBusinessType,
  getTemplate,
  mapToTemplate,
  CONFIDENCE_THRESHOLD,
  AMBIGUITY_THRESHOLD,
  type BusinessType,
  type BusinessTypeSignal,
  type BusinessTypeMatch,
  type DetectionResult,
  type SlotMapping,
  type BusinessTypeTemplate,
  type KPIDefinition,
  type EntityExpectation,
  type DashboardSection,
  type MappingResult,
  type MappedKPI,
} from './business-types';

// =============================================================================
// DASHBOARD (Wave 2)
// =============================================================================

export {
  generateDashboardSpec,
  type DashboardSpec,
  type DashboardKPI,
  type DashboardChart,
  type GenerateDashboardSpecOptions,
} from './dashboard';

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

import { parseToAST, compile as compileQuery } from './compiler';
import { LiquidFlowBuilder } from './liquidflow';
import { createRegistry } from './semantic';
import { Resolver, type ResolverOptions } from './resolver';
import { emit as emitSql, type Dialect } from './emitters';
import type { SemanticLayer } from './semantic';
import type { EmitterOptions, EmitResult } from './emitters';
import type { LiquidFlow } from './liquidflow/types';

/**
 * LiquidConnect version
 */
export const VERSION = '0.1.0';

/**
 * Quick parse and validate a query string
 */
export function parse(source: string) {
  return parseToAST(source);
}

/**
 * Create a new metric query builder
 */
export function metricQuery() {
  return LiquidFlowBuilder.metricQuery();
}

/**
 * Create a new entity query builder
 */
export function entityQuery() {
  return LiquidFlowBuilder.entityQuery();
}

/**
 * Query options for end-to-end execution
 */
export interface QueryOptions {
  /** Emitter options */
  emitter?: EmitterOptions;

  /** Resolver options */
  resolver?: ResolverOptions;
}

/**
 * Execute end-to-end: query string -> SQL
 *
 * Complete pipeline:
 * 1. Parse source to AST
 * 2. Resolve AST to LiquidFlow IR using semantic layer
 * 3. Emit SQL for target dialect
 *
 * @param source - LiquidConnect query string
 * @param semantic - Semantic layer definition
 * @param dialect - Target SQL dialect
 * @param options - Query options
 * @returns EmitResult with SQL and parameters
 */
export function query(
  source: string,
  semantic: SemanticLayer,
  dialect: Dialect,
  options?: QueryOptions
): EmitResult {
  // Compile query string to LiquidFlow IR
  const flow = compileQuery(source, semantic, options?.resolver);

  // Emit SQL for target dialect
  return emitSql(flow, dialect, options?.emitter);
}

/**
 * Execute end-to-end with full result details
 *
 * @param source - LiquidConnect query string
 * @param semantic - Semantic layer definition
 * @param dialect - Target SQL dialect
 * @param options - Query options
 * @returns Full result with AST, LiquidFlow, warnings, and SQL
 */
export function queryWithDetails(
  source: string,
  semantic: SemanticLayer,
  dialect: Dialect,
  options?: QueryOptions
) {
  // Parse to AST
  const ast = parseToAST(source);

  // Create registry and resolve
  const registry = createRegistry(semantic);
  const resolver = new Resolver(registry, options?.resolver);
  const resolution = resolver.resolve(ast);

  if (!resolution.success) {
    return {
      success: false as const,
      ast,
      errors: resolution.errors,
      warnings: resolution.warnings,
    };
  }

  // Emit SQL
  const sql = emitSql(resolution.flow!, dialect, options?.emitter);

  return {
    success: true as const,
    ast,
    flow: resolution.flow!,
    sql,
    warnings: resolution.warnings,
  };
}

/**
 * Emit LiquidFlow to multiple dialects
 */
export function queryAll(
  source: string,
  semantic: SemanticLayer,
  options?: QueryOptions
): Record<Dialect, EmitResult> {
  const flow = compileQuery(source, semantic, options?.resolver);

  return {
    duckdb: emitSql(flow, 'duckdb', options?.emitter),
    trino: emitSql(flow, 'trino', options?.emitter),
    postgres: emitSql(flow, 'postgres', options?.emitter),
  };
}
