import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { ModuleSchema, SpecSchema, DiagnosisSchema, TestCaseSchema, TestResultSchema } from "../types";
import { createHash } from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// COMPILER BUILD STEPS (Parallelizable by module)
// ─────────────────────────────────────────────────────────────────────────────

const MODULE_NAMES = ["scanner", "parser", "emitter", "streaming", "react-adapter"] as const;

/**
 * Build a single compiler module
 */
export const buildModuleStep = createStep({
  id: "build-module",
  inputSchema: z.object({
    moduleName: z.enum(MODULE_NAMES),
    spec: SpecSchema,
    currentCode: z.string().optional(),
    failures: z.array(z.string()),
    interfaceConstraints: z.record(z.string()).optional(),
  }),
  outputSchema: ModuleSchema,
  execute: async ({ inputData, mastra }) => {
    const builderAgent = mastra?.getAgent("module-builder");
    const reviewerAgent = mastra?.getAgent("code-reviewer");

    if (!builderAgent || !reviewerAgent) {
      throw new Error("Required agents not found");
    }

    // Build module
    const buildResult = await builderAgent.generate(`
Build the ${inputData.moduleName} module.

SPECIFICATION:
${inputData.spec.content}

${inputData.currentCode ? `CURRENT CODE:\n${inputData.currentCode}` : "No existing code."}

${inputData.failures.length > 0 ? `FAILURES TO FIX:\n${inputData.failures.join("\n")}` : ""}

${inputData.interfaceConstraints ? `INTERFACE CONSTRAINTS:\n${JSON.stringify(inputData.interfaceConstraints)}` : ""}

Requirements:
- Production quality TypeScript
- Follow single-pass design
- Zero allocations in hot path
- Comprehensive error handling
- Include inline tests

Return ONLY valid TypeScript code.
    `);

    const code = buildResult.text;

    // Review for quality
    const reviewResult = await reviewerAgent.generate(`
Review this ${inputData.moduleName} module:

${code}

Return JSON: {
  "isProductionReady": boolean,
  "isHack": boolean,
  "issues": [...],
  "overallQuality": 1-10
}
    `);

    const review = JSON.parse(reviewResult.text);

    // If it's a hack, regenerate
    if (review.isHack || review.overallQuality < 7) {
      const refactorResult = await builderAgent.generate(`
The previous implementation was flagged as low quality:
${JSON.stringify(review.issues)}

Refactor to production quality:
${code}

Requirements:
- No hacks or workarounds
- Proper architecture
- Clean abstractions
- Full error handling

Return ONLY valid TypeScript code.
      `);

      return {
        name: inputData.moduleName,
        code: refactorResult.text,
        version: 1,
        hash: createHash("sha256").update(refactorResult.text).digest("hex"),
        tests: [],
      };
    }

    return {
      name: inputData.moduleName,
      code,
      version: 1,
      hash: createHash("sha256").update(code).digest("hex"),
      tests: [],
    };
  },
});

/**
 * Build all compiler modules in PARALLEL
 */
export const buildAllModulesStep = createStep({
  id: "build-all-modules",
  inputSchema: z.object({
    spec: SpecSchema,
    currentModules: z.record(ModuleSchema).optional(),
    failures: z.record(z.array(z.string())).optional(),
  }),
  outputSchema: z.object({
    modules: z.record(ModuleSchema),
    buildErrors: z.array(z.object({
      module: z.string(),
      error: z.string(),
    })),
  }),
  execute: async ({ inputData, mastra }) => {
    const builderAgent = mastra?.getAgent("module-builder");
    const reviewerAgent = mastra?.getAgent("code-reviewer");

    if (!builderAgent || !reviewerAgent) {
      throw new Error("Required agents not found");
    }

    const modules: Record<string, z.infer<typeof ModuleSchema>> = {};
    const buildErrors: { module: string; error: string }[] = [];

    // Build all modules in PARALLEL
    const buildPromises = MODULE_NAMES.map(async (moduleName) => {
      try {
        const currentCode = inputData.currentModules?.[moduleName]?.code;
        const moduleFailures = inputData.failures?.[moduleName] || [];

        const buildResult = await builderAgent.generate(`
Build the ${moduleName} module.
SPEC: ${inputData.spec.content.slice(0, 3000)}...
${currentCode ? `CURRENT: ${currentCode.slice(0, 1000)}...` : "New module."}
${moduleFailures.length > 0 ? `FIX: ${moduleFailures.join("; ")}` : ""}
Return TypeScript code only.
        `);

        const code = buildResult.text;

        // Quick quality check
        const reviewResult = await reviewerAgent.generate(`
Quick review of ${moduleName}: ${code.slice(0, 2000)}...
Return JSON: { "isHack": boolean, "quality": 1-10 }
        `);

        const review = JSON.parse(reviewResult.text);

        if (review.isHack || review.quality < 6) {
          // One refactor attempt
          const refactorResult = await builderAgent.generate(`
Improve quality of ${moduleName}: ${code}
Issues: Low quality score (${review.quality}/10)
Return improved TypeScript code.
          `);

          return {
            name: moduleName,
            code: refactorResult.text,
            version: (inputData.currentModules?.[moduleName]?.version || 0) + 1,
            hash: createHash("sha256").update(refactorResult.text).digest("hex"),
            tests: [],
          };
        }

        return {
          name: moduleName,
          code,
          version: (inputData.currentModules?.[moduleName]?.version || 0) + 1,
          hash: createHash("sha256").update(code).digest("hex"),
          tests: [],
        };
      } catch (e) {
        return { error: moduleName, message: (e as Error).message };
      }
    });

    const results = await Promise.all(buildPromises);

    for (const result of results) {
      if ("error" in result) {
        buildErrors.push({ module: result.error, error: result.message });
      } else {
        modules[result.name] = result;
      }
    }

    return { modules, buildErrors };
  },
});

