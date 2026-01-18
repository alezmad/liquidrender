/**
 * KPI Semantic Types v2.0
 *
 * Extended DSL supporting complex business KPIs while maintaining
 * database agnosticism through emitter-based compilation.
 */

import type { AggregationType } from '../types';

// ============================================================================
// Extended Filter Types
// ============================================================================

export type FilterOperator =
  | '=' | '!=' | '>' | '>=' | '<' | '<='
  | 'IN' | 'NOT IN'
  | 'LIKE' | 'NOT LIKE'
  | 'IS NULL' | 'IS NOT NULL'
  | 'BETWEEN'
  | 'EXISTS'
  | 'NOT EXISTS';

export interface KPIFilter {
  field: string;
  operator: FilterOperator;
  value?: unknown;
}

export interface CompoundFilter {
  type: 'compound';
  operator: 'AND' | 'OR';
  conditions: Array<KPIFilter | CompoundFilter>;
}

export type FilterCondition = KPIFilter | CompoundFilter;

// ============================================================================
// Window Types
// ============================================================================

export type WindowFrame =
  | 'ROWS_UNBOUNDED_PRECEDING'
  | 'ROWS_BETWEEN_UNBOUNDED_AND_CURRENT'
  | 'ROWS_N_PRECEDING'
  | 'RANGE_UNBOUNDED_PRECEDING'
  | 'RANGE_INTERVAL_PRECEDING';

export type ComparisonPeriod =
  | 'previous_period'
  | 'previous_year'
  | 'previous_month'
  | 'previous_week'
  | 'previous_quarter'
  | 'custom';

// ============================================================================
// Date Range Presets
// ============================================================================

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_14_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'last_365_days'
  | 'this_week'
  | 'this_month'
  | 'this_quarter'
  | 'this_year'
  | 'last_week'
  | 'last_month'
  | 'last_quarter'
  | 'last_year';

// ============================================================================
// Time-Series Types
// ============================================================================

/**
 * Time-series aggregation grain (temporal grouping unit)
 * Used for KPIs that aggregate over time periods (e.g., Monthly Revenue)
 */
export type TimeSeriesGrain =
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year';

// ============================================================================
// Aggregation Component (Enhanced)
// ============================================================================

export interface AggregationComponent {
  aggregation: AggregationType;
  expression: string;
  filterCondition?: string;
  percentileValue?: number;
  delimiter?: string;
  orderBy?: string;
}

// ============================================================================
// KPI Definition Base
// ============================================================================

interface KPIDefinitionBase {
  entity: string;
  timeField?: string;
  filters?: FilterCondition[];
  comparison?: {
    period: ComparisonPeriod;
    offsetDays?: number;
  };
  /** Apply COALESCE to wrap result with fallback value */
  nullFallback?: number | string;
  /** Preset date range filter (requires timeField) */
  dateRange?: DateRangePreset;
}

// ============================================================================
// KPI Definition Types
// ============================================================================

export interface SimpleKPIDefinition extends KPIDefinitionBase {
  type: 'simple';
  aggregation: AggregationType;
  expression: string;
  /** Time-series grain for temporal aggregation (requires timeField) */
  grain?: TimeSeriesGrain;
}

export interface RatioKPIDefinition extends KPIDefinitionBase {
  type: 'ratio';
  numerator: AggregationComponent;
  denominator: AggregationComponent;
  multiplier?: number;
}

export interface DerivedKPIDefinition extends KPIDefinitionBase {
  type: 'derived';
  expression: string;
  dependencies: string[];
}

export interface FilteredAggregationKPIDefinition extends KPIDefinitionBase {
  type: 'filtered';
  aggregation: AggregationType;
  expression: string;
  subquery: {
    groupBy: string | string[];
    having: string;
    subqueryEntity?: string;
  };
  /** Optional: calculate as percentage of total (filtered / total * 100) */
  percentOf?: string;
}

export interface WindowKPIDefinition extends KPIDefinitionBase {
  type: 'window';
  aggregation: AggregationType;
  expression: string;
  window: {
    partitionBy: string[];
    orderBy: Array<{ field: string; direction: 'asc' | 'desc' }>;
    frame?: WindowFrame;
    frameSize?: number;
    frameInterval?: string;
    lag?: { offset: number; default?: unknown };
    lead?: { offset: number; default?: unknown };
  };
  outputExpression?: string;
}

export interface CaseKPIDefinition extends KPIDefinitionBase {
  type: 'case';
  aggregation: AggregationType;
  cases: Array<{ when: string; then: string } | { else: string }>;
}

export interface CompositeKPIDefinition extends KPIDefinitionBase {
  type: 'composite';
  aggregation: AggregationType;
  expression: string;
  sources: Array<{
    alias: string;
    table: string;
    schema?: string;
    join?: {
      type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
      on: string;
    };
  }>;
  groupBy?: string[];
}

export interface MovingAverageKPIDefinition extends KPIDefinitionBase {
  type: 'moving_average';
  aggregation: 'AVG' | 'SUM' | 'COUNT';
  expression: string;
  /** Number of periods for the moving window */
  periods: number;
  /** Unit of the period (day, week, month) */
  periodUnit: 'day' | 'week' | 'month';
  /** Field to partition by (optional, e.g., by product) */
  partitionBy?: string[];
  /** Field to order by (defaults to timeField) */
  orderBy?: string;
}

