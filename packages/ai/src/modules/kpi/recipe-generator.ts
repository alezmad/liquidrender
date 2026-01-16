/**
 * KPI Recipe Generator
 *
 * Uses LLMs to generate SQL recipes for business KPIs based on available database schema.
 *
 * Features:
 * - Schema-first generation (recommended)
 * - Self-healing validation pipeline
 * - Model escalation on repair (haiku → sonnet)
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  CalculatedMetricRecipe,
  GenerateRecipeRequest,
  GenerateRecipeResponse,
  KPIRecipe,
  FailedRecipe,
  GenerationStats,
  ValidationLogEntry,
} from "./types";
import { CalculatedMetricRecipeSchema, KPIRecipeSchema, ExtendedKPIRecipeSchema, COMMON_KPIS_BY_BUSINESS_TYPE, type KPISemanticDefinitionType, type ExtendedKPISemanticDefinitionType, type ExtendedKPIRecipe } from "./types";
import { createEmitter } from "@repo/liquid-connect";
import { compileKPIFormula, type KPISemanticDefinition } from "@repo/liquid-connect/kpi";
import {
  detectColumnSemantic,
  generateSemanticContext,
  type ColumnSemantic,
} from "@repo/liquid-connect/uvb";
import {
  SCHEMA_FIRST_GENERATION_PROMPT,
  SCHEMA_REPAIR_PROMPT,
  COMPILE_REPAIR_PROMPT,
} from "./prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================================
// Validation & Repair Pipeline
// ============================================================================

/**
 * Enhanced validation log with full LLM I/O tracing.
 * Enables prompt version comparison and learning from repair pairs.
 */
interface ValidationLog {
  timestamp: string;
  attempt: number;
  stage: "schema" | "compile" | "repair";
  error?: string;
  model?: string;
  result?: "success" | "failed" | "fixed";

  // Prompt tracking
  promptName?: string;
  promptVersion?: string;

  // Full LLM I/O (for learning)
  fullPrompt?: string;
  rawInput?: unknown;
  rawOutput?: unknown;

  // Performance metrics
  latencyMs?: number;
  tokensIn?: number;
  tokensOut?: number;
}

const MODEL_IDS = {
  haiku: "claude-3-5-haiku-20241022",
  sonnet: "claude-sonnet-4-5-20250929",
};

/**
 * Get model ID based on attempt (escalates from haiku to sonnet)
 */
function getModelForAttempt(attempt: number): { tier: "haiku" | "sonnet"; id: string } {
  const tier = attempt <= 1 ? "haiku" : "sonnet";
  return { tier, id: MODEL_IDS[tier] };
}

/**
 * Test if a KPI definition compiles to valid SQL
 */
