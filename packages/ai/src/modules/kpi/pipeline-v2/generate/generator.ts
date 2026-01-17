/**
 * KPI Generator - GENERATE Phase
 *
 * Uses type-specific prompts to generate DSL definitions in PARALLEL.
 * Groups plans by type, runs prompts concurrently, validates results.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  KPIPlan,
  KPIType,
  GenerationResult,
  PipelineConfig,
  PhaseMetrics,
} from '../types';
import { ExtendedKPISemanticDefinitionSchema } from '../../types';

import * as SimplePrompt from './simple-prompt';
import * as RatioPrompt from './ratio-prompt';
import * as FilteredPrompt from './filtered-prompt';
import * as CompositePrompt from './composite-prompt';

// ============================================================================
// Constants
// ============================================================================

const MODEL_ID = 'claude-sonnet-4-5-20250929';

const TYPE_PROMPTS = {
  simple: SimplePrompt,
  ratio: RatioPrompt,
  filtered: FilteredPrompt,
  composite: CompositePrompt,
} as const;

// Types without dedicated prompts map to closest match
const TYPE_FALLBACKS: Record<KPIType, keyof typeof TYPE_PROMPTS> = {
  simple: 'simple',
  ratio: 'ratio',
  derived: 'ratio',  // Derived uses similar structure
  filtered: 'filtered',
  window: 'simple',  // Window KPIs use simple structure with window additions
  case: 'simple',    // Case KPIs use simple structure with case additions
  composite: 'composite',
};

// ============================================================================
// Types
// ============================================================================

interface GeneratedKPI {
  name: string;
  definition: unknown;
  metadata: {
    name: string;
    description: string;
    category: string;
    format?: {
      type: 'number' | 'currency' | 'percent' | 'duration';
      decimals?: number;
      currency?: string;
    };
  };
}

interface TypeGenerationResult {
  type: KPIType;
  results: GenerationResult[];
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  error?: string;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Group plans by their KPI type.
 */
function groupByType(plans: KPIPlan[]): Record<KPIType, KPIPlan[]> {
  const groups: Partial<Record<KPIType, KPIPlan[]>> = {};

  for (const plan of plans) {
    if (!groups[plan.type]) {
      groups[plan.type] = [];
    }
    groups[plan.type]!.push(plan);
  }

  return groups as Record<KPIType, KPIPlan[]>;
}

/**
 * Parse JSON from LLM response, handling markdown code blocks.
 */
function parseJsonResponse(text: string): GeneratedKPI[] {
  let jsonText = text.trim();

  // Strip markdown code blocks if present
  if (jsonText.startsWith('```')) {
    jsonText = jsonText
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '');
  }

  const parsed = JSON.parse(jsonText);

  if (!Array.isArray(parsed)) {
    throw new Error('Expected JSON array');
  }

  return parsed as GeneratedKPI[];
}

/**
 * Validate a DSL definition against the schema.
 */
function validateDefinition(
  definition: unknown
): { valid: true; data: unknown } | { valid: false; error: string } {
  const result = ExtendedKPISemanticDefinitionSchema.safeParse(definition);

  if (result.success) {
    return { valid: true, data: result.data };
  }

  const errorMessages = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

  return { valid: false, error: errorMessages };
}

// ============================================================================
// Type-Specific Generation
// ============================================================================

/**
 * Generate KPIs for a specific type using the appropriate prompt.
 */
