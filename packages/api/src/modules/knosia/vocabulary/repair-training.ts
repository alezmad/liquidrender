/**
 * KPI Repair Training Service
 *
 * Collects training data from KPI repairs and implements the tiered
 * auto-repair system:
 *
 * 1. COLLECT - Record every repair with before/after definitions
 * 2. DETECT - Identify patterns by error signature
 * 3. CLASSIFY - Determine if systemic, contextual, or hallucination
 * 4. PROPOSE - Generate prompt fix proposals
 * 5. TEST - A/B test medium-confidence fixes
 * 6. APPLY - Auto-apply high-confidence fixes
 */

import { createHash } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@turbostarter/db/server";
import {
  knosiaKpiRepairTraining,
  knosiaErrorPattern,
  knosiaPromptFix,
  type SelectKnosiaErrorPattern,
} from "@turbostarter/db/schema/knosia";
import { eq, sql, and, gte, desc } from "drizzle-orm";
import { generateId } from "@turbostarter/shared/utils";

// ============================================================================
// Types
// ============================================================================

export type RepairClassification =
  | "systemic"
  | "contextual"
  | "hallucination"
  | "edge_case";

export type RepairConfidence = "high" | "medium" | "low";

export type PromptAction =
  | "fix_prompt"
  | "add_example"
  | "ignore"
  | "accept_repair"
  | "pending";

export interface RepairRecord {
  workspaceId?: string;
  vocabularyItemId?: string;
  errorType: string;
  errorMessage: string;
  originalDefinition: unknown;
  repairedDefinition?: unknown;
  kpiType?: string;
  kpiCategory?: string;
  entityType?: string;
  aggregationType?: string;
  repairModel: string;
  repairSuccess: boolean;
  repairLatencyMs?: number;
  repairTokensIn?: number;
  repairTokensOut?: number;
}

export interface PatternStats {
  errorSignature: string;
  totalOccurrences: number;
  repairSuccessRate: number;
  distinctKpiTypes: string[];
  distinctEntities: string[];
  classification: RepairClassification;
  confidence: RepairConfidence;
  promptAction: PromptAction;
}

export interface PromptFixProposal {
  errorSignature: string;
  errorType: string;
  patternDescription: string;
  fixType: "add_rule" | "add_example" | "modify_rule" | "add_constraint";
  proposedChange: string;
  targetPromptSection?: string;
  triggerFrequency: number;
  triggerKpiTypes: string[];
  confidence: RepairConfidence;
}

// ============================================================================
// Error Signature Generation
// ============================================================================

/**
 * Generate a normalized error signature for grouping similar errors
 *
 * Strategy:
 * - Extract the error type and key error keywords
 * - Normalize variable parts (column names, table names)
 * - Create a hash for efficient lookup
 */
export function generateErrorSignature(
  errorType: string,
  errorMessage: string
): string {
  // Normalize the error message:
  // 1. Remove specific column/table names (replace with placeholders)
  // 2. Remove specific values
  // 3. Extract the structural error pattern

  let normalized = errorMessage.toLowerCase();

  // Replace quoted identifiers with placeholders
  normalized = normalized.replace(/"[^"]+"/g, "<identifier>");
  normalized = normalized.replace(/'[^']+'/g, "<value>");

  // Replace numbers
  normalized = normalized.replace(/\b\d+\b/g, "<number>");

  // Extract key error keywords
  const keywords: string[] = [];

  // Common error patterns
  if (normalized.includes("missing")) keywords.push("missing");
  if (normalized.includes("required")) keywords.push("required");
  if (normalized.includes("invalid")) keywords.push("invalid");
  if (normalized.includes("unknown")) keywords.push("unknown");
  if (normalized.includes("percentof")) keywords.push("percentOf");
  if (normalized.includes("aggregation")) keywords.push("aggregation");
  if (normalized.includes("expression")) keywords.push("expression");
  if (normalized.includes("entity")) keywords.push("entity");
  if (normalized.includes("type")) keywords.push("type");
  if (normalized.includes("filter")) keywords.push("filter");
  if (normalized.includes("column")) keywords.push("column");
  if (normalized.includes("table")) keywords.push("table");

  // Create signature
  const signatureBase = `${errorType}:${keywords.sort().join(":")}`;

  // Hash for consistent length
  const hash = createHash("sha256")
    .update(signatureBase)
    .digest("hex")
    .substring(0, 12);

  return `${errorType}:${hash}`;
}

