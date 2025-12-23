import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// CORE SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A sample consists of three semantically equivalent representations
 */
export const SampleSchema = z.object({
  id: z.string().uuid(),
  prompt: z.string().describe("Original natural language prompt"),
  jsx: z.string().describe("React JSX representation"),
  schema: z.record(z.any()).describe("LiquidSchema JSON"),
  liquidcode: z.string().describe("LiquidCode DSL source"),
  createdAt: z.string().datetime(),
  validated: z.boolean().default(false),
});

export type Sample = z.infer<typeof SampleSchema>;

/**
 * Finding from cross-validation
 */
export const FindingSchema = z.object({
  id: z.string().uuid(),
  sampleId: z.string().uuid(),
  type: z.enum([
    "inconsistency",    // Representations don't match
    "gap",              // Spec doesn't cover this case
    "ambiguity",        // Multiple valid interpretations
    "error",            // Invalid representation
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string(),
  sourceRepresentation: z.enum(["jsx", "schema", "liquidcode"]),
  targetRepresentation: z.enum(["jsx", "schema", "liquidcode"]),
  suggestedFix: z.string(),
  specSection: z.string().optional(),
});

export type Finding = z.infer<typeof FindingSchema>;

/**
 * A compiler module
 */
export const ModuleSchema = z.object({
  name: z.enum(["scanner", "parser", "emitter", "streaming", "react-adapter"]),
  code: z.string(),
  version: z.number(),
  hash: z.string().describe("SHA256 of code for change detection"),
  tests: z.array(z.object({
    name: z.string(),
    input: z.string(),
    expectedOutput: z.string(),
    passed: z.boolean().optional(),
  })),
});

export type Module = z.infer<typeof ModuleSchema>;

/**
 * The evolving specification
 */
export const SpecSchema = z.object({
  version: z.number(),
  content: z.string().describe("Markdown specification"),
  sections: z.array(z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
  })),
  changelog: z.array(z.object({
    version: z.number(),
    changes: z.array(z.string()),
    timestamp: z.string().datetime(),
  })),
});

export type Spec = z.infer<typeof SpecSchema>;

/**
 * Test case derived from validated samples
 */
export const TestCaseSchema = z.object({
  id: z.string().uuid(),
  sampleId: z.string().uuid(),
  liquidcode: z.string(),
  expectedSchema: z.record(z.any()),
  category: z.enum([
    "basic",
    "signals",
    "layers",
    "conditions",
    "bindings",
    "layout",
    "complex",
  ]),
  complexity: z.number().min(1).max(10),
});

export type TestCase = z.infer<typeof TestCaseSchema>;

/**
 * Test result
 */
export const TestResultSchema = z.object({
  testId: z.string().uuid(),
  passed: z.boolean(),
  actualOutput: z.record(z.any()).optional(),
  error: z.string().optional(),
  executionTimeMs: z.number(),
});

export type TestResult = z.infer<typeof TestResultSchema>;

/**
 * Diagnosis from failure analysis
 */
export const DiagnosisSchema = z.object({
  isArchitectureFlaw: z.boolean(),
  severity: z.enum(["minor", "moderate", "major", "critical"]),
  diagnosis: z.string(),
  affectedModules: z.array(z.string()),
  suggestedApproach: z.enum([
    "fix-bug",           // Simple bug fix
    "refactor-module",   // Rewrite single module
    "redesign-interface", // Change module interfaces
    "architectural-change", // Fundamental redesign
  ]),
  rootCause: z.string(),
});

export type Diagnosis = z.infer<typeof DiagnosisSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// STATE SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Synthesis loop state
 */
export const SynthesisStateSchema = z.object({
  iteration: z.number(),
  phase: z.enum([
    "generating-samples",
    "validating-samples",
    "evolving-spec",
    "building-compiler",
    "testing",
    "diagnosing",
    "fixing",
    "complete",
  ]),
  spec: SpecSchema,
  compiler: z.record(ModuleSchema),
  testSuite: z.array(TestCaseSchema),
  samples: z.array(SampleSchema),
  findings: z.array(FindingSchema),
  testResults: z.array(TestResultSchema),
  metrics: z.object({
    totalSamples: z.number(),
    validatedSamples: z.number(),
    testsPassed: z.number(),
    testsFailed: z.number(),
    specVersion: z.number(),
    compilerIterations: z.number(),
  }),
  startedAt: z.string().datetime(),
  lastCheckpoint: z.string().datetime().optional(),
});

export type SynthesisState = z.infer<typeof SynthesisStateSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// INPUT/OUTPUT SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const SynthesisInputSchema = z.object({
  initialSpec: z.string().describe("Initial LiquidCode specification"),
  targetTestCount: z.number().default(100),
  maxIterations: z.number().default(50),
  parallelSamples: z.number().default(10),
  checkpointInterval: z.number().default(5),
  resume: z.boolean().default(false),
});

export type SynthesisInput = z.infer<typeof SynthesisInputSchema>;

export const SynthesisOutputSchema = z.object({
  success: z.boolean(),
  compiler: z.record(ModuleSchema),
  spec: SpecSchema,
  testSuite: z.array(TestCaseSchema),
  metrics: z.object({
    totalIterations: z.number(),
    totalSamples: z.number(),
    testsPassed: z.number(),
    specVersions: z.number(),
    totalTimeMs: z.number(),
  }),
});

export type SynthesisOutput = z.infer<typeof SynthesisOutputSchema>;