async function generateTypeKPIs(
  type: KPIType,
  plans: KPIPlan[],
  schemaContext: string,
  config: PipelineConfig,
  anthropic: Anthropic
): Promise<TypeGenerationResult> {
  const startTime = Date.now();

  // Get the appropriate prompt module
  const promptKey = TYPE_FALLBACKS[type];
  const promptModule = TYPE_PROMPTS[promptKey];

  if (!promptModule) {
    return {
      type,
      results: [],
      tokensIn: 0,
      tokensOut: 0,
      latencyMs: Date.now() - startTime,
      error: `No prompt module for type: ${type}`,
    };
  }

  // Build the prompt
  const prompt = promptModule.buildPrompt(plans, schemaContext);

  try {
    // Call the LLM
    const response = await anthropic.messages.create({
      model: config.models?.generate ?? MODEL_ID,
      max_tokens: 8000,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    });

    const latencyMs = Date.now() - startTime;
    const tokensIn = response.usage?.input_tokens ?? 0;
    const tokensOut = response.usage?.output_tokens ?? 0;

    // Extract text content
    const content = response.content[0];
    if (!content || content.type !== 'text') {
      return {
        type,
        results: [],
        tokensIn,
        tokensOut,
        latencyMs,
        error: 'No text content in response',
      };
    }

    // Parse JSON response
    const generatedKPIs = parseJsonResponse(content.text);

    // Map generated KPIs to GenerationResult, validating each
    const results: GenerationResult[] = [];

    for (const generated of generatedKPIs) {
      // Find the matching plan
      const plan = plans.find(
        (p) => p.name.toLowerCase() === generated.name.toLowerCase()
      );

      if (!plan) {
        if (config.debug) {
          console.warn(
            `[Generator] Generated KPI "${generated.name}" has no matching plan`
          );
        }
        continue;
      }

      // Validate the definition
      const validation = validateDefinition(generated.definition);

      if (!validation.valid) {
        if (config.debug) {
          console.warn(
            `[Generator] KPI "${generated.name}" failed validation: ${(validation as { valid: false; error: string }).error}`
          );
        }
        // Still include it - validation phase will handle repair
      }

      // Create GenerationResult
      results.push({
        plan,
        definition: generated.definition as any,
        metadata: {
          name: generated.metadata.name,
          description: generated.metadata.description,
          category: generated.metadata.category,
          format: generated.metadata.format,
        },
        model: config.models?.generate ?? MODEL_ID,
        promptName: promptModule.PROMPT_NAME,
        promptVersion: promptModule.PROMPT_VERSION,
        latencyMs,
        tokensIn,
        tokensOut,
      });
    }

    // Log any plans that didn't get generated
    if (config.debug) {
      const generatedNames = new Set(
        generatedKPIs.map((k) => k.name.toLowerCase())
      );
      for (const plan of plans) {
        if (!generatedNames.has(plan.name.toLowerCase())) {
          console.warn(`[Generator] Plan "${plan.name}" was not generated`);
        }
      }
    }

    return {
      type,
      results,
      tokensIn,
      tokensOut,
      latencyMs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      type,
      results: [],
      tokensIn: 0,
      tokensOut: 0,
      latencyMs: Date.now() - startTime,
      error: message,
    };
  }
}

// ============================================================================
// Main Generator Function
// ============================================================================

/**
 * Generate KPIs from plans using type-specific prompts in parallel.
 *
 * @param plans - KPIPlan[] from the PLAN phase
 * @param schemaContext - Schema markdown context
 * @param config - Pipeline configuration
 * @returns Generated DSL definitions with metrics
 */
export async function generateKPIs(
  plans: KPIPlan[],
  schemaContext: string,
  config: PipelineConfig
): Promise<{ results: GenerationResult[]; metrics: PhaseMetrics }> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  if (plans.length === 0) {
    return {
      results: [],
      metrics: {
        phase: 'generate',
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        tokensIn: 0,
        tokensOut: 0,
        models: [],
      },
    };
  }

  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Group plans by type
  const byType = groupByType(plans);

  if (config.debug) {
    console.log('[Generator] Plans by type:');
    for (const [type, typePlans] of Object.entries(byType)) {
      if (typePlans && typePlans.length > 0) {
        console.log(`  ${type}: ${typePlans.length}`);
      }
    }
  }

  // Generate in parallel for each type that has plans
  const typePromises: Promise<TypeGenerationResult>[] = [];
  const typesProcessed: KPIType[] = [];

  for (const [type, typePlans] of Object.entries(byType)) {
    if (typePlans && typePlans.length > 0) {
      typesProcessed.push(type as KPIType);
      typePromises.push(
        generateTypeKPIs(
          type as KPIType,
          typePlans,
          schemaContext,
          config,
          anthropic
        )
      );
    }
  }

  // Wait for all type generations to complete
  const typeResults = await Promise.all(typePromises);

  // Merge results
  const allResults: GenerationResult[] = [];
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  const errors: string[] = [];

  for (const typeResult of typeResults) {
    allResults.push(...typeResult.results);
    totalTokensIn += typeResult.tokensIn;
    totalTokensOut += typeResult.tokensOut;

    if (typeResult.error) {
      errors.push(`${typeResult.type}: ${typeResult.error}`);
    }
  }

  // Log summary
  if (config.debug) {
    console.log(`[Generator] Generated ${allResults.length}/${plans.length} KPIs`);
    if (errors.length > 0) {
      console.log('[Generator] Errors:', errors);
    }
  }

  const completedAt = new Date().toISOString();

  return {
    results: allResults,
    metrics: {
      phase: 'generate',
      startedAt,
      completedAt,
      durationMs: Date.now() - startTime,
      itemsProcessed: plans.length,
      itemsSucceeded: allResults.length,
      itemsFailed: plans.length - allResults.length,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      models: [config.models?.generate ?? MODEL_ID],
    },
  };
}
