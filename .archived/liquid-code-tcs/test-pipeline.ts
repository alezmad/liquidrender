#!/usr/bin/env npx tsx

/**
 * Test Pipeline - First Iteration
 *
 * This script tests the core pipeline logic without requiring
 * the full Mastra infrastructure. It simulates the triangulated
 * synthesis process using direct Claude API calls.
 */

import Anthropic from "@anthropic-ai/sdk";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const client = new Anthropic();

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

// ─────────────────────────────────────────────────────────────────────────────
// AGENT PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

const JSX_PROMPT = `You are an expert React developer. Generate clean, semantic JSX for dashboard UIs.
Return ONLY valid JSX code. No explanations.`;

const SCHEMA_PROMPT = `You extract LiquidSchema JSON from React JSX.
LiquidSchema: { version: "3.0", signals: [...], layers: [{ id, visible, root: Block }] }
Block: { uid, type, binding?, label?, layout?, signals?, condition?, trigger?, children?, template? }
Return ONLY valid JSON. No explanations.`;

const LIQUIDCODE_PROMPT = `You write LiquidCode v3 DSL from LiquidSchema.
${SPEC_EXCERPT}
Return ONLY LiquidCode. No explanations.`;

const JUDGE_PROMPT = `You validate semantic equivalence between UI representations.
Return JSON: { "consistent": boolean, "findings": [{ "type": "inconsistency"|"gap", "description": "...", "suggestedFix": "..." }] }`;

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function log(phase: string, message: string) {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`[${timestamp}] [${phase.padEnd(12)}] ${message}`);
}

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
    // Try to fix common issues
    const fixed = jsonStr
      .replace(/,\s*}/g, '}')  // Remove trailing commas before }
      .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
      .replace(/'/g, '"')       // Replace single quotes with double
      .replace(/(\w+):/g, '"$1":') // Quote unquoted keys
      .replace(/""+/g, '"');    // Fix double quotes

    try {
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE STEPS
// ─────────────────────────────────────────────────────────────────────────────

async function generateJSX(prompt: string): Promise<string> {
  log("JSX", `Generating for: "${prompt.slice(0, 50)}..."`);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: JSX_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const jsx = (response.content[0] as { text: string }).text;
  log("JSX", `Generated ${jsx.length} chars`);
  return jsx;
}

async function extractSchema(jsx: string): Promise<Record<string, unknown>> {
  log("SCHEMA", "Extracting from JSX...");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: SCHEMA_PROMPT,
    messages: [{ role: "user", content: `Extract LiquidSchema from:\n\n${jsx}` }],
  });

  const text = (response.content[0] as { text: string }).text;
  const schema = tryParseJson(text);

  if (!schema) {
    throw new Error("Failed to parse schema JSON");
  }

  log("SCHEMA", `Extracted ${Object.keys(schema).length} top-level keys`);
  return schema;
}

async function writeLiquidCode(schema: Record<string, unknown>): Promise<string> {
  log("LIQUIDCODE", "Writing from schema...");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: LIQUIDCODE_PROMPT,
    messages: [{ role: "user", content: `Convert to LiquidCode:\n\n${JSON.stringify(schema, null, 2)}` }],
  });

  const liquidcode = (response.content[0] as { text: string }).text.trim();
  log("LIQUIDCODE", `Generated ${liquidcode.length} chars`);
  return liquidcode;
}

async function crossValidate(
  jsx: string,
  schema: Record<string, unknown>,
  liquidcode: string
): Promise<{ consistent: boolean; findings: Array<{ type: string; description: string; suggestedFix: string }> }> {
  log("VALIDATE", "Cross-validating representations...");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: JUDGE_PROMPT,
    messages: [{
      role: "user",
      content: `Compare these representations:

JSX:
${jsx.slice(0, 1500)}

Schema:
${JSON.stringify(schema, null, 2).slice(0, 1500)}

LiquidCode:
${liquidcode}

Are they semantically equivalent?`
    }],
  });

  const text = (response.content[0] as { text: string }).text;
  const result = tryParseJson(text);

  if (!result) {
    return { consistent: false, findings: [{ type: "error", description: "Failed to parse validation result", suggestedFix: "Retry" }] };
  }

  log("VALIDATE", `Consistent: ${result.consistent}, Findings: ${(result.findings as Array<unknown>)?.length || 0}`);
  return result as { consistent: boolean; findings: Array<{ type: string; description: string; suggestedFix: string }> };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

