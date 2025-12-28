// Semantic Layer - Main Entry Point
// YAML-based semantic model for LiquidConnect

export type {
  SemanticLayer,
  SourceDefinition,
  EntityDefinition,
  FieldDefinition,
  MetricDefinition,
  MetricFormat,
  DimensionDefinition,
  TimeGranularity,
  FilterDefinition,
  FilterCondition,
  RelationshipDefinition,
  JoinCondition,
  FreshnessConfig,
  ResolvedReference,
  ResolutionError,
  ResolutionResult,
} from './types';

export {
  loadFromYAML,
  loadFromObject,
  validateSemanticLayer,
  mergeLayers,
  type LoaderOptions,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
} from './loader';

export { SemanticRegistry, createRegistry } from './registry';