/**
 * Run tests against compiler
 */
export const runTestsStep = createStep({
  id: "run-tests",
  inputSchema: z.object({
    modules: z.record(ModuleSchema),
    testCases: z.array(TestCaseSchema),
  }),
  outputSchema: z.object({
    results: z.array(TestResultSchema),
    passed: z.number(),
    failed: z.number(),
    errors: z.number(),
  }),
  execute: async ({ inputData }) => {
    const results: z.infer<typeof TestResultSchema>[] = [];
    let passed = 0;
    let failed = 0;
    let errors = 0;

    // Assemble compiler from modules
    const compilerCode = Object.values(inputData.modules)
      .map(m => m.code)
      .join("\n\n");

    // Create a sandboxed execution environment
    // In production, this would use a proper sandbox (vm2, isolated-vm, etc.)
    const executeCompiler = async (liquidcode: string): Promise<Record<string, any>> => {
      try {
        // For now, we'll use eval with caution (in production, use proper sandboxing)
        const fn = new Function("liquidcode", `
          ${compilerCode}
          return compile(liquidcode);
        `);
        return fn(liquidcode);
      } catch (e) {
        throw e;
      }
    };

    // Run tests (could be parallelized but need to be careful with shared state)
    for (const test of inputData.testCases) {
      const startTime = Date.now();

      try {
        const actual = await executeCompiler(test.liquidcode);
        const executionTimeMs = Date.now() - startTime;

        // Deep compare
        const isEqual = JSON.stringify(actual) === JSON.stringify(test.expectedSchema);

        if (isEqual) {
          passed++;
          results.push({
            testId: test.id,
            passed: true,
            actualOutput: actual,
            executionTimeMs,
          });
        } else {
          failed++;
          results.push({
            testId: test.id,
            passed: false,
            actualOutput: actual,
            executionTimeMs,
          });
        }
      } catch (e) {
        errors++;
        results.push({
          testId: test.id,
          passed: false,
          error: (e as Error).message,
          executionTimeMs: Date.now() - startTime,
        });
      }
    }

    return { results, passed, failed, errors };
  },
});

/**
 * Diagnose test failures
 */
export const diagnoseFailuresStep = createStep({
  id: "diagnose-failures",
  inputSchema: z.object({
    modules: z.record(ModuleSchema),
    failedTests: z.array(z.object({
      testCase: TestCaseSchema,
      result: TestResultSchema,
    })),
  }),
  outputSchema: DiagnosisSchema,
  execute: async ({ inputData, mastra }) => {
    const reflector = mastra?.getAgent("reflector");
    if (!reflector) throw new Error("reflector agent not found");

    const result = await reflector.generate(`
Diagnose these compiler test failures:

FAILING TESTS:
${JSON.stringify(inputData.failedTests.slice(0, 10), null, 2)}

COMPILER MODULES:
${Object.entries(inputData.modules).map(([name, mod]) =>
  `${name}:\n${mod.code.slice(0, 1000)}...`
).join("\n\n")}

Analyze:
1. What patterns do failures have?
2. Is it a bug or architecture flaw?
3. Which modules are affected?
4. What's the root cause?

Return JSON:
{
  "isArchitectureFlaw": boolean,
  "severity": "minor" | "moderate" | "major" | "critical",
  "diagnosis": "...",
  "affectedModules": ["module1", ...],
  "suggestedApproach": "fix-bug" | "refactor-module" | "redesign-interface" | "architectural-change",
  "rootCause": "..."
}
    `);

    return JSON.parse(result.text);
  },
});

/**
 * Fix modules based on diagnosis - in PARALLEL for independent modules
 */
export const fixModulesStep = createStep({
  id: "fix-modules",
  inputSchema: z.object({
    modules: z.record(ModuleSchema),
    diagnosis: DiagnosisSchema,
    spec: SpecSchema,
    failedTests: z.array(z.object({
      testCase: TestCaseSchema,
      result: TestResultSchema,
    })),
  }),
  outputSchema: z.object({
    fixedModules: z.record(ModuleSchema),
    fixAttempted: z.array(z.string()),
  }),
  execute: async ({ inputData, mastra }) => {
    const builder = mastra?.getAgent("module-builder");
    if (!builder) throw new Error("module-builder agent not found");

    const fixedModules = { ...inputData.modules };
    const fixAttempted: string[] = [];

    // Fix affected modules in PARALLEL
    const fixPromises = inputData.diagnosis.affectedModules.map(async (moduleName) => {
      const module = inputData.modules[moduleName];
      if (!module) return null;

      fixAttempted.push(moduleName);

      const result = await builder.generate(`
Fix the ${moduleName} module.

DIAGNOSIS:
${inputData.diagnosis.diagnosis}

ROOT CAUSE:
${inputData.diagnosis.rootCause}

APPROACH:
${inputData.diagnosis.suggestedApproach}

CURRENT CODE:
${module.code}

FAILING TESTS:
${JSON.stringify(inputData.failedTests.filter(t =>
  t.result.error?.includes(moduleName) || true
).slice(0, 5))}

${inputData.diagnosis.isArchitectureFlaw ?
  "This requires architectural changes. Redesign as needed." :
  "This is a bug fix. Maintain current architecture."}

Return fixed TypeScript code.
      `);

      return {
        name: moduleName as typeof MODULE_NAMES[number],
        code: result.text,
        version: module.version + 1,
        hash: createHash("sha256").update(result.text).digest("hex"),
        tests: module.tests,
      };
    });

    const results = await Promise.all(fixPromises);

    for (const result of results) {
      if (result) {
        fixedModules[result.name] = result;
      }
    }

    return { fixedModules, fixAttempted };
  },
});
