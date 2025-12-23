import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import {
  SynthesisInputSchema,
  SynthesisOutputSchema,
  SynthesisStateSchema,
  SampleSchema,
  FindingSchema,
  TestCaseSchema,
  ModuleSchema,
  SpecSchema,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SYNTHESIS WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The main Triangulated Compiler Synthesis workflow.
 *
 * This orchestrates the entire autonomous compiler development process:
 * 1. Generate samples (JSX → Schema → LiquidCode) in PARALLEL
 * 2. Cross-validate samples to find inconsistencies
 * 3. Evolve specification based on findings
 * 4. Build compiler modules in PARALLEL
 * 5. Test compiler against validated samples
 * 6. Diagnose failures and fix modules
 * 7. Repeat until convergence
 */
export const synthesisWorkflow = createWorkflow({
  id: "triangulated-compiler-synthesis",
  inputSchema: SynthesisInputSchema,
  outputSchema: SynthesisOutputSchema,
})
  .then(
    createStep({
      id: "synthesis-loop",
      inputSchema: SynthesisInputSchema,
      outputSchema: SynthesisOutputSchema,
      execute: async ({ inputData, mastra, suspend }) => {
        // Initialize state
        let state: z.infer<typeof SynthesisStateSchema> = {
          iteration: 0,
          phase: "generating-samples",
          spec: parseInitialSpec(inputData.initialSpec),
          compiler: {},
          testSuite: [],
          samples: [],
          findings: [],
          testResults: [],
          metrics: {
            totalSamples: 0,
            validatedSamples: 0,
            testsPassed: 0,
            testsFailed: 0,
            specVersion: 1,
            compilerIterations: 0,
          },
          startedAt: new Date().toISOString(),
        };

        const log = (msg: string) => console.log(`[Iter ${state.iteration}] ${msg}`);

        // ─────────────────────────────────────────────────────────────────────
        // MAIN SYNTHESIS LOOP
        // ─────────────────────────────────────────────────────────────────────

        while (state.iteration < inputData.maxIterations) {
          state.iteration++;
          log(`Starting iteration ${state.iteration}`);

          // ───────────────────────────────────────────────────────────────────
          // PHASE 1: GENERATE SAMPLES (PARALLEL)
          // ───────────────────────────────────────────────────────────────────

          if (state.testSuite.length < inputData.targetTestCount) {
            state.phase = "generating-samples";
            log(`Generating ${inputData.parallelSamples} samples in parallel...`);

            const promptAgent = mastra?.getAgent("prompt-generator");
            const jsxAgent = mastra?.getAgent("jsx-generator");
            const schemaAgent = mastra?.getAgent("schema-extractor");
            const liquidAgent = mastra?.getAgent("liquidcode-writer");

            if (!promptAgent || !jsxAgent || !schemaAgent || !liquidAgent) {
              throw new Error("Required agents not found");
            }

            // Generate prompts
            const promptResult = await promptAgent.generate(
              `Generate ${inputData.parallelSamples} diverse dashboard UI prompts. Return JSON array.`
            );
            const prompts: string[] = JSON.parse(promptResult.text);

            // Generate samples in PARALLEL
            const samplePromises = prompts.map(async (prompt) => {
              try {
                const jsx = (await jsxAgent.generate(prompt)).text;
                const schema = JSON.parse(
                  (await schemaAgent.generate(`Extract LiquidSchema:\n${jsx}`)).text
                );
                const liquidcode = (
                  await liquidAgent.generate(`Convert to LiquidCode:\n${JSON.stringify(schema)}`)
                ).text;

                return {
                  id: crypto.randomUUID(),
                  prompt,
                  jsx,
                  schema,
                  liquidcode,
                  createdAt: new Date().toISOString(),
                  validated: false,
                };
              } catch (e) {
                log(`Sample generation failed: ${(e as Error).message}`);
                return null;
              }
            });

            const newSamples = (await Promise.all(samplePromises)).filter(Boolean) as z.infer<typeof SampleSchema>[];
            state.samples.push(...newSamples);
            state.metrics.totalSamples += newSamples.length;
            log(`Generated ${newSamples.length} samples`);

            // ─────────────────────────────────────────────────────────────────
            // PHASE 2: VALIDATE SAMPLES (PARALLEL)
            // ─────────────────────────────────────────────────────────────────

            state.phase = "validating-samples";
            log(`Validating ${newSamples.length} samples in parallel...`);

            const judgeAgent = mastra?.getAgent("judge");
            if (!judgeAgent) throw new Error("judge agent not found");

            const validationPromises = newSamples.map(async (sample) => {
              try {
                // Reverse transformations in parallel
                const [schemaFromLiquid, jsxFromSchema] = await Promise.all([
                  schemaAgent.generate(`Parse LiquidCode to Schema:\n${sample.liquidcode}`),
                  jsxAgent.generate(`Generate JSX for Schema:\n${JSON.stringify(sample.schema)}`),
                ]);

                // Judge consistency
                const judgment = await judgeAgent.generate(`
Compare representations for ${sample.id}:
Original JSX (truncated): ${sample.jsx.slice(0, 500)}
Original Schema: ${JSON.stringify(sample.schema).slice(0, 500)}
Original LiquidCode: ${sample.liquidcode}
Reconstructed Schema: ${schemaFromLiquid.text.slice(0, 500)}
Return JSON: { "consistent": boolean, "findings": [...] }
                `);

                const result = JSON.parse(judgment.text);
                return {
                  sample: { ...sample, validated: result.consistent },
                  consistent: result.consistent,
                  findings: (result.findings || []).map((f: any) => ({
                    ...f,
                    id: crypto.randomUUID(),
                    sampleId: sample.id,
                  })),
                };
              } catch (e) {
                return {
                  sample: { ...sample, validated: false },
                  consistent: false,
                  findings: [{
                    id: crypto.randomUUID(),
                    sampleId: sample.id,
                    type: "error",
                    severity: "high",
                    description: (e as Error).message,
                    sourceRepresentation: "liquidcode",
                    targetRepresentation: "schema",
                    suggestedFix: "Review sample",
                  }],
                };
              }
            });

            const validationResults = await Promise.all(validationPromises);

            let consistentCount = 0;
            for (const result of validationResults) {
              // Update sample
              const idx = state.samples.findIndex(s => s.id === result.sample.id);
              if (idx >= 0) state.samples[idx] = result.sample;

              // Collect findings
              state.findings.push(...result.findings);

              // Add to test suite if consistent
              if (result.consistent) {
                consistentCount++;
                state.testSuite.push({
                  id: crypto.randomUUID(),
                  sampleId: result.sample.id,
                  liquidcode: result.sample.liquidcode,
                  expectedSchema: result.sample.schema,
                  category: categorizeComplexity(result.sample.liquidcode),
                  complexity: estimateComplexity(result.sample.liquidcode),
                });
              }
            }

            state.metrics.validatedSamples += consistentCount;
            log(`Validated ${consistentCount}/${newSamples.length} samples`);
          }

          // ─────────────────────────────────────────────────────────────────
          // PHASE 3: EVOLVE SPEC
          // ─────────────────────────────────────────────────────────────────

          if (state.findings.length > 0) {
            state.phase = "evolving-spec";
            log(`Evolving spec with ${state.findings.length} findings...`);

            const specEvolver = mastra?.getAgent("spec-evolver");
            if (!specEvolver) throw new Error("spec-evolver agent not found");

            const evolveResult = await specEvolver.generate(`
Evolve the LiquidCode specification:

CURRENT SPEC (v${state.spec.version}):
${state.spec.content}

FINDINGS TO ADDRESS:
${JSON.stringify(state.findings.slice(0, 20), null, 2)}

Return the complete updated specification in markdown.
Include a changelog section at the end.
            `);

            state.spec = {
              version: state.spec.version + 1,
              content: evolveResult.text,
              sections: extractSections(evolveResult.text),
              changelog: [
                ...state.spec.changelog,
                {
                  version: state.spec.version + 1,
                  changes: state.findings.map(f => f.description),
                  timestamp: new Date().toISOString(),
                },
              ],
            };

            state.metrics.specVersion = state.spec.version;
            state.findings = []; // Clear addressed findings
            log(`Spec evolved to v${state.spec.version}`);
          }

          // ─────────────────────────────────────────────────────────────────
          // PHASE 4: BUILD COMPILER (PARALLEL BY MODULE)
          // ─────────────────────────────────────────────────────────────────

          state.phase = "building-compiler";
          log("Building compiler modules in parallel...");

          const moduleBuilder = mastra?.getAgent("module-builder");
          const codeReviewer = mastra?.getAgent("code-reviewer");
          if (!moduleBuilder || !codeReviewer) throw new Error("Required agents not found");

          const MODULE_NAMES = ["scanner", "parser", "emitter", "streaming", "react-adapter"];

          const buildPromises = MODULE_NAMES.map(async (moduleName) => {
            const currentCode = state.compiler[moduleName]?.code;
            const failures = state.testResults
              .filter(r => !r.passed && r.error?.includes(moduleName))
              .map(r => r.error!);

            try {
              const buildResult = await moduleBuilder.generate(`
Build ${moduleName} module for LiquidCode v${state.spec.version}.
SPEC: ${state.spec.content.slice(0, 2000)}...
${currentCode ? `CURRENT: ${currentCode.slice(0, 500)}...` : "New module."}
${failures.length > 0 ? `FIX: ${failures.slice(0, 3).join("; ")}` : ""}
Return TypeScript code only.
              `);

              // Quick review
              const reviewResult = await codeReviewer.generate(`
Review ${moduleName}: ${buildResult.text.slice(0, 1500)}...
Return JSON: { "quality": 1-10, "isHack": boolean }
              `);
              const review = JSON.parse(reviewResult.text);

              let code = buildResult.text;
              if (review.isHack || review.quality < 6) {
                const improved = await moduleBuilder.generate(`
Improve ${moduleName} (quality: ${review.quality}/10): ${code}
Return improved TypeScript.
                `);
                code = improved.text;
              }

              return {
                name: moduleName,
                code,
                version: (state.compiler[moduleName]?.version || 0) + 1,
                hash: hashCode(code),
                tests: [],
              };
            } catch (e) {
              log(`Build failed for ${moduleName}: ${(e as Error).message}`);
              return null;
            }
          });

          const buildResults = await Promise.all(buildPromises);
          for (const result of buildResults) {
            if (result) {
              state.compiler[result.name] = result as z.infer<typeof ModuleSchema>;
            }
          }

          state.metrics.compilerIterations++;
          log(`Built ${buildResults.filter(Boolean).length} modules`);

          // ─────────────────────────────────────────────────────────────────
          // PHASE 5: TEST COMPILER
          // ─────────────────────────────────────────────────────────────────

          state.phase = "testing";
          log(`Running ${state.testSuite.length} tests...`);

          const testResults = await runCompilerTests(state.compiler, state.testSuite);
          state.testResults = testResults.results;
          state.metrics.testsPassed = testResults.passed;
          state.metrics.testsFailed = testResults.failed;

          log(`Tests: ${testResults.passed} passed, ${testResults.failed} failed`);

          // ─────────────────────────────────────────────────────────────────
          // CHECK FOR CONVERGENCE
          // ─────────────────────────────────────────────────────────────────

          if (
            testResults.failed === 0 &&
            state.testSuite.length >= inputData.targetTestCount
          ) {
            log("🎉 CONVERGENCE ACHIEVED!");
            return {
              success: true,
              compiler: state.compiler,
              spec: state.spec,
              testSuite: state.testSuite,
              metrics: {
                totalIterations: state.iteration,
                totalSamples: state.metrics.totalSamples,
                testsPassed: state.metrics.testsPassed,
                specVersions: state.metrics.specVersion,
                totalTimeMs: Date.now() - new Date(state.startedAt).getTime(),
              },
            };
          }

          // ─────────────────────────────────────────────────────────────────
          // PHASE 6: DIAGNOSE AND FIX
          // ─────────────────────────────────────────────────────────────────

          if (testResults.failed > 0) {
            state.phase = "diagnosing";
            log("Diagnosing failures...");

            const reflector = mastra?.getAgent("reflector");
            if (!reflector) throw new Error("reflector agent not found");

            const failedTests = state.testResults
              .filter(r => !r.passed)
              .slice(0, 10)
              .map(r => ({
                testCase: state.testSuite.find(t => t.id === r.testId),
                result: r,
              }));

            const diagnosisResult = await reflector.generate(`
Diagnose compiler failures:
FAILURES: ${JSON.stringify(failedTests)}
MODULES: ${Object.keys(state.compiler).join(", ")}
Return JSON: { "affectedModules": [...], "rootCause": "...", "suggestedApproach": "..." }
            `);

            const diagnosis = JSON.parse(diagnosisResult.text);
            log(`Diagnosis: ${diagnosis.rootCause}`);

            // Fix affected modules in PARALLEL
            state.phase = "fixing";
            const fixPromises = diagnosis.affectedModules.map(async (moduleName: string) => {
              const module = state.compiler[moduleName];
              if (!module) return null;

              const fixResult = await moduleBuilder.generate(`
Fix ${moduleName}:
ISSUE: ${diagnosis.rootCause}
CURRENT: ${module.code}
FAILING TESTS: ${JSON.stringify(failedTests.slice(0, 3))}
Return fixed TypeScript.
              `);

              return {
                ...module,
                code: fixResult.text,
                version: module.version + 1,
                hash: hashCode(fixResult.text),
              };
            });

            const fixResults = await Promise.all(fixPromises);
            for (const result of fixResults) {
              if (result) {
                state.compiler[result.name] = result as z.infer<typeof ModuleSchema>;
              }
            }
          }

          // ─────────────────────────────────────────────────────────────────
          // CHECKPOINT
          // ─────────────────────────────────────────────────────────────────

          if (state.iteration % inputData.checkpointInterval === 0) {
            state.lastCheckpoint = new Date().toISOString();
            log("Checkpoint saved");

            // Suspend to allow resume on failure
            await suspend({ iteration: state.iteration, checkpoint: true });
          }
        }

        // Max iterations reached
        throw new Error(`Did not converge after ${inputData.maxIterations} iterations`);
      },
    })
  )
  .commit();

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function parseInitialSpec(content: string): z.infer<typeof SpecSchema> {
  return {
    version: 1,
    content,
    sections: extractSections(content),
    changelog: [],
  };
}

function extractSections(markdown: string): Array<{ id: string; title: string; content: string }> {
  const sections: Array<{ id: string; title: string; content: string }> = [];
  const sectionRegex = /^##\s+(.+?)$/gm;
  let match;
  let lastIndex = 0;
  let lastTitle = "";

  while ((match = sectionRegex.exec(markdown)) !== null) {
    if (lastTitle) {
      sections.push({
        id: lastTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        title: lastTitle,
        content: markdown.slice(lastIndex, match.index).trim(),
      });
    }
    lastTitle = match[1];
    lastIndex = match.index + match[0].length;
  }

  if (lastTitle) {
    sections.push({
      id: lastTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title: lastTitle,
      content: markdown.slice(lastIndex).trim(),
    });
  }

  return sections;
}

function categorizeComplexity(liquidcode: string): z.infer<typeof TestCaseSchema>["category"] {
  if (liquidcode.includes("@")) return "signals";
  if (liquidcode.includes("/")) return "layers";
  if (liquidcode.includes("?")) return "conditions";
  if (liquidcode.includes(":")) return "bindings";
  if (liquidcode.includes("!") || liquidcode.includes("*")) return "layout";
  if (liquidcode.length > 100) return "complex";
  return "basic";
}

function estimateComplexity(liquidcode: string): number {
  let complexity = 1;
  complexity += (liquidcode.match(/@/g) || []).length; // signals
  complexity += (liquidcode.match(/\[/g) || []).length * 2; // nesting
  complexity += (liquidcode.match(/\//g) || []).length * 2; // layers
  complexity += (liquidcode.match(/\?/g) || []).length; // conditions
  return Math.min(10, complexity);
}

function hashCode(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    const char = code.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

async function runCompilerTests(
  compiler: Record<string, z.infer<typeof ModuleSchema>>,
  testSuite: z.infer<typeof TestCaseSchema>[]
): Promise<{
  results: Array<{
    testId: string;
    passed: boolean;
    actualOutput?: Record<string, any>;
    error?: string;
    executionTimeMs: number;
  }>;
  passed: number;
  failed: number;
}> {
  const results: Array<{
    testId: string;
    passed: boolean;
    actualOutput?: Record<string, any>;
    error?: string;
    executionTimeMs: number;
  }> = [];
  let passed = 0;
  let failed = 0;

  // Assemble compiler
  const compilerCode = Object.values(compiler).map(m => m.code).join("\n\n");

  for (const test of testSuite) {
    const start = Date.now();
    try {
      // In production, use proper sandboxing
      const fn = new Function("source", `
        ${compilerCode}
        if (typeof compile === 'function') {
          return compile(source);
        }
        throw new Error('compile function not found');
      `);

      const actual = fn(test.liquidcode);
      const executionTimeMs = Date.now() - start;

      if (JSON.stringify(actual) === JSON.stringify(test.expectedSchema)) {
        passed++;
        results.push({ testId: test.id, passed: true, actualOutput: actual, executionTimeMs });
      } else {
        failed++;
        results.push({ testId: test.id, passed: false, actualOutput: actual, executionTimeMs });
      }
    } catch (e) {
      failed++;
      results.push({
        testId: test.id,
        passed: false,
        error: (e as Error).message,
        executionTimeMs: Date.now() - start,
      });
    }
  }

  return { results, passed, failed };
}

export default synthesisWorkflow;