/**
 * Extract a human-readable error template from the message
 */
export function extractErrorTemplate(errorMessage: string): string {
  let template = errorMessage;

  // Replace specific identifiers with placeholders
  template = template.replace(/"[^"]+"/g, "<identifier>");
  template = template.replace(/'[^']+'/g, "<value>");
  template = template.replace(/\b\d+\b/g, "<N>");

  // Truncate if too long
  if (template.length > 200) {
    template = template.substring(0, 197) + "...";
  }

  return template;
}

// ============================================================================
// Training Data Collection
// ============================================================================

/**
 * Record a repair attempt for training data collection
 */
export async function recordRepair(record: RepairRecord): Promise<string> {
  const errorSignature = generateErrorSignature(
    record.errorType,
    record.errorMessage
  );

  const id = generateId();

  // Insert training record
  await db.insert(knosiaKpiRepairTraining).values({
    id,
    workspaceId: record.workspaceId,
    vocabularyItemId: record.vocabularyItemId,
    errorType: record.errorType,
    errorMessage: record.errorMessage,
    errorSignature,
    originalDefinition: record.originalDefinition,
    repairedDefinition: record.repairedDefinition,
    kpiType: record.kpiType,
    kpiCategory: record.kpiCategory,
    entityType: record.entityType,
    aggregationType: record.aggregationType,
    repairModel: record.repairModel,
    repairSuccess: record.repairSuccess,
    repairLatencyMs: record.repairLatencyMs,
    repairTokensIn: record.repairTokensIn,
    repairTokensOut: record.repairTokensOut,
    // Classification will be updated by pattern analysis
    classification: "hallucination",
    confidence: "low",
    promptAction: "pending",
  });

  // Update pattern index
  await updatePatternIndex(errorSignature, record);

  return id;
}

/**
 * Update the error pattern index with new occurrence
 */
async function updatePatternIndex(
  errorSignature: string,
  record: RepairRecord
): Promise<void> {
  const errorTemplate = extractErrorTemplate(record.errorMessage);

  // Upsert pattern
  await db
    .insert(knosiaErrorPattern)
    .values({
      id: generateId(),
      errorSignature,
      errorType: record.errorType,
      errorMessageTemplate: errorTemplate,
      totalOccurrences: 1,
      repairSuccessCount: record.repairSuccess ? 1 : 0,
      repairFailureCount: record.repairSuccess ? 0 : 1,
      distinctKpiTypes: record.kpiType ? [record.kpiType] : [],
      distinctEntities: record.entityType ? [record.entityType] : [],
      distinctWorkspaces: record.workspaceId ? 1 : 0,
      promptAction: "pending",
    })
    .onConflictDoUpdate({
      target: knosiaErrorPattern.errorSignature,
      set: {
        totalOccurrences: sql`${knosiaErrorPattern.totalOccurrences} + 1`,
        repairSuccessCount: record.repairSuccess
          ? sql`${knosiaErrorPattern.repairSuccessCount} + 1`
          : knosiaErrorPattern.repairSuccessCount,
        repairFailureCount: record.repairSuccess
          ? knosiaErrorPattern.repairFailureCount
          : sql`${knosiaErrorPattern.repairFailureCount} + 1`,
        // Update arrays (PostgreSQL jsonb array append)
        // Note: JSON.stringify wraps strings in quotes for valid JSONB
        distinctKpiTypes: record.kpiType
          ? sql`(
              SELECT jsonb_agg(DISTINCT value)
              FROM (
                SELECT jsonb_array_elements(${knosiaErrorPattern.distinctKpiTypes}) AS value
                UNION SELECT ${JSON.stringify(record.kpiType)}::jsonb
              ) t
            )`
          : knosiaErrorPattern.distinctKpiTypes,
        distinctEntities: record.entityType
          ? sql`(
              SELECT jsonb_agg(DISTINCT value)
              FROM (
                SELECT jsonb_array_elements(${knosiaErrorPattern.distinctEntities}) AS value
                UNION SELECT ${JSON.stringify(record.entityType)}::jsonb
              ) t
            )`
          : knosiaErrorPattern.distinctEntities,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      },
    });

  // Reclassify the pattern
  await classifyPattern(errorSignature);
}

