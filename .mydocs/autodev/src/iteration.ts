#!/usr/bin/env npx tsx

/**
 * Single Iteration Runner
 *
 * Runs one iteration of the TCS pipeline and outputs structured JSON.
 * Designed to be called by Claude CLI, which can then analyze results
 * and decide whether to continue, fix issues, or evolve the spec.
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs/promises";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const client = new Anthropic();

// Use Haiku for generation (cheap), Sonnet for validation (needs reasoning)
const GENERATION_MODEL = "claude-3-haiku-20240307";
const VALIDATION_MODEL = "claude-sonnet-4-20250514";

const OUTPUT_DIR = path.join(process.cwd(), "output");
const STATE_FILE = path.join(OUTPUT_DIR, "state.json");

// ─────────────────────────────────────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

const SPEC_EXCERPT = `
# Liquid v3.0 Specification

## Types
- Indexed: 0-9 (container, kpi, bar, line, pie, table, form, list, card, modal)
- Coded: Tx, Bt, Kp, Sl, Fm, Gd, Cd, Md, Tb, Ls

## Bindings
- :field (named), 0-9 (indexed), =expr (computed), "text" (literal)

## Signals
- @name (declare), <name (receive), >name (emit), <>name (both)

## Layout
- !h/!p/!s (priority), *1-9 (span), ^f/^s/^g (flex)

## Layers
- /N [...] (hidden layer N), >/N (open), /< (close)

## Example
@dr @view
0!h[Tx"HEADER"]
0[Bt"Tab1"<>view, Bt"Tab2"<>view]
0?@view=0[1 0, 1 1, G2[7:items[8:.>/1]]]
/1 9[1:.detail, Bt"Close"/<]
`;

const JSX_PROMPT = `You are an expert React developer. Generate clean, semantic JSX for dashboard UIs.
Keep components simple and focused. Use Tailwind CSS for styling.
Return ONLY valid JSX code wrapped in a single root element. No explanations.`;

const SCHEMA_PROMPT = `You extract LiquidSchema JSON from React JSX.
LiquidSchema structure:
{
  "version": "3.0",
  "signals": ["signalName", ...],
  "layers": [{
    "id": number,
    "visible": boolean,
    "root": Block
  }]
}

Block structure:
{
  "uid": string,
  "type": "container"|"kpi"|"bar"|"line"|"pie"|"table"|"form"|"list"|"card"|"modal"|"text"|"button"|"select"|"grid",
  "binding": { "type": "named"|"indexed"|"computed"|"literal", "value": string|number },
  "label": string,
  "layout": { "priority": "high"|"primary"|"secondary", "span": number, "flex": "fill"|"shrink"|"grow" },
  "signals": { "declare": [], "receive": [], "emit": [], "bidirectional": [] },
  "condition": { "signal": string, "equals": any },
  "trigger": { "action": "open"|"close", "layer": number },
  "children": Block[],
  "template": Block
}

Return ONLY valid JSON. No markdown, no explanations.`;

const LIQUIDCODE_PROMPT = `You write LiquidCode v3 DSL from LiquidSchema JSON.
${SPEC_EXCERPT}
Return ONLY the LiquidCode. No markdown code blocks, no explanations.`;

const JUDGE_PROMPT = `You validate semantic equivalence between UI representations.
Compare the JSX, Schema, and LiquidCode for semantic consistency.
Focus on: component structure, data bindings, signals, layout, and interactions.
Return ONLY valid JSON with this structure:
{
  "consistent": boolean,
  "findings": [
    {
      "type": "inconsistency" | "gap" | "error",
      "severity": "critical" | "major" | "minor",
      "description": "...",
      "suggestedFix": "..."
    }
  ]
}`;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Sample {
  id: string;
  prompt: string;
  jsx: string;
  schema: Record<string, unknown>;
  liquidcode: string;
  consistent: boolean;
  findings: Finding[];
  error?: string;
}

interface Finding {
  type: string;
  severity?: string;
  description: string;
  suggestedFix: string;
}

interface IterationState {
  iteration: number;
  totalSamples: number;
  successfulSamples: number;
  consistentSamples: number;
  totalFindings: number;
  specVersion: number;
  lastRun: string;
}

interface IterationResult {
  iteration: number;
  samples: Sample[];
  successRate: number;
  consistencyRate: number;
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
  // Try to extract from code block first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find JSON object/array with balanced braces
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
      successfulSamples: 0,
      consistentSamples: 0,
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

async function appendFindings(findings: Finding[]): Promise<void> {
  const findingsFile = path.join(OUTPUT_DIR, "all-findings.json");
  let allFindings: Finding[] = [];

  try {
    const content = await fs.readFile(findingsFile, "utf-8");
    allFindings = JSON.parse(content);
  } catch {
    // File doesn't exist yet
  }

  allFindings.push(...findings);
  await fs.writeFile(findingsFile, JSON.stringify(allFindings, null, 2));
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE STEPS
// ─────────────────────────────────────────────────────────────────────────────

async function generateJSX(prompt: string): Promise<string> {
  const response = await client.messages.create({
    model: GENERATION_MODEL,
    max_tokens: 2000,
    system: JSX_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  return (response.content[0] as { text: string }).text;
}

async function extractSchema(jsx: string): Promise<Record<string, unknown>> {
  const response = await client.messages.create({
    model: GENERATION_MODEL,
    max_tokens: 3000,
    system: SCHEMA_PROMPT,
    messages: [{ role: "user", content: `Extract LiquidSchema from this JSX:\n\n${jsx}` }],
  });

  const text = (response.content[0] as { text: string }).text;
  const schema = tryParseJson(text);

  if (!schema) {
    throw new Error("Failed to parse schema JSON");
  }

  return schema;
}

async function writeLiquidCode(schema: Record<string, unknown>): Promise<string> {
  const response = await client.messages.create({
    model: GENERATION_MODEL,
    max_tokens: 1000,
    system: LIQUIDCODE_PROMPT,
    messages: [{ role: "user", content: `Convert to LiquidCode:\n\n${JSON.stringify(schema, null, 2)}` }],
  });

  return (response.content[0] as { text: string }).text.trim();
}

async function crossValidate(
  jsx: string,
  schema: Record<string, unknown>,
  liquidcode: string
): Promise<{ consistent: boolean; findings: Finding[] }> {
  const response = await client.messages.create({
    model: VALIDATION_MODEL,
    max_tokens: 2000,
    system: JUDGE_PROMPT,
    messages: [{
      role: "user",
      content: `Compare these representations for semantic equivalence:

JSX:
${jsx}

Schema:
${JSON.stringify(schema, null, 2)}

LiquidCode:
${liquidcode}

Are they semantically equivalent? Return JSON with consistent (boolean) and findings (array).`
    }],
  });

  const text = (response.content[0] as { text: string }).text;
  const result = tryParseJson(text);

  if (!result) {
    return {
      consistent: false,
      findings: [{ type: "error", severity: "critical", description: "Failed to parse validation result", suggestedFix: "Retry validation" }]
    };
  }

  return {
    consistent: result.consistent as boolean,
    findings: (result.findings as Finding[]) || []
  };
}

async function generateSample(prompt: string, id: string): Promise<Sample> {
  try {
    const jsx = await generateJSX(prompt);
    const schema = await extractSchema(jsx);
    const liquidcode = await writeLiquidCode(schema);
    const validation = await crossValidate(jsx, schema, liquidcode);

    return {
      id,
      prompt,
      jsx,
      schema,
      liquidcode,
      consistent: validation.consistent,
      findings: validation.findings,
    };
  } catch (error) {
    return {
      id,
      prompt,
      jsx: "",
      schema: {},
      liquidcode: "",
      consistent: false,
      findings: [],
      error: (error as Error).message,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPTS FOR DASHBOARD GENERATION
// ─────────────────────────────────────────────────────────────────────────────

const DASHBOARD_PROMPTS = [
  "Create a simple KPI card showing total revenue with a trend indicator",
  "Build a bar chart component showing monthly sales data",
  "Design a data table with sortable columns for user list",
  "Create a form with text inputs and a submit button",
  "Build a card grid layout with 4 metric cards",
  "Design a tabbed interface with 3 tabs and content panels",
  "Create a modal dialog with a form inside",
  "Build a list component with selectable items",
  "Design a dashboard header with title and action buttons",
  "Create a pie chart showing category distribution",
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function runIteration(samplesPerIteration: number = 3): Promise<IterationResult> {
  const startTime = Date.now();
  const state = await loadState();
  const iteration = state.iteration + 1;

  console.error(`\n[TCS] Starting iteration ${iteration}...`);

  // Select random prompts
  const prompts = [];
  for (let i = 0; i < samplesPerIteration; i++) {
    const prompt = DASHBOARD_PROMPTS[Math.floor(Math.random() * DASHBOARD_PROMPTS.length)];
    prompts.push(prompt);
  }

  // Generate samples in parallel
  const generationStart = Date.now();
  console.error(`[TCS] Generating ${samplesPerIteration} samples in parallel...`);

  const samplePromises = prompts.map((prompt, i) =>
    generateSample(prompt, `iter${iteration}-sample${i}`)
  );
  const samples = await Promise.all(samplePromises);

  const generationTime = Date.now() - generationStart;

  // Collect metrics
  const validationStart = Date.now();
  const successfulSamples = samples.filter(s => !s.error);
  const consistentSamples = samples.filter(s => s.consistent);
  const allFindings = samples.flatMap(s => s.findings);
  const validationTime = Date.now() - validationStart;

  // Determine if review is needed
  const reviewReasons: string[] = [];
  const successRate = successfulSamples.length / samples.length;
  const consistencyRate = consistentSamples.length / Math.max(successfulSamples.length, 1);

  if (successRate < 0.5) {
    reviewReasons.push(`Low success rate: ${(successRate * 100).toFixed(0)}%`);
  }
  if (consistencyRate < 0.3) {
    reviewReasons.push(`Low consistency rate: ${(consistencyRate * 100).toFixed(0)}%`);
  }
  if (allFindings.filter(f => f.severity === "critical").length > 0) {
    reviewReasons.push(`Critical findings: ${allFindings.filter(f => f.severity === "critical").length}`);
  }
  if (iteration % 10 === 0) {
    reviewReasons.push("Scheduled review checkpoint");
  }

  const result: IterationResult = {
    iteration,
    samples,
    successRate,
    consistencyRate,
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
    successfulSamples: state.successfulSamples + successfulSamples.length,
    consistentSamples: state.consistentSamples + consistentSamples.length,
    totalFindings: state.totalFindings + allFindings.length,
    specVersion: state.specVersion,
    lastRun: new Date().toISOString(),
  };

  await saveState(newState);
  await saveIterationResult(result);
  await appendFindings(allFindings);

  // Output result as JSON to stdout (for Claude CLI to read)
  console.log(JSON.stringify(result, null, 2));

  return result;
}

// Parse command line args
const args = process.argv.slice(2);
const samplesArg = args.find(a => a.startsWith("--samples="));
const samples = samplesArg ? parseInt(samplesArg.split("=")[1]) : 3;

runIteration(samples).catch(console.error);
