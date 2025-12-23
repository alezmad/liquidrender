#!/usr/bin/env npx tsx

/**
 * Survey Compilation Triangulation
 *
 * Triangulates between:
 * 1. GraphSurvey (TypeScript Schema) - The source of truth
 * 2. LiquidSurvey (DSL) - Compact human-readable format
 * 3. RuntimeSurvey (JSON) - Optimized for execution
 *
 * Uses Claude to:
 * - Generate LiquidSurvey DSL from GraphSurvey schema
 * - Validate semantic equivalence
 * - Build a compiler through triangulation
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs/promises";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const client = new Anthropic();

const GENERATION_MODEL = "claude-3-haiku-20240307";
const VALIDATION_MODEL = "claude-sonnet-4-20250514";

const OUTPUT_DIR = path.join(process.cwd(), "compiler/output");
const STATE_FILE = path.join(OUTPUT_DIR, "state.json");
const SPEC_FILE = path.join(process.cwd(), "compiler/LIQUIDSURVEY-SPEC.md");

// ─────────────────────────────────────────────────────────────────────────────
// LOAD SPEC
// ─────────────────────────────────────────────────────────────────────────────

async function loadSpec(): Promise<string> {
  try {
    return await fs.readFile(SPEC_FILE, "utf-8");
  } catch {
    throw new Error("LiquidSurvey spec not found. Run from survey-engine directory.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

const DSL_WRITER_PROMPT = (spec: string) => `You are an expert DSL writer. Convert GraphSurvey TypeScript schemas to LiquidSurvey DSL.

${spec}

RULES:
1. Follow the spec exactly
2. Preserve ALL semantic information
3. Use short codes for question types
4. Mark required questions with *
5. Use proper condition syntax for branching
6. Return ONLY the DSL code, no explanations

Convert the given GraphSurvey schema to LiquidSurvey DSL.`;

const SCHEMA_EXTRACTOR_PROMPT = `You extract GraphSurvey JSON from LiquidSurvey DSL.

GraphSurvey structure:
{
  "id": string,
  "title": string,
  "description": string,
  "startNodeId": string,
  "nodes": {
    [nodeId]: {
      "id": string,
      "type": "start" | "question" | "message" | "end",
      "content": { ... },
      "next": [{ "nodeId": string, "condition"?: { "operator": string, "value": any } }]
    }
  }
}

Return ONLY valid JSON. No markdown, no explanations.`;

const JUDGE_PROMPT = `You validate semantic equivalence between survey representations.

Compare the GraphSurvey schema and LiquidSurvey DSL for:
1. Structure: Same nodes, same connections
2. Content: Same questions, options, messages
3. Branching: Same conditions and targets
4. Metadata: Same IDs, types, required flags

Return ONLY valid JSON:
{
  "equivalent": boolean,
  "compressionRatio": number,
  "findings": [
    {
      "type": "loss" | "mismatch" | "improvement" | "spec_gap",
      "severity": "critical" | "major" | "minor",
      "location": "node_id or general",
      "description": "...",
      "suggestedFix": "..."
    }
  ],
  "metrics": {
    "schemaChars": number,
    "dslChars": number,
    "schemaNodes": number,
    "dslNodes": number
  }
}`;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Sample {
  id: string;
  name: string;
  complexity: string;
  hasBranching: boolean;
  schema: string;
  dsl: string;
  reconstructed: Record<string, unknown> | null;
  equivalent: boolean;
  compressionRatio: number;
  findings: Finding[];
  error?: string;
}

interface Finding {
  type: string;
  severity?: string;
  location?: string;
  description: string;
  suggestedFix?: string;
}

interface IterationState {
  iteration: number;
  totalSamples: number;
  equivalentSamples: number;
  avgCompressionRatio: number;
  totalFindings: number;
  specVersion: number;
  lastRun: string;
}

interface IterationResult {
  iteration: number;
  samples: Sample[];
  equivalenceRate: number;
  avgCompressionRatio: number;
  findings: Finding[];
  needsReview: boolean;
  reviewReasons: string[];
  metrics: {
    generationTime: number;
    validationTime: number;
    totalTime: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function extractJson(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  let start = text.indexOf('{');
  if (start === -1) start = text.indexOf('[');
  if (start === -1) return text;

  const openChar = text[start];
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;
  let end = start;

  for (let i = start; i < text.length; i++) {
    if (text[i] === openChar) depth++;
    if (text[i] === closeChar) depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }

  return text.slice(start, end);
}

function tryParseJson(text: string): Record<string, unknown> | null {
  const jsonStr = extractJson(text);
  try {
    return JSON.parse(jsonStr);
  } catch {
    const fixed = jsonStr
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/\\n/g, ' ')
      .replace(/[\x00-\x1F\x7F]/g, ' ');

    try {
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
}

async function loadState(): Promise<IterationState> {
  try {
    const content = await fs.readFile(STATE_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return {
      iteration: 0,
      totalSamples: 0,
      equivalentSamples: 0,
      avgCompressionRatio: 0,
      totalFindings: 0,
      specVersion: 1,
      lastRun: new Date().toISOString(),
    };
  }
}

async function saveState(state: IterationState): Promise<void> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

async function saveIterationResult(result: IterationResult): Promise<void> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const filename = `iteration-${result.iteration.toString().padStart(4, "0")}.json`;
  await fs.writeFile(path.join(OUTPUT_DIR, filename), JSON.stringify(result, null, 2));
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE STEPS
// ─────────────────────────────────────────────────────────────────────────────

async function generateDSL(schema: string, spec: string): Promise<string> {
  const response = await client.messages.create({
    model: GENERATION_MODEL,
    max_tokens: 2000,
    system: DSL_WRITER_PROMPT(spec),
    messages: [{ role: "user", content: `Convert this GraphSurvey to LiquidSurvey DSL:\n\n${schema}` }],
  });

  return (response.content[0] as { text: string }).text.trim();
}

async function reconstructSchema(dsl: string): Promise<Record<string, unknown> | null> {
  const response = await client.messages.create({
    model: GENERATION_MODEL,
    max_tokens: 4000,
    system: SCHEMA_EXTRACTOR_PROMPT,
    messages: [{ role: "user", content: `Extract GraphSurvey JSON from this LiquidSurvey DSL:\n\n${dsl}` }],
  });

  const text = (response.content[0] as { text: string }).text;
  return tryParseJson(text);
}

async function validateEquivalence(
  schema: string,
  dsl: string
): Promise<{ equivalent: boolean; compressionRatio: number; findings: Finding[] }> {
  const response = await client.messages.create({
    model: VALIDATION_MODEL,
    max_tokens: 2000,
    system: JUDGE_PROMPT,
    messages: [{
      role: "user",
      content: `Compare these representations for semantic equivalence:

ORIGINAL SCHEMA:
${schema}

LIQUIDSURVEY DSL:
${dsl}

Are they semantically equivalent? What is lost or gained in the DSL format?`
    }],
  });

  const text = (response.content[0] as { text: string }).text;
  const result = tryParseJson(text);

  if (!result) {
    return {
      equivalent: false,
      compressionRatio: 0,
      findings: [{ type: "error", severity: "critical", description: "Failed to parse validation result", suggestedFix: "Retry validation" }]
    };
  }

  return {
    equivalent: result.equivalent as boolean,
    compressionRatio: (result.compressionRatio as number) || (schema.length / dsl.length),
    findings: (result.findings as Finding[]) || []
  };
}

async function processSample(
  name: string,
  complexity: string,
  hasBranching: boolean,
  schemaObj: Record<string, unknown>,
  spec: string,
  id: string
): Promise<Sample> {
  const schema = JSON.stringify(schemaObj, null, 2);

  try {
    // Step 1: Generate DSL from schema
    const dsl = await generateDSL(schema, spec);

    // Step 2: Reconstruct schema from DSL (roundtrip test)
    const reconstructed = await reconstructSchema(dsl);

    // Step 3: Validate equivalence
    const validation = await validateEquivalence(schema, dsl);

    return {
      id,
      name,
      complexity,
      hasBranching,
      schema,
      dsl,
      reconstructed,
      equivalent: validation.equivalent,
      compressionRatio: validation.compressionRatio,
      findings: validation.findings,
    };
  } catch (error) {
    return {
      id,
      name,
      complexity,
      hasBranching,
      schema,
      dsl: "",
      reconstructed: null,
      equivalent: false,
      compressionRatio: 0,
      findings: [],
      error: (error as Error).message,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function runIteration(samplesPerIteration: number = 3): Promise<IterationResult> {
  const startTime = Date.now();
  const state = await loadState();
  const iteration = state.iteration + 1;

  console.error(`\n[TCS] Survey Compilation - Starting iteration ${iteration}...`);

  // Load spec
  const spec = await loadSpec();

  // Load all samples
  const { allSamples } = await import("../samples/index.js");

  // Select samples for this iteration
  const selectedSamples = [];
  for (let i = 0; i < samplesPerIteration; i++) {
    const idx = (state.totalSamples + i) % allSamples.length;
    selectedSamples.push(allSamples[idx]);
  }

  // Process samples
  const generationStart = Date.now();
  console.error(`[TCS] Processing ${selectedSamples.length} samples...`);

  const samplePromises = selectedSamples.map((s, i) =>
    processSample(
      s.name,
      s.complexity,
      s.branching,
      s.survey as Record<string, unknown>,
      spec,
      `iter${iteration}-${i}`
    )
  );
  const samples = await Promise.all(samplePromises);

  const generationTime = Date.now() - generationStart;

  // Collect metrics
  const validationStart = Date.now();
  const successfulSamples = samples.filter(s => !s.error);
  const equivalentSamples = samples.filter(s => s.equivalent);
  const allFindings = samples.flatMap(s => s.findings);
  const avgCompression = successfulSamples.reduce((acc, s) => acc + s.compressionRatio, 0) / Math.max(successfulSamples.length, 1);
  const validationTime = Date.now() - validationStart;

  // Determine if review is needed
  const reviewReasons: string[] = [];
  const equivalenceRate = equivalentSamples.length / Math.max(successfulSamples.length, 1);

  if (equivalenceRate < 0.5) {
    reviewReasons.push(`Low equivalence rate: ${(equivalenceRate * 100).toFixed(0)}%`);
  }
  if (allFindings.filter(f => f.severity === "critical").length > 0) {
    reviewReasons.push(`Critical findings: ${allFindings.filter(f => f.severity === "critical").length}`);
  }
  if (allFindings.filter(f => f.type === "spec_gap").length > 0) {
    reviewReasons.push(`Spec gaps found: ${allFindings.filter(f => f.type === "spec_gap").length}`);
  }
  if (avgCompression < 2) {
    reviewReasons.push(`Low compression ratio: ${avgCompression.toFixed(2)}x`);
  }

  const result: IterationResult = {
    iteration,
    samples,
    equivalenceRate,
    avgCompressionRatio: avgCompression,
    findings: allFindings,
    needsReview: reviewReasons.length > 0,
    reviewReasons,
    metrics: {
      generationTime,
      validationTime,
      totalTime: Date.now() - startTime,
    },
  };

  // Update state
  const newState: IterationState = {
    iteration,
    totalSamples: state.totalSamples + samples.length,
    equivalentSamples: state.equivalentSamples + equivalentSamples.length,
    avgCompressionRatio: (state.avgCompressionRatio * state.totalSamples + avgCompression * samples.length) / (state.totalSamples + samples.length),
    totalFindings: state.totalFindings + allFindings.length,
    specVersion: state.specVersion,
    lastRun: new Date().toISOString(),
  };

  await saveState(newState);
  await saveIterationResult(result);

  // Output result as JSON to stdout
  console.log(JSON.stringify(result, null, 2));

  return result;
}

// Parse command line args
const args = process.argv.slice(2);
const samplesArg = args.find(a => a.startsWith("--samples="));
const samples = samplesArg ? parseInt(samplesArg.split("=")[1]) : 3;

runIteration(samples).catch(console.error);