// ============================================================================
// Pattern Classification
// ============================================================================

/**
 * Classification thresholds
 */
const CLASSIFICATION_THRESHOLDS = {
  // Minimum occurrences to be considered systemic
  SYSTEMIC_MIN_OCCURRENCES: 5,
  // Minimum distinct KPI types for systemic (proves it's not domain-specific)
  SYSTEMIC_MIN_KPI_TYPES: 3,
  // Minimum occurrences for contextual (domain-specific)
  CONTEXTUAL_MIN_OCCURRENCES: 3,
  // If only 1 KPI type affected, it's contextual not systemic
  CONTEXTUAL_MAX_KPI_TYPES: 1,
  // Repair success rate threshold for high confidence
  HIGH_CONFIDENCE_SUCCESS_RATE: 0.9,
  // Repair success rate threshold for medium confidence
  MEDIUM_CONFIDENCE_SUCCESS_RATE: 0.7,
};

/**
 * Classify an error pattern based on its statistics
 */
export async function classifyPattern(errorSignature: string): Promise<void> {
  // Get pattern stats
  const [pattern] = await db
    .select()
    .from(knosiaErrorPattern)
    .where(eq(knosiaErrorPattern.errorSignature, errorSignature));

  if (!pattern) return;

  const { classification, confidence, promptAction } =
    computeClassification(pattern);

  // Update pattern
  await db
    .update(knosiaErrorPattern)
    .set({
      classification,
      confidence,
      promptAction,
      updatedAt: new Date(),
    })
    .where(eq(knosiaErrorPattern.errorSignature, errorSignature));

  // Update all training records with this signature
  await db
    .update(knosiaKpiRepairTraining)
    .set({
      classification,
      confidence,
      promptAction,
      patternId: pattern.id,
    })
    .where(eq(knosiaKpiRepairTraining.errorSignature, errorSignature));
}

/**
 * Compute classification from pattern statistics
 */
function computeClassification(pattern: SelectKnosiaErrorPattern): {
  classification: RepairClassification;
  confidence: RepairConfidence;
  promptAction: PromptAction;
} {
  const {
    totalOccurrences,
    repairSuccessCount,
    distinctKpiTypes,
    distinctEntities,
  } = pattern;

  const kpiTypesCount = (distinctKpiTypes as string[] | null)?.length ?? 0;
  const successRate =
    totalOccurrences > 0 ? repairSuccessCount / totalOccurrences : 0;

  // Classification logic
  let classification: RepairClassification;
  let confidence: RepairConfidence;
  let promptAction: PromptAction;

  if (totalOccurrences === 1) {
    // Single occurrence = hallucination until proven otherwise
    classification = "hallucination";
    confidence = "low";
    promptAction = "ignore";
  } else if (
    totalOccurrences >= CLASSIFICATION_THRESHOLDS.SYSTEMIC_MIN_OCCURRENCES &&
    kpiTypesCount >= CLASSIFICATION_THRESHOLDS.SYSTEMIC_MIN_KPI_TYPES
  ) {
    // High frequency + affects multiple KPI types = systemic
    classification = "systemic";
    confidence =
      successRate >= CLASSIFICATION_THRESHOLDS.HIGH_CONFIDENCE_SUCCESS_RATE
        ? "high"
        : successRate >= CLASSIFICATION_THRESHOLDS.MEDIUM_CONFIDENCE_SUCCESS_RATE
          ? "medium"
          : "low";
    promptAction = "fix_prompt";
  } else if (
    totalOccurrences >= CLASSIFICATION_THRESHOLDS.CONTEXTUAL_MIN_OCCURRENCES &&
    kpiTypesCount <= CLASSIFICATION_THRESHOLDS.CONTEXTUAL_MAX_KPI_TYPES
  ) {
    // Multiple occurrences but only affects one KPI type = contextual
    classification = "contextual";
    confidence =
      successRate >= CLASSIFICATION_THRESHOLDS.MEDIUM_CONFIDENCE_SUCCESS_RATE
        ? "medium"
        : "low";
    promptAction = "add_example";
  } else if (totalOccurrences >= 2 && totalOccurrences < 5) {
    // Few occurrences, might become systemic with more data
    classification = "edge_case";
    confidence = "low";
    promptAction = "accept_repair";
  } else {
    classification = "hallucination";
    confidence = "low";
    promptAction = "ignore";
  }

  return { classification, confidence, promptAction };
}

