// Resolver - Type Definitions
// Types for AST to LiquidFlow resolution

import type { Span } from '../types';
import type { LiquidFlow } from '../liquidflow/types';

/**
 * Resolution context passed through resolution
 */
export interface ResolverContext {
  /** Current timestamp for time resolution */
  now: Date;

  /** Time zone for date calculations */
  timezone: string;

  /** Parameters passed to the query */
  parameters: Record<string, unknown>;

  /** Whether to collect all errors vs fail fast */
  collectAllErrors: boolean;
}

/**
 * Default resolver context
 */
export function createDefaultContext(overrides?: Partial<ResolverContext>): ResolverContext {
  return {
    now: new Date(),
    timezone: 'UTC',
    parameters: {},
    collectAllErrors: true,
    ...overrides,
  };
}

/**
 * Resolution error
 */
export interface ResolverError {
  /** Error code */
  code: ResolverErrorCode;

  /** Human-readable message */
  message: string;

  /** Source span where error occurred */
  span?: Span;

  /** Reference that caused the error */
  reference?: string;

  /** Suggestions for fixing */
  suggestions?: string[];
}

/**
 * Resolver error codes
 */
export type ResolverErrorCode =
  // Reference errors (E2xx)
  | 'E201' // Unknown metric
  | 'E202' // Unknown entity
  | 'E203' // Unknown dimension
  | 'E204' // Unknown filter
  | 'E205' // Unknown field
  | 'E206' // Ambiguous reference
  // Compatibility errors (E3xx)
  | 'E301' // Metric requires dimension
  | 'E302' // Incompatible dimension for metric
  | 'E303' // Entity cannot have metrics
  | 'E304' // Missing time field
  | 'E305' // Invalid relationship path
  // Time errors (E4xx)
  | 'E401' // Invalid time expression
  | 'E402' // Invalid date range
  | 'E403' // Invalid period reference
  | 'E404' // Time field not found
  // Parameter errors (E5xx)
  | 'E501' // Missing required parameter
  | 'E502' // Invalid parameter type
  | 'E503'; // Parameter out of range

/**
 * Resolution result
 */
export interface ResolverResult {
  /** Whether resolution succeeded */
  success: boolean;

  /** Resolved LiquidFlow (if successful) */
  flow?: LiquidFlow;

  /** Resolution errors */
  errors: ResolverError[];

  /** Resolution warnings */
  warnings: ResolverWarning[];
}

/**
 * Resolution warning
 */
export interface ResolverWarning {
  /** Warning code */
  code: string;

  /** Human-readable message */
  message: string;

  /** Source span */
  span?: Span;
}

/**
 * Resolver options
 */
export interface ResolverOptions {
  /** Context for resolution */
  context?: Partial<ResolverContext>;

  /** Strict mode - fail on warnings */
  strict?: boolean;

  /** Max join depth for relationship traversal */
  maxJoinDepth?: number;

  /** Include metadata in output */
  includeMetadata?: boolean;
}

/**
 * Time resolution result
 */
export interface ResolvedTimeRange {
  /** Start of range (ISO date string) */
  start: string;

  /** End of range (ISO date string) */
  end: string;

  /** Time field to apply constraint */
  field: string;

  /** Original expression */
  expression: string;
}

/**
 * Source tracking for join planning
 */
export interface SourceTracker {
  /** All sources referenced */
  sources: Set<string>;

  /** Primary source (first metric/entity source) */
  primary?: string;

  /** Required joins */
  joins: JoinRequirement[];
}

/**
 * Join requirement discovered during resolution
 */
export interface JoinRequirement {
  /** Source entity */
  from: string;

  /** Target entity */
  to: string;

  /** Reason for join */
  reason: 'metric' | 'dimension' | 'filter';

  /** Reference that requires this join */
  reference: string;
}
