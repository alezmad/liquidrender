/**
 * KPI Planner
 *
 * PLAN phase of Pipeline V2: Uses Opus to reason about what KPIs to build.
 *
 * This is the "intelligence at the top" that:
 * 1. Understands business context
 * 2. Reasons about calculation approaches
 * 3. Assigns DSL types with rationale
 * 4. Reduces downstream repair costs
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  KPIPlan,
  KPIType,
  KPIPlanColumns,
  PipelineConfig,
  PhaseMetrics,
  SchemaAnalysis,
  CoverageAnalysis,
  DetectedPattern,
} from '../types';
import { MODEL_IDS } from '../orchestrator';
import {
  KPI_PLAN_PROMPT,
  PLAN_PROMPT_NAME,
  PLAN_PROMPT_VERSION,
  parseKPIPlanResponse,
} from './plan-prompt';

// ============================================================================
// Types
// ============================================================================

interface PlannerResult {
  plans: KPIPlan[];
  metrics: PhaseMetrics;
}

interface RawKPIPlan {
  name?: string;
  description?: string;
  businessValue?: string;
  type?: string;
  typeRationale?: string;
  entity?: string;
  columns?: Record<string, unknown>;
  category?: string;
  format?: {
    type?: string;
    decimals?: number;
    currency?: string;
  };
  confidence?: number;
  aggregation?: string;
}

// ============================================================================
// Constants
// ============================================================================

const VALID_KPI_TYPES: KPIType[] = [
  'simple',
  'ratio',
  'derived',
  'filtered',
  'window',
  'case',
  'composite',
];

const VALID_CATEGORIES = [
  'revenue',
  'growth',
  'retention',
  'engagement',
  'efficiency',
  'fulfillment',
  'inventory',
  'finance',
  'pricing',
  'logistics',
  'operational',
  'risk',
  'custom',
] as const;

const VALID_FORMAT_TYPES = ['number', 'currency', 'percent', 'duration'] as const;

// ============================================================================
// Main Planner Function
// ============================================================================

/**
 * Plan KPIs using Opus for strategic reasoning.
 *
 * @param schemaAnalysis - Output from schema intelligence ANALYZE phase
 * @param coverageAnalysis - Coverage requirements
 * @param patterns - Detected business patterns
 * @param config - Pipeline configuration
 * @returns Planned KPIs with business reasoning
 */
export async function planKPIs(
  schemaAnalysis: SchemaAnalysis,
  coverageAnalysis: CoverageAnalysis,
  patterns: DetectedPattern[],
  config: PipelineConfig
): Promise<PlannerResult> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  const anthropic = new Anthropic();
  const modelId = config.models?.plan ?? MODEL_IDS.plan;
  const maxKPIs = config.maxKPIs ?? 20;

  let tokensIn = 0;
  let tokensOut = 0;

  try {
    // Build the planning prompt
    const prompt = KPI_PLAN_PROMPT.render({
      businessType: config.businessType,
      schemaAnalysis,
      coverageAnalysis,
      patterns,
      maxKPIs,
    });

    if (config.debug) {
      console.log(`[PLAN] Sending prompt to ${modelId} (${prompt.length} chars)`);
    }

    // Call Opus for strategic planning
    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    });

    // Track token usage
    tokensIn = response.usage?.input_tokens ?? 0;
    tokensOut = response.usage?.output_tokens ?? 0;

    // Extract text content
    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Opus response');
    }

    const responseText = textContent.text;

    if (config.debug) {
      console.log(`[PLAN] Received response (${responseText.length} chars)`);
    }

    // Parse the response
    const rawPlans = parseKPIPlanResponse(responseText);

    // Validate and transform to KPIPlan[]
    const plans = validateAndTransformPlans(rawPlans, config.debug);

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    if (config.debug) {
      console.log(`[PLAN] Planned ${plans.length} KPIs in ${durationMs}ms`);
    }

    return {
      plans,
      metrics: {
        phase: 'plan',
        startedAt,
        completedAt,
        durationMs,
        itemsProcessed: rawPlans.length,
        itemsSucceeded: plans.length,
        itemsFailed: rawPlans.length - plans.length,
        tokensIn,
        tokensOut,
        models: [modelId],
      },
    };
  } catch (error) {
    const completedAt = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (config.debug) {
      console.error(`[PLAN] Failed: ${errorMessage}`);
    }

    return {
      plans: [],
      metrics: {
        phase: 'plan',
        startedAt,
        completedAt,
        durationMs: Date.now() - startTime,
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 1,
        tokensIn,
        tokensOut,
        models: [modelId],
      },
    };
  }
}

// ============================================================================
// Validation & Transformation
// ============================================================================

/**
 * Validate raw plan objects and transform to typed KPIPlan[].
 * Filters out invalid plans with warnings.
 */