// ============================================================================
// Pattern Queries
// ============================================================================

/**
 * Get top error patterns by frequency
 */
export async function getTopPatterns(
  limit: number = 10
): Promise<PatternStats[]> {
  const patterns = await db
    .select()
    .from(knosiaErrorPattern)
    .orderBy(desc(knosiaErrorPattern.totalOccurrences))
    .limit(limit);

  return patterns.map((p) => ({
    errorSignature: p.errorSignature,
    totalOccurrences: p.totalOccurrences,
    repairSuccessRate:
      p.totalOccurrences > 0 ? p.repairSuccessCount / p.totalOccurrences : 0,
    distinctKpiTypes: (p.distinctKpiTypes as string[]) ?? [],
    distinctEntities: (p.distinctEntities as string[]) ?? [],
    classification: (p.classification as RepairClassification) ?? "hallucination",
    confidence: (p.confidence as RepairConfidence) ?? "low",
    promptAction: (p.promptAction as PromptAction) ?? "pending",
  }));
}

/**
 * Get patterns that need attention (systemic or contextual, not yet fixed)
 */
export async function getPatternsNeedingAction(): Promise<PatternStats[]> {
  const patterns = await db
    .select()
    .from(knosiaErrorPattern)
    .where(
      and(
        sql`${knosiaErrorPattern.classification} IN ('systemic', 'contextual')`,
        sql`${knosiaErrorPattern.activeFixId} IS NULL`
      )
    )
    .orderBy(desc(knosiaErrorPattern.totalOccurrences));

  return patterns.map((p) => ({
    errorSignature: p.errorSignature,
    totalOccurrences: p.totalOccurrences,
    repairSuccessRate:
      p.totalOccurrences > 0 ? p.repairSuccessCount / p.totalOccurrences : 0,
    distinctKpiTypes: (p.distinctKpiTypes as string[]) ?? [],
    distinctEntities: (p.distinctEntities as string[]) ?? [],
    classification: (p.classification as RepairClassification) ?? "hallucination",
    confidence: (p.confidence as RepairConfidence) ?? "low",
    promptAction: (p.promptAction as PromptAction) ?? "pending",
  }));
}

/**
 * Repair record from database query
 */
export interface RepairQueryResult {
  id: string;
  workspaceId: string | null;
  vocabularyItemId: string | null;
  errorType: string;
  errorMessage: string;
  errorSignature: string;
  originalDefinition: unknown;
  repairedDefinition: unknown;
  kpiType: string | null;
  kpiCategory: string | null;
  entityType: string | null;
  aggregationType: string | null;
  repairModel: string;
  repairSuccess: boolean;
  repairLatencyMs: number | null;
  repairTokensIn: number | null;
  repairTokensOut: number | null;
  classification: string | null;
  confidence: string | null;
  promptAction: string | null;
  patternId: string | null;
  frequencyCount: number | null;
  promptFixId: string | null;
  createdAt: Date;
}

/**
 * Get recent repairs for analysis
 */
export async function getRecentRepairs(
  days: number = 7,
  limit: number = 100
): Promise<RepairQueryResult[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const repairs = await db
    .select()
    .from(knosiaKpiRepairTraining)
    .where(gte(knosiaKpiRepairTraining.createdAt, cutoff))
    .orderBy(desc(knosiaKpiRepairTraining.createdAt))
    .limit(limit);

  return repairs;
}

// ============================================================================
// Fix Proposal Generator
// ============================================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generate a prompt fix proposal for a systemic pattern
 */
export async function generateFixProposal(
  errorSignature: string
): Promise<PromptFixProposal | null> {
  // Get pattern details
  const [pattern] = await db
    .select()
    .from(knosiaErrorPattern)
    .where(eq(knosiaErrorPattern.errorSignature, errorSignature));

  if (!pattern) return null;

  // Get example repairs for this pattern
  const examples = await db
    .select()
    .from(knosiaKpiRepairTraining)
    .where(
      and(
        eq(knosiaKpiRepairTraining.errorSignature, errorSignature),
        eq(knosiaKpiRepairTraining.repairSuccess, true)
      )
    )
    .limit(5);

  if (examples.length === 0) return null;

  // Build prompt for fix generation
  const prompt = `You are analyzing KPI generation errors to propose prompt improvements.

## Error Pattern
- Error Type: ${pattern.errorType}
- Error Template: ${pattern.errorMessageTemplate}
- Total Occurrences: ${pattern.totalOccurrences}
- Affected KPI Types: ${(pattern.distinctKpiTypes as string[])?.join(", ") || "unknown"}

## Example Repairs (before → after)
${examples
  .map(
    (e, i) => `
### Example ${i + 1}
Original:
\`\`\`json
${JSON.stringify(e.originalDefinition, null, 2)}
\`\`\`

Repaired:
\`\`\`json
${JSON.stringify(e.repairedDefinition, null, 2)}
\`\`\`
`
  )
  .join("\n")}