export interface RankingKPIDefinition extends KPIDefinitionBase {
  type: 'ranking';
  /** Ranking function to use */
  rankFunction: 'RANK' | 'DENSE_RANK' | 'ROW_NUMBER' | 'NTILE';
  /** For NTILE: number of buckets */
  ntileBuckets?: number;
  /** Field to rank by */
  rankBy: string;
  /** Direction for ranking */
  rankDirection: 'asc' | 'desc';
  /** Optional partition for ranking within groups */
  partitionBy?: string[];
  /** Optional: only return top N */
  topN?: number;
}

export interface ConditionalKPIDefinition extends KPIDefinitionBase {
  type: 'conditional';
  /** Base aggregation (COUNT, SUM, AVG) */
  aggregation: 'COUNT' | 'SUM' | 'AVG';
  /** Expression to aggregate */
  expression: string;
  /** Condition that must be true for row to be included */
  condition: string;
}

// ============================================================================
// Union Type
// ============================================================================

export type KPISemanticDefinition =
  | SimpleKPIDefinition
  | RatioKPIDefinition
  | DerivedKPIDefinition
  | FilteredAggregationKPIDefinition
  | WindowKPIDefinition
  | CaseKPIDefinition
  | CompositeKPIDefinition
  | MovingAverageKPIDefinition
  | RankingKPIDefinition
  | ConditionalKPIDefinition;

// ============================================================================
// Type Guards
// ============================================================================

export function isSimpleKPI(def: KPISemanticDefinition): def is SimpleKPIDefinition {
  return def.type === 'simple';
}

export function isRatioKPI(def: KPISemanticDefinition): def is RatioKPIDefinition {
  return def.type === 'ratio';
}

export function isDerivedKPI(def: KPISemanticDefinition): def is DerivedKPIDefinition {
  return def.type === 'derived';
}

export function isFilteredKPI(def: KPISemanticDefinition): def is FilteredAggregationKPIDefinition {
  return def.type === 'filtered';
}

export function isWindowKPI(def: KPISemanticDefinition): def is WindowKPIDefinition {
  return def.type === 'window';
}

export function isCaseKPI(def: KPISemanticDefinition): def is CaseKPIDefinition {
  return def.type === 'case';
}

export function isCompositeKPI(def: KPISemanticDefinition): def is CompositeKPIDefinition {
  return def.type === 'composite';
}

export function isMovingAverageKPI(def: KPISemanticDefinition): def is MovingAverageKPIDefinition {
  return def.type === 'moving_average';
}

export function isRankingKPI(def: KPISemanticDefinition): def is RankingKPIDefinition {
  return def.type === 'ranking';
}

export function isConditionalKPI(def: KPISemanticDefinition): def is ConditionalKPIDefinition {
  return def.type === 'conditional';
}

// ============================================================================
// Validation
// ============================================================================

export function validateKPIDefinition(def: KPISemanticDefinition): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!def.entity) {
    errors.push('Missing entity (source table)');
  }

  switch (def.type) {
    case 'simple':
      if (!def.aggregation) errors.push('Simple KPI requires aggregation');
      if (!def.expression) errors.push('Simple KPI requires expression');
      break;

    case 'ratio':
      if (!def.numerator?.aggregation) errors.push('Ratio KPI requires numerator aggregation');
      if (!def.denominator?.aggregation) errors.push('Ratio KPI requires denominator aggregation');
      break;

    case 'derived':
      if (!def.expression) errors.push('Derived KPI requires expression');
      if (!def.dependencies?.length) errors.push('Derived KPI requires dependencies');
      if (!def.expression.includes('@')) errors.push('Derived KPI expression should use @metric references');
      break;

    case 'filtered':
      if (!def.aggregation) errors.push('Filtered KPI requires aggregation');
      if (!def.expression) errors.push('Filtered KPI requires expression');
      if (!def.subquery?.groupBy) errors.push('Filtered KPI requires subquery.groupBy');
      if (!def.subquery?.having) errors.push('Filtered KPI requires subquery.having');
      break;

    case 'window':
      if (!def.aggregation) errors.push('Window KPI requires aggregation');
      if (!def.expression) errors.push('Window KPI requires expression');
      if (!def.window?.orderBy?.length) errors.push('Window KPI requires window.orderBy');
      break;

    case 'case':
      if (!def.aggregation) errors.push('Case KPI requires aggregation');
      if (!def.cases?.length) errors.push('Case KPI requires at least one case');
      break;

    case 'composite':
      if (!def.aggregation) errors.push('Composite KPI requires aggregation');
      if (!def.expression) errors.push('Composite KPI requires expression');
      if (!def.sources?.length) errors.push('Composite KPI requires sources');
      break;

    case 'moving_average':
      if (!def.aggregation) errors.push('Moving Average KPI requires aggregation');
      if (!def.expression) errors.push('Moving Average KPI requires expression');
      if (!def.periods || def.periods < 1) errors.push('Moving Average KPI requires periods > 0');
      if (!def.periodUnit) errors.push('Moving Average KPI requires periodUnit');
      break;

    case 'ranking':
      if (!def.rankFunction) errors.push('Ranking KPI requires rankFunction');
      if (!def.rankBy) errors.push('Ranking KPI requires rankBy');
      if (!def.rankDirection) errors.push('Ranking KPI requires rankDirection');
      if (def.rankFunction === 'NTILE' && !def.ntileBuckets) {
        errors.push('NTILE ranking requires ntileBuckets');
      }
      break;

    case 'conditional':
      if (!def.aggregation) errors.push('Conditional KPI requires aggregation');
      if (!def.expression) errors.push('Conditional KPI requires expression');
      if (!def.condition) errors.push('Conditional KPI requires condition');
      break;
  }

  return { valid: errors.length === 0, errors };
}
