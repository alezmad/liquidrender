/**
 * Universal Vocabulary Builder (UVB)
 *
 * Generates semantic vocabulary from database schemas in 60 seconds.
 *
 * Usage:
 * ```typescript
 * import { createPostgresAdapter, extractSchema, applyHardRules } from '@repo/liquid-connect/uvb'
 *
 * // 1. Create adapter
 * const adapter = createPostgresAdapter('postgresql://user:pass@host:5432/mydb')
 *
 * // 2. Extract schema
 * const schema = await extractSchema(adapter, { schema: 'public' })
 *
 * // 3. Apply hard rules
 * const { detected, confirmations, stats } = applyHardRules(schema)
 *
 * console.log(`Detected: ${stats.entities} entities, ${stats.metrics} metrics`)
 * // Detected: 50 entities, 120 metrics
 * ```
 */

// Models and types
export type {
  Column,
  Table,
  ForeignKeyConstraint,
  ForeignKeyReference,
  ExtractedSchema,
  DatabaseType,
  DetectedEntity,
  DetectedMetric,
  DetectedDimension,
  DetectedTimeField,
  DetectedFilter,
  DetectedRelationship,
  DetectedRequiredField,
  DetectedEnumField,
  DetectedVocabulary,
  Confirmation,
  SelectOneConfirmation,
  RenameConfirmation,
  ClassifyConfirmation,
  ConfirmationAnswers,
  VocabularyDraft,
  SchemaInfo,
  ExtractionOptions,
  HardRulesConfig,
  AggregationType,
  RelationshipType,
  // Data profiling types
  ProfiledSchema,
  ProfileOptions,
  ProfileResult,
  ProfilingData,
  TableProfile,
  ColumnProfile,
  NumericProfile,
  TemporalProfile,
  CategoricalProfile,
  TextProfile,
} from "./models";

export { DEFAULT_HARD_RULES_CONFIG, extractProfilingData } from "./models";

// Extractor
export type { DatabaseAdapter, ParsedConnection } from "./extractor";
export { SchemaExtractor, parseConnectionString, extractSchema } from "./extractor";

// Hard rules engine
export type { ApplyHardRulesResult, ApplyHardRulesOptions } from "./rules";
export {
  applyHardRules,
  isJunctionTable,
  detectEntities,
  detectRelationships,
  detectMetrics,
  detectDimensions,
  detectTimeFields,
  detectFilters,
  detectRequiredFields,
  detectEnumFields,
  generateConfirmations,
} from "./rules";

// Adapters
export {
  PostgresAdapter,
  createPostgresAdapter,
  type PostgresConfig,
  // DuckDB Legacy adapter (deprecated - use DuckDBUniversalAdapter instead)
  createDuckDBAdapter,
  createAdapter,
  type DuckDBConnectionConfig,
  type QueryResult,
} from "./adapters";

// DuckDB Universal Adapter (new - connection string based)
export {
  DuckDBUniversalAdapter,
  createDuckDBUniversalAdapter,
  type DuckDBAdapterOptions,
} from "./duckdb-adapter";

// Data Profiling Engine
export {
  profileSchema,
  calculateSampleRate,
  selectColumnsToProfile,
} from "./profiler";

// Profiling Query Builders
export {
  // Tier 1: Database statistics
  buildTableStatisticsQuery,
  buildColumnStatisticsQuery,
  buildCombinedStatisticsQuery,
  buildSchemaStatisticsQuery,
  // Tier 2: Adaptive sampling
  buildSampleProfilingQuery,
  buildFreshnessQuery,
  buildCardinalityQuery,
  determineAdaptiveSampleRate,
} from "./profiler-queries";