## Task
Analyze these repairs and propose a prompt improvement that would prevent this error pattern.

Respond with JSON:
{
  "patternDescription": "Human-readable description of the error pattern",
  "fixType": "add_rule" | "add_example" | "modify_rule" | "add_constraint",
  "proposedChange": "The exact text to add/modify in the prompt",
  "targetPromptSection": "Which section of the prompt to modify (e.g., 'KPI Type Rules', 'Common Mistakes')"
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1000,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (!content || content.type !== "text") return null;

    // Parse response - extract JSON from response
    let jsonText = content.text.trim();

    // Remove markdown code blocks
    if (jsonText.includes("```")) {
      const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match?.[1]) {
        jsonText = match[1].trim();
      }
    }

    // Extract just the JSON object using balanced brace matching
    // This handles both leading text and trailing commentary
    const startIdx = jsonText.indexOf("{");
    if (startIdx !== -1) {
      let depth = 0;
      let endIdx = startIdx;
      for (let i = startIdx; i < jsonText.length; i++) {
        if (jsonText[i] === "{") depth++;
        if (jsonText[i] === "}") depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
      jsonText = jsonText.substring(startIdx, endIdx + 1);
    }

    type FixProposal = {
      patternDescription: string;
      fixType: "add_rule" | "add_example" | "modify_rule" | "add_constraint";
      proposedChange: string;
      targetPromptSection?: string;
    };

    let fix: FixProposal;

    try {
      fix = JSON.parse(jsonText) as FixProposal;
    } catch (parseError) {
      console.error("[RepairTraining] JSON parse failed:", (parseError as Error).message);
      throw parseError;
    }

    return {
      errorSignature,
      errorType: pattern.errorType,
      patternDescription: fix.patternDescription,
      fixType: fix.fixType,
      proposedChange: fix.proposedChange,
      targetPromptSection: fix.targetPromptSection,
      triggerFrequency: pattern.totalOccurrences,
      triggerKpiTypes: (pattern.distinctKpiTypes as string[]) ?? [],
      confidence: (pattern.confidence as RepairConfidence) ?? "low",
    };
  } catch (error) {
    console.error("[RepairTraining] Failed to generate fix proposal:", error);
    return null;
  }
}

/**
 * Save a fix proposal to the database
 */
export async function saveFixProposal(
  proposal: PromptFixProposal
): Promise<string> {
  const id = generateId();

  await db.insert(knosiaPromptFix).values({
    id,
    errorSignature: proposal.errorSignature,
    errorType: proposal.errorType,
    patternDescription: proposal.patternDescription,
    fixType: proposal.fixType,
    proposedChange: proposal.proposedChange,
    targetPromptSection: proposal.targetPromptSection,
    triggerFrequency: proposal.triggerFrequency,
    triggerKpiTypes: proposal.triggerKpiTypes,
    confidence: proposal.confidence,
    status: "proposed",
  });

  // Link to pattern
  await db
    .update(knosiaErrorPattern)
    .set({
      activeFixId: id,
      updatedAt: new Date(),
    })
    .where(eq(knosiaErrorPattern.errorSignature, proposal.errorSignature));

  return id;
}

// ============================================================================
// A/B Testing
// ============================================================================

/**
 * A/B test configuration
 */
export interface ABTestConfig {
  fixId: string;
  sampleSize: number; // Number of KPIs to test
  timeoutMs: number; // Max time for test
}

/**
 * A/B test result
 */
export interface ABTestResult {
  controlRepairRate: number;
  treatmentRepairRate: number;
  controlSampleSize: number;
  treatmentSampleSize: number;
  improvement: number;
  significant: boolean;
}