async function runPipeline() {
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║     TRIANGULATED COMPILER SYNTHESIS - First Iteration Test     ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  const prompts = [
    "Create a simple analytics dashboard with 4 KPIs showing revenue, orders, customers, and growth rate",
    "Build a user management admin panel with a table of users and edit/delete modals",
    "Design a real-time alerts dashboard with status indicators and action buttons",
  ];

  const samples: Array<{
    prompt: string;
    jsx: string;
    schema: Record<string, unknown>;
    liquidcode: string;
    consistent: boolean;
    findings: Array<{ type: string; description: string; suggestedFix: string }>;
  }> = [];

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 1: Generate samples in PARALLEL
  // ─────────────────────────────────────────────────────────────────────────

  console.log("┌─────────────────────────────────────────────────────────────────┐");
  console.log("│ PHASE 1: Generating Samples (Parallel)                          │");
  console.log("└─────────────────────────────────────────────────────────────────┘\n");

  const samplePromises = prompts.map(async (prompt, i) => {
    log(`SAMPLE-${i}`, "Starting generation...");

    try {
      const jsx = await generateJSX(prompt);
      const schema = await extractSchema(jsx);
      const liquidcode = await writeLiquidCode(schema);

      log(`SAMPLE-${i}`, "✓ Complete");
      return { prompt, jsx, schema, liquidcode };
    } catch (e) {
      log(`SAMPLE-${i}`, `✗ Failed: ${(e as Error).message}`);
      return null;
    }
  });

  const generatedSamples = (await Promise.all(samplePromises)).filter(Boolean) as Array<{
    prompt: string;
    jsx: string;
    schema: Record<string, unknown>;
    liquidcode: string;
  }>;

  console.log(`\n✓ Generated ${generatedSamples.length}/${prompts.length} samples\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 2: Cross-validate samples in PARALLEL
  // ─────────────────────────────────────────────────────────────────────────

  console.log("┌─────────────────────────────────────────────────────────────────┐");
  console.log("│ PHASE 2: Cross-Validating Samples (Parallel)                    │");
  console.log("└─────────────────────────────────────────────────────────────────┘\n");

  const validationPromises = generatedSamples.map(async (sample, i) => {
    log(`VALIDATE-${i}`, "Starting validation...");

    try {
      const result = await crossValidate(sample.jsx, sample.schema, sample.liquidcode);
      log(`VALIDATE-${i}`, result.consistent ? "✓ Consistent" : `✗ Inconsistent (${result.findings.length} findings)`);
      return { ...sample, ...result };
    } catch (e) {
      log(`VALIDATE-${i}`, `✗ Failed: ${(e as Error).message}`);
      return { ...sample, consistent: false, findings: [{ type: "error", description: (e as Error).message, suggestedFix: "Review" }] };
    }
  });

  const validatedSamples = await Promise.all(validationPromises);
  samples.push(...validatedSamples);

  const consistentCount = samples.filter(s => s.consistent).length;
  console.log(`\n✓ Validated: ${consistentCount}/${samples.length} consistent\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // RESULTS
  // ─────────────────────────────────────────────────────────────────────────

  console.log("┌─────────────────────────────────────────────────────────────────┐");
  console.log("│ RESULTS                                                         │");
  console.log("└─────────────────────────────────────────────────────────────────┘\n");

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    console.log(`Sample ${i + 1}: ${s.consistent ? "✅ CONSISTENT" : "❌ INCONSISTENT"}`);
    console.log(`  Prompt: ${s.prompt.slice(0, 60)}...`);
    console.log(`  JSX: ${s.jsx.length} chars`);
    console.log(`  Schema: ${JSON.stringify(s.schema).length} chars`);
    console.log(`  LiquidCode: ${s.liquidcode.length} chars`);

    if (s.liquidcode.length < 200) {
      console.log(`  Code: ${s.liquidcode.replace(/\n/g, " ").slice(0, 100)}...`);
    }

    if (s.findings.length > 0) {
      console.log(`  Findings:`);
      for (const f of s.findings.slice(0, 3)) {
        console.log(`    - [${f.type}] ${f.description.slice(0, 60)}...`);
      }
    }
    console.log();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────────────

  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║                         SUMMARY                                ║");
  console.log("╠════════════════════════════════════════════════════════════════╣");
  console.log(`║  Samples Generated:     ${samples.length.toString().padStart(3)}                                   ║`);
  console.log(`║  Consistent:            ${consistentCount.toString().padStart(3)}                                   ║`);
  console.log(`║  Inconsistent:          ${(samples.length - consistentCount).toString().padStart(3)}                                   ║`);
  console.log(`║  Total Findings:        ${samples.reduce((a, s) => a + s.findings.length, 0).toString().padStart(3)}                                   ║`);
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  // Show all findings for spec evolution
  const allFindings = samples.flatMap(s => s.findings);
  if (allFindings.length > 0) {
    console.log("📋 All Findings (for spec evolution):\n");
    for (const f of allFindings) {
      console.log(`  [${f.type}] ${f.description}`);
      console.log(`    → Fix: ${f.suggestedFix}\n`);
    }
  }

  // Show a sample LiquidCode output
  if (samples.length > 0 && samples[0].consistent) {
    console.log("📝 Sample LiquidCode Output:\n");
    console.log("```liquid");
    console.log(samples[0].liquidcode);
    console.log("```\n");
  }

  return samples;
}

// ─────────────────────────────────────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────────────────────────────────────

runPipeline()
  .then(() => {
    console.log("✅ Pipeline test complete\n");
  })
  .catch((e) => {
    console.error("❌ Pipeline failed:", e);
    process.exit(1);
  });
