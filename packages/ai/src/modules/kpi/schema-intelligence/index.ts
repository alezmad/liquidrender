/**
 * Schema Intelligence Module
 *
 * Stage 1 of KPI Pipeline V2: Deterministic schema analysis
 * that runs before LLM generation to provide explicit context.
 *
 * Components:
 * 1. Pattern Detector - Detects business patterns (deadline comparison, variance, lifecycle)
 * 2. Entity Detector - Classifies tables (transaction, entity, dimension, lookup)
 * 3. Coverage Analyzer - Ensures comprehensive KPI coverage
 */

// Pattern Detection
export {
  // Types
  type PatternType,
  type ColumnReference,
  type KPITemplate,
  type DetectedPattern,
  type TableSchema,
  type ProfilingData,

  // Functions
  detectPatterns,
  detectDateComparisonPatterns,
  detectVariancePatterns,
  detectLifecyclePatterns,
  detectTimeSeriesPatterns,
  formatPatternsForPrompt,
} from './pattern-detector';

// Entity Detection
export {
  // Types
  type TableType,
  type ColumnMetricType,
  type BusinessDomain,
  type DetectedEntity,
  type DetectedMetric,
  type DetectedDimension,
  type DetectedTimeField,
  type InferredDomain,
  type SchemaAnalysis,

  // Functions
  analyzeSchema,
  formatSchemaAnalysisForPrompt,
} from './entity-detector';

// Coverage Analysis
export {
  // Types
  type CoverageRequirement,
  type CoverageAnalysis,

  // Functions
  analyzeCoverage,
  formatCoverageForPrompt,
} from './coverage-analyzer';