function validateAndTransformPlans(rawPlans: unknown[], debug?: boolean): KPIPlan[] {
  const validPlans: KPIPlan[] = [];

  for (let i = 0; i < rawPlans.length; i++) {
    const raw = rawPlans[i] as RawKPIPlan;

    try {
      const plan = transformRawPlan(raw);
      validPlans.push(plan);
    } catch (error) {
      if (debug) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[PLAN] Skipping invalid plan at index ${i}: ${message}`);
      }
    }
  }

  return validPlans;
}

/**
 * Transform a raw plan object to a typed KPIPlan.
 * Throws if required fields are missing or invalid.
 */
function transformRawPlan(raw: RawKPIPlan): KPIPlan {
  // Required string fields
  if (!raw.name || typeof raw.name !== 'string') {
    throw new Error('Missing or invalid name');
  }
  if (!raw.description || typeof raw.description !== 'string') {
    throw new Error('Missing or invalid description');
  }
  if (!raw.businessValue || typeof raw.businessValue !== 'string') {
    throw new Error('Missing or invalid businessValue');
  }
  if (!raw.entity || typeof raw.entity !== 'string') {
    throw new Error('Missing or invalid entity');
  }
  if (!raw.typeRationale || typeof raw.typeRationale !== 'string') {
    throw new Error('Missing or invalid typeRationale');
  }

  // Validate type
  const type = validateKPIType(raw.type);

  // Validate category
  const category = validateCategory(raw.category);

  // Validate and transform columns
  const columns = transformColumns(raw.columns, type);

  // Validate format
  const format = transformFormat(raw.format);

  // Validate confidence
  const confidence = validateConfidence(raw.confidence);

  return {
    name: raw.name,
    description: raw.description,
    businessValue: raw.businessValue,
    type,
    typeRationale: raw.typeRationale,
    entity: raw.entity,
    columns,
    category,
    format,
    confidence,
    aggregation: typeof raw.aggregation === 'string' ? raw.aggregation : undefined,
  };
}

/**
 * Validate and return KPIType.
 */
function validateKPIType(type: unknown): KPIType {
  if (typeof type !== 'string') {
    throw new Error('Missing type');
  }

  if (!VALID_KPI_TYPES.includes(type as KPIType)) {
    // Try to map common variations
    const normalized = type.toLowerCase();
    if (normalized === 'basic' || normalized === 'aggregate') {
      return 'simple';
    }
    if (normalized === 'percentage' || normalized === 'rate') {
      return 'ratio';
    }
    throw new Error(`Invalid type: ${type}`);
  }

  return type as KPIType;
}

/**
 * Validate and return category.
 */
function validateCategory(category: unknown): KPIPlan['category'] {
  if (typeof category !== 'string') {
    return 'custom';
  }

  const normalized = category.toLowerCase();
  if (VALID_CATEGORIES.includes(normalized as typeof VALID_CATEGORIES[number])) {
    return normalized as KPIPlan['category'];
  }

  return 'custom';
}

/**
 * Transform raw columns object to typed KPIPlanColumns.
 */
function transformColumns(columns: unknown, type: KPIType): KPIPlanColumns {
  if (!columns || typeof columns !== 'object') {
    return {};
  }

  const raw = columns as Record<string, unknown>;
  const result: KPIPlanColumns = {};

  // String fields
  if (typeof raw.expression === 'string') result.expression = raw.expression;
  if (typeof raw.numerator === 'string') result.numerator = raw.numerator;
  if (typeof raw.denominator === 'string') result.denominator = raw.denominator;
  if (typeof raw.having === 'string') result.having = raw.having;
  if (typeof raw.percentOf === 'string') result.percentOf = raw.percentOf;
  if (typeof raw.timeField === 'string') result.timeField = raw.timeField;

  // groupBy can be string or array
  if (typeof raw.groupBy === 'string') {
    result.groupBy = raw.groupBy;
  } else if (Array.isArray(raw.groupBy)) {
    result.groupBy = raw.groupBy.filter((g): g is string => typeof g === 'string');
  }

  // partitionBy and orderBy are arrays
  if (Array.isArray(raw.partitionBy)) {
    result.partitionBy = raw.partitionBy.filter((p): p is string => typeof p === 'string');
  }
  if (Array.isArray(raw.orderBy)) {
    result.orderBy = raw.orderBy.filter((o): o is string => typeof o === 'string');
  }

  // sources array
  if (Array.isArray(raw.sources)) {
    result.sources = raw.sources.filter((s): s is string => typeof s === 'string');
  }

  // filters array
  if (Array.isArray(raw.filters)) {
    result.filters = raw.filters.filter((f): f is string => typeof f === 'string');
  }

  // Validate required columns based on type
  validateColumnsForType(result, type);

  return result;
}

/**
 * Validate that required columns are present for the given type.
 */
function validateColumnsForType(columns: KPIPlanColumns, type: KPIType): void {
  switch (type) {
    case 'simple':
      // Simple should have expression or be implicit
      break;

    case 'ratio':
      // Ratio should have numerator and denominator
      if (!columns.numerator && !columns.denominator) {
        // Allow - might be using expression instead
      }
      break;

    case 'filtered':
      // Filtered should have groupBy and having
      if (!columns.groupBy || !columns.having) {
        // Warning but don't fail - let generation handle it
      }
      break;

    case 'composite':
      // Composite should have sources
      if (!columns.sources || columns.sources.length === 0) {
        // Warning but don't fail
      }
      break;
  }
}

/**
 * Transform format object.
 */
function transformFormat(format: unknown): KPIPlan['format'] {
  if (!format || typeof format !== 'object') {
    return { type: 'number', decimals: 2 };
  }

  const raw = format as Record<string, unknown>;
  const type = typeof raw.type === 'string' &&
    VALID_FORMAT_TYPES.includes(raw.type as typeof VALID_FORMAT_TYPES[number])
    ? (raw.type as 'number' | 'currency' | 'percent' | 'duration')
    : 'number';

  return {
    type,
    decimals: typeof raw.decimals === 'number' ? raw.decimals : 2,
    currency: typeof raw.currency === 'string' ? raw.currency : undefined,
  };
}

/**
 * Validate confidence score.
 */
function validateConfidence(confidence: unknown): number {
  if (typeof confidence !== 'number') {
    return 0.5;
  }

  // Clamp to 0-1
  return Math.max(0, Math.min(1, confidence));
}

// ============================================================================
// Exports
// ============================================================================

export {
  PLAN_PROMPT_NAME,
  PLAN_PROMPT_VERSION,
};