function testCompilation(
  kpiDefinition: unknown
): { success: true; sql: string } | { success: false; error: string } {
  try {
    const emitter = createEmitter("duckdb", { defaultSchema: undefined });
    // Use type assertion since KPISemanticDefinition types may vary between packages
    const result = compileKPIFormula(kpiDefinition as KPISemanticDefinition, emitter, {
      quoteIdentifiers: true,
    });

    if (result.success) {
      return { success: true, sql: result.expression };
    }
    return { success: false, error: result.error || "Unknown compilation error" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Build repair prompt for compile errors using versioned template.
 */
function buildRepairPrompt(
  error: string,
  kpiDefinition: unknown,
  schemaContext?: string
): string {
  return COMPILE_REPAIR_PROMPT.render({
    kpiDefinition,
    error,
    schemaContext,
  });
}

/**
 * Result from LLM repair attempt with full trace data.
 */
interface RepairResult {
  success: boolean;
  fixed?: unknown;
  error?: string;
  trace: {
    fullPrompt: string;
    rawInput: unknown;
    rawOutput?: unknown;
    latencyMs: number;
    tokensIn?: number;
    tokensOut?: number;
  };
}

/**
 * Attempt to repair a broken KPI definition using LLM.
 * Returns full trace data for learning and debugging.
 */
async function repairKPIDefinition(
  kpiDefinition: unknown,
  error: string,
  attempt: number,
  schemaContext?: string
): Promise<RepairResult> {
  const { tier, id: modelId } = getModelForAttempt(attempt);
  const prompt = buildRepairPrompt(error, kpiDefinition, schemaContext);
  const startTime = Date.now();

  try {
    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: 4000,
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }],
    });

    const latencyMs = Date.now() - startTime;
    const content = response.content[0];

    if (!content || content.type !== "text") {
      return {
        success: false,
        error: "No text response from LLM",
        trace: {
          fullPrompt: prompt,
          rawInput: kpiDefinition,
          latencyMs,
          tokensIn: response.usage?.input_tokens,
          tokensOut: response.usage?.output_tokens,
        },
      };
    }

    let jsonText = content.text.trim();
    // Strip markdown code blocks if present
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const fixed = JSON.parse(jsonText) as KPISemanticDefinition;
    console.log(`[KPIValidator] Repair successful using ${tier}`);

    return {
      success: true,
      fixed,
      trace: {
        fullPrompt: prompt,
        rawInput: kpiDefinition,
        rawOutput: fixed,
        latencyMs,
        tokensIn: response.usage?.input_tokens,
        tokensOut: response.usage?.output_tokens,
      },
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[KPIValidator] Repair failed (${tier}):`, message);

    return {
      success: false,
      error: message,
      trace: {
        fullPrompt: prompt,
        rawInput: kpiDefinition,
        latencyMs,
      },
    };
  }
}

/**
 * Validate and optionally repair a KPI recipe.
 * Returns validated recipe or null if validation fails after max attempts.
 * Supports all 7 KPI types via ExtendedKPIRecipe.
 * Includes full trace data for each validation/repair attempt.
 */
async function validateAndRepairKPI(
  recipe: ExtendedKPIRecipe,
  options: {
    maxAttempts?: number;
    schemaContext?: string;
  } = {}
): Promise<{
  success: boolean;
  recipe?: ExtendedKPIRecipe;
  validationLog: ValidationLog[];
}> {
  const { maxAttempts = 2, schemaContext } = options;
  const log: ValidationLog[] = [];
  let attempt = 0;
  let currentDefinition: unknown = recipe.kpiDefinition;

  while (attempt < maxAttempts) {
    attempt++;
    const { tier } = getModelForAttempt(attempt);

    // Test compilation
    const compileResult = testCompilation(currentDefinition);

    if (compileResult.success) {
      log.push({
        timestamp: new Date().toISOString(),
        attempt,
        stage: "compile",
        result: "success",
        rawInput: currentDefinition,
      });

      // Return recipe with (possibly fixed) definition
      return {
        success: true,
        recipe: {
          ...recipe,
          kpiDefinition: currentDefinition as ExtendedKPISemanticDefinitionType,
        },
        validationLog: log,
      };
    }

    // Compilation failed
    log.push({
      timestamp: new Date().toISOString(),
      attempt,
      stage: "compile",
      error: compileResult.error,
      result: "failed",
      rawInput: currentDefinition,
    });

    // Attempt repair
    const repairResult = await repairKPIDefinition(
      currentDefinition,
      compileResult.error,
      attempt,
      schemaContext
    );

    if (repairResult.success && repairResult.fixed) {
      log.push({
        timestamp: new Date().toISOString(),
        attempt,
        stage: "repair",
        model: tier,
        result: "fixed",
        promptName: COMPILE_REPAIR_PROMPT.name,
        promptVersion: COMPILE_REPAIR_PROMPT.version,
        fullPrompt: repairResult.trace.fullPrompt,
        rawInput: repairResult.trace.rawInput,
        rawOutput: repairResult.trace.rawOutput,
        latencyMs: repairResult.trace.latencyMs,
        tokensIn: repairResult.trace.tokensIn,
        tokensOut: repairResult.trace.tokensOut,
      });
      currentDefinition = repairResult.fixed;
      // Continue loop to re-validate
    } else {
      log.push({
        timestamp: new Date().toISOString(),
        attempt,
        stage: "repair",
        model: tier,
        error: repairResult.error,
        result: "failed",
        promptName: COMPILE_REPAIR_PROMPT.name,
        promptVersion: COMPILE_REPAIR_PROMPT.version,
        fullPrompt: repairResult.trace.fullPrompt,
        rawInput: repairResult.trace.rawInput,
        latencyMs: repairResult.trace.latencyMs,
        tokensIn: repairResult.trace.tokensIn,
        tokensOut: repairResult.trace.tokensOut,
      });
      // Continue to try with escalated model
    }
  }

  // Max attempts reached
  return {
    success: false,
    validationLog: log,
  };
}

/**
 * Build repair prompt for Zod schema errors using versioned template.
 */
function buildSchemaRepairPrompt(
  zodError: string,
  originalItem: unknown,
  schemaContext?: string
): string {
  return SCHEMA_REPAIR_PROMPT.render({
    originalDefinition: originalItem,
    zodError,
    schemaContext,
  });
}

/**
 * Validate and repair a raw LLM output against Zod schema.
 * Returns validated ExtendedKPIRecipe or null if validation fails after max attempts.
 * Supports all 7 KPI types: simple, ratio, derived, filtered, window, case, composite.
 * Includes full trace data for each validation/repair attempt.
 */
async function validateAndRepairSchema(
  item: unknown,
  options: {
    maxAttempts?: number;
    schemaContext?: string;
  } = {}
): Promise<{
  success: boolean;
  recipe?: ExtendedKPIRecipe;
  validationLog: ValidationLog[];
}> {
  const { maxAttempts = 2, schemaContext } = options;
  const log: ValidationLog[] = [];
  let attempt = 0;
  let currentItem = item;

  while (attempt < maxAttempts) {
    attempt++;
    const { tier, id: modelId } = getModelForAttempt(attempt);

    // Try Zod validation with Extended schema (supports all 7 KPI types)
    const parseResult = ExtendedKPIRecipeSchema.safeParse(currentItem);

    if (parseResult.success) {
      log.push({
        timestamp: new Date().toISOString(),
        attempt,
        stage: "schema",
        result: "success",
        rawInput: currentItem,
      });

      return {
        success: true,
        recipe: parseResult.data,
        validationLog: log,
      };
    }

    // Schema validation failed - extract detailed error
    const zodError = parseResult.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    log.push({
      timestamp: new Date().toISOString(),
      attempt,
      stage: "schema",
      error: zodError,
      result: "failed",
      rawInput: currentItem,
    });

    // Attempt repair with LLM
    const prompt = buildSchemaRepairPrompt(zodError, currentItem, schemaContext);
    const startTime = Date.now();

    try {
      const response = await anthropic.messages.create({
        model: modelId,
        max_tokens: 4000,
        temperature: 0.1,
        messages: [{ role: "user", content: prompt }],
      });

      const latencyMs = Date.now() - startTime;
      const content = response.content[0];

      if (!content || content.type !== "text") {
        log.push({
          timestamp: new Date().toISOString(),
          attempt,
          stage: "repair",
          model: tier,
          error: "No text response from LLM",
          result: "failed",
          promptName: SCHEMA_REPAIR_PROMPT.name,
          promptVersion: SCHEMA_REPAIR_PROMPT.version,
          fullPrompt: prompt,
          rawInput: currentItem,
          latencyMs,
          tokensIn: response.usage?.input_tokens,
          tokensOut: response.usage?.output_tokens,
        });
        continue;
      }

      let jsonText = content.text.trim();
      // Strip markdown code blocks if present
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }

      const fixed = JSON.parse(jsonText);
      log.push({
        timestamp: new Date().toISOString(),
        attempt,
        stage: "repair",
        model: tier,
        result: "fixed",
        promptName: SCHEMA_REPAIR_PROMPT.name,
        promptVersion: SCHEMA_REPAIR_PROMPT.version,
        fullPrompt: prompt,
        rawInput: currentItem,
        rawOutput: fixed,
        latencyMs,
        tokensIn: response.usage?.input_tokens,
        tokensOut: response.usage?.output_tokens,
      });

      currentItem = fixed;
      // Continue loop to re-validate
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);
      log.push({
        timestamp: new Date().toISOString(),
        attempt,
        stage: "repair",
        model: tier,
        error: message,
        result: "failed",
        promptName: SCHEMA_REPAIR_PROMPT.name,
        promptVersion: SCHEMA_REPAIR_PROMPT.version,
        fullPrompt: prompt,
        rawInput: currentItem,
        latencyMs,
      });
      // Continue to try with escalated model
    }
  }

  // Max attempts reached
  return {
    success: false,
    validationLog: log,
  };
}

/**
 * Input type for generateKPIRecipes - allows optional fields that have defaults
 */
export type GenerateRecipeInput = Omit<GenerateRecipeRequest, "useSchemaFirstGeneration" | "generateCommonKPIs"> & {
  useSchemaFirstGeneration?: boolean;
  generateCommonKPIs?: boolean;
};

/**
 * Generate KPI recipes using Claude
 *
 * Supports two modes:
 * 1. Schema-First (recommended): Ask "what KPIs can you calculate from these columns?"
 * 2. Legacy: Given a list of KPI names, try to map them to the schema
 */
export async function generateKPIRecipes(
  input: GenerateRecipeInput,
  options: {
    model?: "haiku" | "sonnet";
    maxRecipes?: number;
  } = {}
): Promise<GenerateRecipeResponse> {
  const { model = "haiku", maxRecipes = 20 } = options;

  // Apply defaults
  const request: GenerateRecipeRequest = {
    ...input,
    useSchemaFirstGeneration: input.useSchemaFirstGeneration ?? false,
    generateCommonKPIs: input.generateCommonKPIs ?? true,
  };

  // Use schema-first generation if enabled (recommended)
  if (request.useSchemaFirstGeneration) {
    return generateSchemaFirstKPIs(request, model, maxRecipes);
  }

  // Legacy mode: generate from predefined KPI list
  const kpisToGenerate = request.requestedKPIs?.length
    ? request.requestedKPIs
    : request.generateCommonKPIs
      ? COMMON_KPIS_BY_BUSINESS_TYPE[request.businessType]?.slice(0, maxRecipes) || []
      : [];

  if (kpisToGenerate.length === 0) {
    return {
      recipes: [],
      totalGenerated: 0,
      feasibleCount: 0,
      infeasibleCount: 0,
      averageConfidence: 0,
      warnings: ["No KPIs specified and no common KPIs found for business type"],
    };
  }

  // Build schema context for LLM
  const schemaContext = buildSchemaContext(request.vocabularyContext);

  // Generate recipes in parallel (max 5 at a time to avoid rate limits)
  const batchSize = 5;
  const allRecipes: CalculatedMetricRecipe[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < kpisToGenerate.length; i += batchSize) {
    const batch = kpisToGenerate.slice(i, i + batchSize);
    const batchPromises = batch.map((kpiName) =>
      generateSingleRecipe(kpiName, schemaContext, request.businessType, model)
    );

    const batchResults = await Promise.allSettled(batchPromises);

    batchResults.forEach((result, idx) => {
      if (result.status === "fulfilled" && result.value) {
        allRecipes.push(result.value);
      } else if (result.status === "rejected") {
        warnings.push(`Failed to generate recipe for ${batch[idx]}: ${result.reason}`);
      }
    });
  }

  // Calculate statistics
  const feasibleRecipes = allRecipes.filter((r) => r.feasible);
  const averageConfidence =
    allRecipes.length > 0
      ? allRecipes.reduce((sum, r) => sum + r.confidence, 0) / allRecipes.length
      : 0;

  return {
    recipes: allRecipes,
    totalGenerated: allRecipes.length,
    feasibleCount: feasibleRecipes.length,
    infeasibleCount: allRecipes.length - feasibleRecipes.length,
    averageConfidence,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Convert new KPIRecipe (DSL format) to legacy CalculatedMetricRecipe format.
 *
 * This enables backward compatibility while we transition to the DSL approach.
 * The DSL definition is preserved in semanticDefinition.kpiDefinition for
 * downstream compilation by the KPI compiler.
 */
function convertKPIRecipeToLegacy(
  recipe: ExtendedKPIRecipe | KPIRecipe,
  validationLog?: ValidationLog[]
): CalculatedMetricRecipe {
  const { kpiDefinition } = recipe;

  // Build legacy semanticDefinition from DSL definition
  // The expression field stores a placeholder - actual SQL is compiled later
  let expression: string;
  let aggregation: "SUM" | "AVG" | "COUNT" | "COUNT_DISTINCT" | "MIN" | "MAX" | undefined;

  if (kpiDefinition.type === "simple") {
    // Simple KPI: aggregation(expression)
    expression = kpiDefinition.expression;
    // Map extended aggregations to basic ones for legacy format
    const basicAggregations = ["SUM", "AVG", "COUNT", "COUNT_DISTINCT", "MIN", "MAX"];
    aggregation = basicAggregations.includes(kpiDefinition.aggregation)
      ? kpiDefinition.aggregation as "SUM" | "AVG" | "COUNT" | "COUNT_DISTINCT" | "MIN" | "MAX"
      : "SUM"; // Default to SUM for extended aggregations
  } else if (kpiDefinition.type === "ratio") {
    // Ratio KPI: Placeholder - will be compiled by KPI compiler
    // Store a human-readable formula representation
    const numExpr = kpiDefinition.numerator.expression;
    const denomExpr = kpiDefinition.denominator.expression;
    expression = `(${kpiDefinition.numerator.aggregation}(${numExpr})) / (${kpiDefinition.denominator.aggregation}(${denomExpr}))`;
    if (kpiDefinition.multiplier) {
      expression = `(${expression}) * ${kpiDefinition.multiplier}`;
    }
    // No single aggregation for ratio KPIs
    aggregation = undefined;
  } else if (kpiDefinition.type === "derived") {
    // Derived KPI: expression with @metric references
    expression = kpiDefinition.expression;
    aggregation = undefined;
  } else if (kpiDefinition.type === "filtered") {
    // Filtered KPI: uses subquery
    expression = kpiDefinition.expression;
    aggregation = undefined;
  } else if (kpiDefinition.type === "window") {
    // Window KPI: uses window functions
    expression = kpiDefinition.expression;
    aggregation = undefined;
  } else if (kpiDefinition.type === "case") {
    // Case KPI: CASE WHEN expression
    expression = "CASE";
    aggregation = undefined;
  } else if (kpiDefinition.type === "composite") {
    // Composite KPI: multi-table join
    expression = kpiDefinition.expression;
    aggregation = undefined;
  } else {
    expression = "";
    aggregation = undefined;
  }

  // Build filters array
  const filters = "filters" in kpiDefinition ? kpiDefinition.filters : undefined;

  // Build dependencies list (for derived KPIs)
  const dependencies = kpiDefinition.type === "derived" ? kpiDefinition.dependencies : undefined;

  // Map extended KPI types to legacy types
  // Legacy only supports: simple, derived, cumulative
  const legacyType: "simple" | "derived" | "cumulative" =
    kpiDefinition.type === "derived" ? "derived" : "simple";

  // Build the semantic definition with the extended KPI definition embedded
  const semanticDefinition = {
    type: legacyType,
    expression,
    aggregation,
    entity: kpiDefinition.entity,
    timeField: kpiDefinition.timeField,
    filters,
    dependencies,
    description: recipe.description,
    format: recipe.format,
  };

  // CRITICAL: Store original DSL definition for compilation
  // This is used by the KPI compiler to generate proper SQL
  (semanticDefinition as Record<string, unknown>)._kpiDefinition = kpiDefinition;

  // Build validation log for training data (only if repairs occurred)
  const repairsOccurred = validationLog?.some((l) => l.stage === "repair");

  return {
    name: recipe.name,
    description: recipe.description,
    category: recipe.category as "revenue" | "growth" | "retention" | "engagement" | "efficiency" | "fulfillment" | "inventory" | "finance" | "pricing" | "logistics" | "operational" | "risk" | "custom",
    semanticDefinition,
    businessType: recipe.businessType,
    confidence: recipe.confidence,
    feasible: recipe.feasible,
    infeasibilityReason: recipe.infeasibilityReason,
    requiredColumns: recipe.requiredColumns,
    // Only include validation log if repairs occurred (saves space)
    validationLog: repairsOccurred ? validationLog : undefined,
  };
}

/**
 * Hybrid KPI Generation with DSL Output
 *
 * Combines business relevance with schema feasibility using DSL definitions:
 * 1. Start with KPIs that MATTER for this business type
 * 2. Check which can be calculated from the available schema
 * 3. Discover unique KPIs the data enables
 * 4. Output structured DSL definitions (not raw SQL)
 *
 * The DSL definitions are compiled to SQL by the KPI compiler using
 * dialect-specific emitters (DuckDB, PostgreSQL, etc.).
 *
 * Benefits:
 * - Business-meaningful KPIs (not just technically possible)
 * - 100% feasibility (constrained to actual columns)
 * - Dialect-agnostic output (no SQL syntax errors)
 * - Discovery of unique insights from the data
 */
async function generateSchemaFirstKPIs(
  request: GenerateRecipeRequest,
  model: "haiku" | "sonnet",
  maxRecipes: number
): Promise<GenerateRecipeResponse> {
  const modelId =
    model === "sonnet"
      ? "claude-sonnet-4-5-20250929"
      : "claude-3-5-haiku-20241022";

  // Use pre-formatted enriched schema if available
  const schemaMarkdown =
    request.vocabularyContext.enrichedSchemaMarkdown ||
    buildSchemaContext(request.vocabularyContext);

  // Get business-relevant KPIs for this type
  const businessKPIs = COMMON_KPIS_BY_BUSINESS_TYPE[request.businessType] || [];
  const priorityKPIs = businessKPIs.slice(0, 15); // Top priority KPIs for this business

  // Use versioned prompt template
  const prompt = SCHEMA_FIRST_GENERATION_PROMPT.render({
    businessType: request.businessType,
    priorityKPIs,
    schemaMarkdown,
    maxRecipes,
  });

  // Log initial generation context for tracing
  const generationTrace = {
    promptName: SCHEMA_FIRST_GENERATION_PROMPT.name,
    promptVersion: SCHEMA_FIRST_GENERATION_PROMPT.version,
    fullPrompt: prompt,
    model: modelId,
  };

  const startTime = Date.now();

  try {
    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: 8000,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });

    const latencyMs = Date.now() - startTime;

    // Capture initial generation trace (for debugging/analytics)
    const initialGenerationTrace: ValidationLog = {
      timestamp: new Date().toISOString(),
      attempt: 0, // Initial generation, not a repair attempt
      stage: "schema",
      result: "success",
      promptName: generationTrace.promptName,
      promptVersion: generationTrace.promptVersion,
      fullPrompt: generationTrace.fullPrompt,
      model,
      latencyMs,
      tokensIn: response.usage?.input_tokens,
      tokensOut: response.usage?.output_tokens,
    };

    console.log(
      `[SchemaFirstKPI] Initial generation: ${latencyMs}ms, ` +
      `${response.usage?.input_tokens ?? "?"} tokens in, ` +
      `${response.usage?.output_tokens ?? "?"} tokens out`
    );

    const content = response.content[0];
    if (!content || content.type !== "text") {
      throw new Error("No text content in response");
    }

    // Parse JSON array from response
    const jsonText = content.text.trim();
    const parsed = JSON.parse(jsonText);

    if (!Array.isArray(parsed)) {
      throw new Error("Expected JSON array of KPIs");
    }

    // Validate each recipe using new KPIRecipeSchema (DSL format)
    // Then validate compilation and repair if needed
    // Finally convert to legacy format for backward compatibility
    const recipes: CalculatedMetricRecipe[] = [];
    const failedRecipes: FailedRecipe[] = [];
    const warnings: string[] = [];

    // Detailed stats tracking
    const stats: GenerationStats = {
      attempted: parsed.length,
      passedSchema: 0,
      passedCompile: 0,
      repairedByHaiku: 0,
      repairedBySonnet: 0,
      finalSuccess: 0,
      finalFailed: 0,
    };

    for (const item of parsed) {
      const itemName = (item as { name?: string })?.name ?? "unknown";

      // Step 1: Validate against Zod schema (with repair if needed)
      const schemaResult = await validateAndRepairSchema(item, {
        maxAttempts: 2,
        schemaContext: schemaMarkdown,
      });

      if (!schemaResult.success) {
        stats.finalFailed++;
        const lastError = schemaResult.validationLog
          .filter((log) => log.error)
          .pop()?.error || "Unknown error";

        // Track failed recipe for storage
        failedRecipes.push({
          name: itemName,
          originalDefinition: item,
          failureStage: "schema",
          lastError,
          validationLog: schemaResult.validationLog as ValidationLogEntry[],
        });

        warnings.push(`KPI "${itemName}" failed schema validation: ${lastError}`);
        console.warn(`[SchemaFirstKPI] Failed KPI (schema): ${itemName}`);
        continue;
      }

      stats.passedSchema++;
      const validated = schemaResult.recipe!;

      // Track repairs from schema stage
      for (const log of schemaResult.validationLog) {
        if (log.stage === "repair" && log.result === "fixed") {
          if (log.model === "haiku") stats.repairedByHaiku++;
          else if (log.model === "sonnet") stats.repairedBySonnet++;
        }
      }

      // Step 2: Validate compilation and repair if needed
      const validationResult = await validateAndRepairKPI(validated, {
        maxAttempts: 2,
        schemaContext: schemaMarkdown,
      });

      if (validationResult.success && validationResult.recipe) {
        stats.passedCompile++;
        stats.finalSuccess++;

        // Track repairs from compile stage
        for (const log of validationResult.validationLog) {
          if (log.stage === "repair" && log.result === "fixed") {
            if (log.model === "haiku") stats.repairedByHaiku++;
            else if (log.model === "sonnet") stats.repairedBySonnet++;
          }
        }

        // Combine logs from both schema and compile stages for training data
        const combinedLogs = [...schemaResult.validationLog, ...validationResult.validationLog];

        // Convert to legacy format for backward compatibility (with validation logs for training)
        const legacyRecipe = convertKPIRecipeToLegacy(validationResult.recipe, combinedLogs);
        recipes.push(legacyRecipe);
      } else {
        // Compilation validation failed after max attempts
        stats.finalFailed++;
        const lastError = validationResult.validationLog
          .filter((log) => log.error)
          .pop()?.error || "Unknown error";

        // Combine logs from both stages
        const allLogs = [...schemaResult.validationLog, ...validationResult.validationLog];

        // Track failed recipe for storage
        failedRecipes.push({
          name: itemName,
          originalDefinition: validated,
          failureStage: "compile",
          lastError,
          validationLog: allLogs as ValidationLogEntry[],
        });

        warnings.push(`KPI "${itemName}" failed compilation: ${lastError}`);
        console.warn(`[SchemaFirstKPI] Failed KPI (compile): ${itemName}`);
      }
    }

    console.log(
      `[SchemaFirstKPI] Stats: ${stats.attempted} attempted, ${stats.finalSuccess} success, ${stats.finalFailed} failed, ` +
      `${stats.repairedByHaiku} fixed by Haiku, ${stats.repairedBySonnet} fixed by Sonnet`
    );

    // Calculate statistics
    const feasibleRecipes = recipes.filter((r) => r.feasible);
    const averageConfidence =
      recipes.length > 0
        ? recipes.reduce((sum, r) => sum + r.confidence, 0) / recipes.length
        : 0;

    console.log(`[SchemaFirstKPI] Generated ${recipes.length} KPIs (${feasibleRecipes.length} feasible)`);

    return {
      recipes,
      failedRecipes: failedRecipes.length > 0 ? failedRecipes : undefined,
      generationStats: stats,
      totalGenerated: recipes.length,
      feasibleCount: feasibleRecipes.length,
      infeasibleCount: recipes.length - feasibleRecipes.length,
      averageConfidence,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    console.error("[SchemaFirstKPI] Generation failed:", error);
    return {
      recipes: [],
      totalGenerated: 0,
      feasibleCount: 0,
      infeasibleCount: 0,
      averageConfidence: 0,
      warnings: [`Schema-first generation failed: ${error}`],
    };
  }
}

/**
 * Generate a single KPI recipe using Claude
 */
async function generateSingleRecipe(
  kpiName: string,
  schemaContext: string,
  businessType: string,
  model: "haiku" | "sonnet"
): Promise<CalculatedMetricRecipe | null> {
  const modelId =
    model === "sonnet"
      ? "claude-sonnet-4-5-20250929"
      : "claude-3-5-haiku-20241022";

  const prompt = `You are a data analyst expert. Generate a database-agnostic semantic metric definition for the following business KPI.

**KPI Name:** ${kpiName}
**Business Type:** ${businessType}

**Available Database Schema:**
${schemaContext}

**Task:**
Generate a semantic metric definition that describes HOW to calculate this KPI, not the actual SQL. LiquidConnect's emitters will generate database-specific SQL from your definition.

**Semantic Metric Types:**
- **simple**: Single aggregation on a column (e.g., SUM(amount), COUNT(*), AVG(price))
- **derived**: Combination of other metrics (e.g., (revenue - cost) / revenue)
- **cumulative**: Running total over time

**Output Format:**
Return ONLY a valid JSON object (no markdown, no explanation):

{
  "name": "Monthly Recurring Revenue",
  "description": "What this metric measures",
  "category": "revenue|growth|retention|engagement|efficiency|custom",

  "semanticDefinition": {
    "type": "simple|derived|cumulative",
    "expression": "column_name or formula",
    "aggregation": "SUM|AVG|COUNT|COUNT_DISTINCT|MIN|MAX (required for simple)",
    "entity": "table_name",
    "timeField": "timestamp_column (optional)",
    "timeGranularity": "month|week|day|hour|quarter|year (optional)",
    "filters": [
      {
        "field": "column_name",
        "operator": "=|!=|>|<|>=|<=|IN|NOT IN|LIKE|IS NULL|IS NOT NULL",
        "value": "filter_value (optional for NULL checks)"
      }
    ],
    "dependencies": ["metric1", "metric2"] (for derived metrics),
    "label": "Display name",
    "description": "What this calculates",
    "unit": "$ or % or users",
    "format": {
      "type": "number|currency|percent|duration",
      "decimals": 2,
      "currency": "USD (for currency)",
      "prefix": "$ (optional)",
      "suffix": "% (optional)"
    }
  },

  "businessType": ["${businessType}"],
  "confidence": 0.95,
  "feasible": true,
  "infeasibilityReason": "Reason if infeasible (optional)",

  "requiredColumns": [
    {
      "tableName": "table_name",
      "columnName": "column_name",
      "purpose": "How this column is used"
    }
  ]
}

**Examples:**

**Simple Metric (MRR):**
{
  "semanticDefinition": {
    "type": "simple",
    "expression": "amount",
    "aggregation": "SUM",
    "entity": "subscriptions",
    "timeField": "created_at",
    "timeGranularity": "month",
    "filters": [
      {"field": "status", "operator": "=", "value": "active"},
      {"field": "type", "operator": "=", "value": "recurring"}
    ],
    "format": {"type": "currency", "decimals": 2, "currency": "USD"}
  }
}

**Derived Metric (Churn Rate):**
{
  "semanticDefinition": {
    "type": "derived",
    "expression": "(churned_count / total_customers) * 100",
    "entity": "customers",
    "dependencies": ["churned_count", "total_customers"],
    "format": {"type": "percent", "decimals": 1}
  }
}

**Important Guidelines:**
- Use column names, NOT SQL syntax (LiquidConnect generates SQL)
- "expression" should be column name for simple metrics (e.g., "amount", not "SUM(amount)")
- For derived metrics, reference other metric names in "dependencies"
- Filters use field names from the entity, not table.column syntax
- Set feasible=false if required columns are missing
- Confidence reflects data availability:
  - 0.9-1.0: All required columns exist with exact semantics
  - 0.7-0.9: Columns exist but may need assumptions
  - 0.5-0.7: Using proxy columns
  - 0.0-0.5: Missing critical data`;

  try {
    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: 2000,
      temperature: 0.2, // Low temperature for more deterministic SQL generation
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (!content) {
      throw new Error("No content in Claude response");
    }

    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Parse and validate response
    const jsonText = content.text.trim();
    const parsed = JSON.parse(jsonText);

    // Validate against Zod schema
    const validated = CalculatedMetricRecipeSchema.parse(parsed);

    return validated;
  } catch (error) {
    console.error(`Failed to generate recipe for ${kpiName}:`, error);
    return null;
  }
}

/**
 * Build schema context string for LLM prompt.
 *
 * Enhanced with automatic column semantics detection:
 * - Detects percentage columns (0-1 = percentage)
 * - Detects currency, quantity, identifier columns
 * - Injects semantic hints into the prompt for accurate KPI generation
 */
function buildSchemaContext(vocabularyContext: GenerateRecipeRequest["vocabularyContext"]): string {
  const lines: string[] = [];

  // Collect detected semantics for context injection
  const detectedSemantics: Array<{
    tableName: string;
    columnName: string;
    semantic: ColumnSemantic;
    confidence: number;
  }> = [];

  vocabularyContext.tables.forEach((table) => {
    lines.push(`\nTable: ${table.name}`);
    lines.push("Columns:");

    table.columns.forEach((col) => {
      const parts = [`  - ${col.name} (${col.type})`];

      if (col.semanticType) {
        parts.push(`[semantic: ${col.semanticType}]`);
      }

      if (col.businessType) {
        parts.push(`[business: ${col.businessType}]`);
      }

      // Detect column semantics from profiling statistics
      if (col.statistics) {
        const minValue = typeof col.statistics.min === "number" ? col.statistics.min : null;
        const maxValue = typeof col.statistics.max === "number" ? col.statistics.max : null;

        const semanticResult = detectColumnSemantic(col.name, {
          dataType: col.type,
          minValue,
          maxValue,
          distinctCount: col.statistics.distinctCount,
          nullPercentage: col.statistics.nullPercentage,
        });

        // Only track high-confidence detections
        if (semanticResult.confidence >= 0.7 && semanticResult.semantic !== "UNKNOWN") {
          detectedSemantics.push({
            tableName: table.name,
            columnName: col.name,
            semantic: semanticResult.semantic,
            confidence: semanticResult.confidence,
          });

          // Add semantic annotation to column description
          parts.push(`[detected: ${semanticResult.semantic}]`);
        }
      }

      lines.push(parts.join(" "));
    });
  });

  if (vocabularyContext.detectedMetrics?.length) {
    lines.push("\nDetected Metrics:");
    vocabularyContext.detectedMetrics.forEach((m) => lines.push(`  - ${m}`));
  }

  if (vocabularyContext.detectedDimensions?.length) {
    lines.push("\nDetected Dimensions:");
    vocabularyContext.detectedDimensions.forEach((d) => lines.push(`  - ${d}`));
  }

  // Inject semantic context if we detected meaningful column semantics
  if (detectedSemantics.length > 0) {
    const semanticContext = generateSemanticContext(detectedSemantics);
    lines.push("\n" + semanticContext);
  }

  return lines.join("\n");
}

/**
 * Validate a recipe by checking if required columns exist in schema
 */
export function validateRecipe(
  recipe: CalculatedMetricRecipe,
  vocabularyContext: GenerateRecipeRequest["vocabularyContext"]
): {
  valid: boolean;
  missingColumns: Array<{ table: string; column: string }>;
} {
  const missingColumns: Array<{ table: string; column: string }> = [];

  if (!recipe.requiredColumns) {
    return { valid: true, missingColumns: [] };
  }

  recipe.requiredColumns.forEach((required) => {
    const table = vocabularyContext.tables.find(
      (t) => t.name.toLowerCase() === required.tableName.toLowerCase()
    );

    if (!table) {
      missingColumns.push({
        table: required.tableName,
        column: required.columnName,
      });
      return;
    }

    const column = table.columns.find(
      (c) => c.name.toLowerCase() === required.columnName.toLowerCase()
    );

    if (!column) {
      missingColumns.push({
        table: required.tableName,
        column: required.columnName,
      });
    }
  });

  return {
    valid: missingColumns.length === 0,
    missingColumns,
  };
}

/**
 * Convert recipe to LiquidConnect MetricDefinition
 * This is used to add the metric to the semantic layer
 */
export function recipeToMetricDefinition(
  recipe: CalculatedMetricRecipe
): any {
  // Returns a MetricDefinition that can be added to LiquidConnect's SemanticLayer
  return {
    type: recipe.semanticDefinition.type,
    aggregation: recipe.semanticDefinition.aggregation,
    expression: recipe.semanticDefinition.expression,
    entity: recipe.semanticDefinition.entity,
    timeField: recipe.semanticDefinition.timeField,
    description: recipe.semanticDefinition.description,
    label: recipe.semanticDefinition.label,
    unit: recipe.semanticDefinition.unit,
    format: recipe.semanticDefinition.format,
    dependencies: recipe.semanticDefinition.dependencies,
    requiredFilters: recipe.semanticDefinition.filters?.map(f =>
      `${f.field} ${f.operator} ${f.value !== undefined ? f.value : ''}`
    ),
  };
}

/**
 * Execute a recipe with caching support (5-minute TTL)
 *
 * Checks cache first, then executes if needed.
 * Cache key format: `calculated-metric:{recipeName}:{connectionId}:{hash}`
 *
 * @param recipe - The calculated metric recipe to execute
 * @param options - Execution options including connection details
 * @returns Query results with metric values (includes `cached` field)
 */
export async function executeRecipeWithCache(
  recipe: CalculatedMetricRecipe,
  options: Parameters<typeof executeRecipe>[1]
): Promise<{
  success: boolean;
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  sql: string;
  executionTimeMs: number;
  error?: string;
  cached: boolean;
}> {
  // Generate cache key from recipe + connection + filters
  const cacheKey = generateCacheKey(recipe, options);

  // Note: Caching is not implemented yet - would require @turbostarter/storage
  // For now, always execute fresh
  const result = await executeRecipe(recipe, options);
  return { ...result, cached: false };
}

/**
 * Generate cache key for a recipe execution
 */
function generateCacheKey(
  recipe: CalculatedMetricRecipe,
  options: Parameters<typeof executeRecipe>[1]
): string {
  // Hash the options to create a deterministic key
  const hashInput = JSON.stringify({
    recipeName: recipe.name,
    connectionId: options.connection.id,
    timeRange: options.timeRange,
    filters: options.additionalFilters,
    limit: options.limit,
  });

  // Simple hash function (for cache key - not cryptographic)
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const chr = hashInput.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }

  return `calculated-metric:${recipe.name}:${options.connection.id}:${Math.abs(hash)}`;
}

/**
 * Execute a recipe by generating SQL and running it via DuckDB adapter
 *
 * Architecture:
 * 1. Build LiquidFlow from recipe's semantic definition
 * 2. Use appropriate emitter to generate database-specific SQL
 * 3. Execute SQL via DuckDB adapter
 * 4. Return results
 *
 * Note: Use `executeRecipeWithCache()` for automatic caching support.
 *
 * @param recipe - The calculated metric recipe to execute
 * @param options - Execution options including connection details
 * @returns Query results with metric values
 */
export async function executeRecipe(
  recipe: CalculatedMetricRecipe,
  options: {
    /** Connection details for query execution */
    connection: {
      id: string;
      type: "postgres" | "mysql" | "duckdb";
      connectionString: string;
      defaultSchema?: string;
    };
    /** Time range for metric calculation (optional) */
    timeRange?: {
      start: string; // ISO date
      end: string; // ISO date
    };
    /** Additional filters to apply (optional) */
    additionalFilters?: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;
    /** Limit number of results (optional) */
    limit?: number;
  }
): Promise<{
  success: boolean;
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  sql: string;
  executionTimeMs: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // Import dependencies (dynamic to avoid circular deps)
    const { LiquidFlowBuilder } = await import("@repo/liquid-connect");
    const { createEmitter } = await import("@repo/liquid-connect");
    const { DuckDBUniversalAdapter } = await import("@repo/liquid-connect/uvb");

    const { semanticDefinition } = recipe;

    // Step 1: Build LiquidFlow from semantic definition
    const builder = LiquidFlowBuilder.metricQuery();

    // Add source
    builder.source({
      alias: "main",
      table: semanticDefinition.entity,
      schema: options.connection.defaultSchema || "public",
    });

    // Add metric
    builder.metric({
      ref: recipe.name,
      alias: recipe.name.toLowerCase().replace(/\s+/g, "_"),
      aggregation: semanticDefinition.aggregation!,
      expression: semanticDefinition.expression,
      sourceEntity: semanticDefinition.entity,
      timeField: semanticDefinition.timeField,
      derived: semanticDefinition.type === "derived",
    });

    // Add time dimension if timeField exists
    if (semanticDefinition.timeField && semanticDefinition.timeGranularity) {
      const timeExpr = generateTimeTrunc(
        semanticDefinition.timeField,
        semanticDefinition.timeGranularity,
        options.connection.type
      );

      builder.dimension({
        ref: "time_period",
        alias: "time_period",
        expression: timeExpr,
        sourceEntity: semanticDefinition.entity,
        type: "timestamp",
      });
    }

    // Add time range filter if provided
    if (options.timeRange && semanticDefinition.timeField) {
      builder.time({
        field: semanticDefinition.timeField,
        start: options.timeRange.start,
        end: options.timeRange.end,
        expression: `${semanticDefinition.timeField} BETWEEN '${options.timeRange.start}' AND '${options.timeRange.end}'`,
      });
    }

    // Add filters from semantic definition
    if (semanticDefinition.filters?.length) {
      for (const filter of semanticDefinition.filters) {
        builder.filter({
          field: filter.field,
          operator: filter.operator as any,
          value: filter.value,
        });
      }
    }

    // Add additional filters
    if (options.additionalFilters?.length) {
      for (const filter of options.additionalFilters) {
        builder.filter({
          field: filter.field,
          operator: filter.operator as any,
          value: filter.value,
        });
      }
    }

    // Add limit
    if (options.limit) {
      builder.limit(options.limit);
    }

    // Build LiquidFlow
    const flow = builder.build();

    // Step 2: Generate SQL using appropriate emitter
    const dialect = options.connection.type === "mysql" ? "duckdb" : options.connection.type;
    const emitter = createEmitter(dialect as any, {
      defaultSchema: options.connection.defaultSchema,
    });

    const emitResult = emitter.emit(flow);
    const sql = emitResult.sql;

    // Step 3: Execute via DuckDB adapter
    const adapter = new DuckDBUniversalAdapter();
    await adapter.connect(options.connection.connectionString);

    try {
      const rows = await adapter.query(sql, emitResult.params);

      return {
        success: true,
        rows: rows as Array<Record<string, unknown>>,
        rowCount: rows.length,
        sql,
        executionTimeMs: Date.now() - startTime,
      };
    } finally {
      await adapter.disconnect();
    }
  } catch (error) {
    return {
      success: false,
      rows: [],
      rowCount: 0,
      sql: "",
      executionTimeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate time truncation expression for different databases
 */
function generateTimeTrunc(
  field: string,
  granularity: string,
  dbType: "postgres" | "mysql" | "duckdb"
): string {
  if (dbType === "postgres" || dbType === "duckdb") {
    return `DATE_TRUNC('${granularity}', ${field})`;
  }

  // MySQL
  switch (granularity) {
    case "year":
      return `DATE_FORMAT(${field}, '%Y-01-01')`;
    case "month":
      return `DATE_FORMAT(${field}, '%Y-%m-01')`;
    case "week":
      return `DATE_FORMAT(${field}, '%Y-%m-%d')`;
    case "day":
      return `DATE_FORMAT(${field}, '%Y-%m-%d')`;
    case "hour":
      return `DATE_FORMAT(${field}, '%Y-%m-%d %H:00:00')`;
    default:
      return field;
  }
}