/**
 * Start an A/B test for a prompt fix
 */
export async function startABTest(config: ABTestConfig): Promise<string> {
  const testId = generateId();

  await db
    .update(knosiaPromptFix)
    .set({
      abTestId: testId,
      abTestStartedAt: new Date(),
      status: "testing",
    })
    .where(eq(knosiaPromptFix.id, config.fixId));

  return testId;
}

/**
 * Record A/B test results
 */
export async function completeABTest(
  fixId: string,
  result: ABTestResult
): Promise<void> {
  await db
    .update(knosiaPromptFix)
    .set({
      abTestCompletedAt: new Date(),
      abTestResults: result,
      status: result.significant && result.improvement > 0 ? "approved" : "rejected",
    })
    .where(eq(knosiaPromptFix.id, fixId));
}

// ============================================================================
// Auto-Apply Logic
// ============================================================================

/**
 * Process patterns and auto-apply fixes based on confidence tier
 */
export async function processPatternQueue(): Promise<{
  proposed: number;
  testing: number;
  applied: number;
  rejected: number;
}> {
  const stats = { proposed: 0, testing: 0, applied: 0, rejected: 0 };

  // Get patterns needing action
  const patterns = await getPatternsNeedingAction();

  for (const pattern of patterns) {
    if (pattern.confidence === "high" && pattern.classification === "systemic") {
      // HIGH confidence: Auto-propose and mark for immediate review
      const proposal = await generateFixProposal(pattern.errorSignature);
      if (proposal) {
        await saveFixProposal(proposal);
        stats.proposed++;
        console.log(
          `[RepairTraining] HIGH confidence fix proposed for ${pattern.errorSignature}`
        );
      }
    } else if (
      pattern.confidence === "medium" &&
      pattern.classification === "systemic"
    ) {
      // MEDIUM confidence: Auto-propose and queue for A/B test
      const proposal = await generateFixProposal(pattern.errorSignature);
      if (proposal) {
        const fixId = await saveFixProposal(proposal);
        await startABTest({ fixId, sampleSize: 20, timeoutMs: 86400000 }); // 24 hours
        stats.testing++;
        console.log(
          `[RepairTraining] MEDIUM confidence fix queued for A/B test: ${pattern.errorSignature}`
        );
      }
    } else if (pattern.classification === "contextual") {
      // CONTEXTUAL: Generate example addition
      const proposal = await generateFixProposal(pattern.errorSignature);
      if (proposal) {
        await saveFixProposal(proposal);
        stats.proposed++;
        console.log(
          `[RepairTraining] Contextual fix proposed for ${pattern.errorSignature}`
        );
      }
    }
  }

  return stats;
}

/**
 * Get summary statistics for the training system
 */
export async function getTrainingStats(): Promise<{
  totalRepairs: number;
  repairsByClassification: Record<string, number>;
  pendingFixes: number;
  testingFixes: number;
  appliedFixes: number;
  topPatterns: PatternStats[];
}> {
  // Total repairs
  const totalRepairsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(knosiaKpiRepairTraining);
  const totalRepairs = totalRepairsResult[0]?.count ?? 0;

  // Repairs by classification
  const byClassification = await db
    .select({
      classification: knosiaKpiRepairTraining.classification,
      count: sql<number>`count(*)`,
    })
    .from(knosiaKpiRepairTraining)
    .groupBy(knosiaKpiRepairTraining.classification);

  const repairsByClassification: Record<string, number> = {};
  for (const row of byClassification) {
    repairsByClassification[row.classification ?? "unknown"] = row.count;
  }

  // Fix statuses
  const pendingResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(knosiaPromptFix)
    .where(eq(knosiaPromptFix.status, "proposed"));
  const pendingFixes = pendingResult[0]?.count ?? 0;

  const testingResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(knosiaPromptFix)
    .where(eq(knosiaPromptFix.status, "testing"));
  const testingFixes = testingResult[0]?.count ?? 0;

  const appliedResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(knosiaPromptFix)
    .where(eq(knosiaPromptFix.status, "applied"));
  const appliedFixes = appliedResult[0]?.count ?? 0;

  // Top patterns
  const topPatterns = await getTopPatterns(5);

  return {
    totalRepairs,
    repairsByClassification,
    pendingFixes,
    testingFixes,
    appliedFixes,
    topPatterns,
  };
}
