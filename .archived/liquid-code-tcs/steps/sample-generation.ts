import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { SampleSchema, FindingSchema } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE GENERATION STEPS (Parallelizable)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate diverse dashboard prompts in parallel batches
 */
export const generatePromptsStep = createStep({
  id: "generate-prompts",
  inputSchema: z.object({
    count: z.number(),
    categories: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    prompts: z.array(z.string()),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent("prompt-generator");
    if (!agent) throw new Error("prompt-generator agent not found");

    // Generate prompts in parallel batches of 5
    const batchSize = 5;
    const batches = Math.ceil(inputData.count / batchSize);

    const batchPromises = Array.from({ length: batches }, async (_, i) => {
      const result = await agent.generate(`
        Generate ${Math.min(batchSize, inputData.count - i * batchSize)} unique dashboard UI prompts.
        ${inputData.categories ? `Focus on: ${inputData.categories.join(", ")}` : ""}
        Batch ${i + 1} of ${batches} - ensure variety from other batches.
        Return JSON array of strings.
      `);
      return JSON.parse(result.text) as string[];
    });

    const results = await Promise.all(batchPromises);
    return { prompts: results.flat() };
  },
});

/**
 * Generate JSX from prompt
 */
export const generateJSXStep = createStep({
  id: "generate-jsx",
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: z.object({ jsx: z.string() }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent("jsx-generator");
    if (!agent) throw new Error("jsx-generator agent not found");

    const result = await agent.generate(inputData.prompt);
    return { jsx: result.text };
  },
});

/**
 * Extract schema from JSX
 */
export const extractSchemaStep = createStep({
  id: "extract-schema",
  inputSchema: z.object({ jsx: z.string() }),
  outputSchema: z.object({ schema: z.record(z.any()) }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent("schema-extractor");
    if (!agent) throw new Error("schema-extractor agent not found");

    const result = await agent.generate(
      `Extract LiquidSchema from this JSX:\n\n${inputData.jsx}`
    );
    return { schema: JSON.parse(result.text) };
  },
});

/**
 * Write LiquidCode from schema
 */
export const writeLiquidCodeStep = createStep({
  id: "write-liquidcode",
  inputSchema: z.object({ schema: z.record(z.any()) }),
  outputSchema: z.object({ liquidcode: z.string() }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent("liquidcode-writer");
    if (!agent) throw new Error("liquidcode-writer agent not found");

    const result = await agent.generate(
      `Convert to LiquidCode v3:\n\n${JSON.stringify(inputData.schema, null, 2)}`
    );
    return { liquidcode: result.text };
  },
});

/**
 * Generate a complete sample (JSX → Schema → LiquidCode) - PARALLELIZABLE
 */
export const generateSampleStep = createStep({
  id: "generate-sample",
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: SampleSchema,
  execute: async ({ inputData, mastra }) => {
    const jsxAgent = mastra?.getAgent("jsx-generator");
    const schemaAgent = mastra?.getAgent("schema-extractor");
    const liquidAgent = mastra?.getAgent("liquidcode-writer");

    if (!jsxAgent || !schemaAgent || !liquidAgent) {
      throw new Error("Required agents not found");
    }

    // Step 1: Generate JSX
    const jsxResult = await jsxAgent.generate(inputData.prompt);
    const jsx = jsxResult.text;

    // Step 2: Extract Schema
    const schemaResult = await schemaAgent.generate(
      `Extract LiquidSchema from:\n\n${jsx}`
    );
    const schema = JSON.parse(schemaResult.text);

    // Step 3: Write LiquidCode
    const liquidResult = await liquidAgent.generate(
      `Convert to LiquidCode v3:\n\n${JSON.stringify(schema, null, 2)}`
    );
    const liquidcode = liquidResult.text;

    return {
      id: crypto.randomUUID(),
      prompt: inputData.prompt,
      jsx,
      schema,
      liquidcode,
      createdAt: new Date().toISOString(),
      validated: false,
    };
  },
});

/**
 * Generate multiple samples in PARALLEL
 */
export const generateSamplesBatchStep = createStep({
  id: "generate-samples-batch",
  inputSchema: z.object({
    prompts: z.array(z.string()),
    concurrency: z.number().default(10),
  }),
  outputSchema: z.object({
    samples: z.array(SampleSchema),
    errors: z.array(z.object({
      prompt: z.string(),
      error: z.string(),
    })),
  }),
  execute: async ({ inputData, mastra }) => {
    const jsxAgent = mastra?.getAgent("jsx-generator");
    const schemaAgent = mastra?.getAgent("schema-extractor");
    const liquidAgent = mastra?.getAgent("liquidcode-writer");

    if (!jsxAgent || !schemaAgent || !liquidAgent) {
      throw new Error("Required agents not found");
    }

    const samples: z.infer<typeof SampleSchema>[] = [];
    const errors: { prompt: string; error: string }[] = [];

    // Process in parallel with concurrency limit
    const processSample = async (prompt: string) => {
      try {
        // Generate JSX
        const jsxResult = await jsxAgent.generate(prompt);
        const jsx = jsxResult.text;

        // Extract Schema
        const schemaResult = await schemaAgent.generate(
          `Extract LiquidSchema from:\n\n${jsx}`
        );
        const schema = JSON.parse(schemaResult.text);

        // Write LiquidCode
        const liquidResult = await liquidAgent.generate(
          `Convert to LiquidCode v3:\n\n${JSON.stringify(schema, null, 2)}`
        );
        const liquidcode = liquidResult.text;

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
        return { error: prompt, message: (e as Error).message };
      }
    };

    // Chunk into batches for controlled parallelism
    const chunks: string[][] = [];
    for (let i = 0; i < inputData.prompts.length; i += inputData.concurrency) {
      chunks.push(inputData.prompts.slice(i, i + inputData.concurrency));
    }

    for (const chunk of chunks) {
      const results = await Promise.all(chunk.map(processSample));

      for (const result of results) {
        if ("error" in result) {
          errors.push({ prompt: result.error, error: result.message });
        } else {
          samples.push(result);
        }
      }
    }

    return { samples, errors };
  },
});

/**
 * Cross-validate a sample (bidirectional check)
 */
export const validateSampleStep = createStep({
  id: "validate-sample",
  inputSchema: SampleSchema,
  outputSchema: z.object({
    sample: SampleSchema,
    consistent: z.boolean(),
    findings: z.array(FindingSchema),
  }),
  execute: async ({ inputData, mastra }) => {
    const judgeAgent = mastra?.getAgent("judge");
    const schemaAgent = mastra?.getAgent("schema-extractor");
    const liquidAgent = mastra?.getAgent("liquidcode-writer");

    if (!judgeAgent || !schemaAgent || !liquidAgent) {
      throw new Error("Required agents not found");
    }

    // Reverse transformations in PARALLEL
    const [schemaFromLiquid, jsxFromSchema] = await Promise.all([
      // LiquidCode → Schema (would use compiler, but for now use LLM)
      schemaAgent.generate(
        `Parse this LiquidCode and return the equivalent LiquidSchema JSON:\n\n${inputData.liquidcode}`
      ),
      // Schema → JSX
      mastra?.getAgent("jsx-generator")?.generate(
        `Generate React JSX that would produce this schema:\n\n${JSON.stringify(inputData.schema, null, 2)}`
      ),
    ]);

    // Judge consistency
    const judgment = await judgeAgent.generate(`
Compare these representations for semantic equivalence:

ORIGINAL JSX:
${inputData.jsx}

ORIGINAL SCHEMA:
${JSON.stringify(inputData.schema, null, 2)}

ORIGINAL LIQUIDCODE:
${inputData.liquidcode}

RECONSTRUCTED SCHEMA (from LiquidCode):
${schemaFromLiquid.text}

RECONSTRUCTED JSX (from Schema):
${jsxFromSchema?.text || "N/A"}

Return JSON with format:
{
  "consistent": boolean,
  "findings": [{
    "id": "uuid",
    "sampleId": "${inputData.id}",
    "type": "inconsistency" | "gap" | "ambiguity" | "error",
    "severity": "low" | "medium" | "high" | "critical",
    "description": "...",
    "sourceRepresentation": "jsx" | "schema" | "liquidcode",
    "targetRepresentation": "jsx" | "schema" | "liquidcode",
    "suggestedFix": "...",
    "specSection": "..."
  }]
}
    `);

    const result = JSON.parse(judgment.text);

    return {
      sample: {
        ...inputData,
        validated: result.consistent,
      },
      consistent: result.consistent,
      findings: result.findings,
    };
  },
});

/**
 * Validate multiple samples in PARALLEL
 */
export const validateSamplesBatchStep = createStep({
  id: "validate-samples-batch",
  inputSchema: z.object({
    samples: z.array(SampleSchema),
    concurrency: z.number().default(5),
  }),
  outputSchema: z.object({
    validatedSamples: z.array(SampleSchema),
    allFindings: z.array(FindingSchema),
    consistentCount: z.number(),
    inconsistentCount: z.number(),
  }),
  execute: async ({ inputData, mastra }) => {
    const judgeAgent = mastra?.getAgent("judge");
    const schemaAgent = mastra?.getAgent("schema-extractor");
    const jsxAgent = mastra?.getAgent("jsx-generator");

    if (!judgeAgent || !schemaAgent || !jsxAgent) {
      throw new Error("Required agents not found");
    }

    const validatedSamples: z.infer<typeof SampleSchema>[] = [];
    const allFindings: z.infer<typeof FindingSchema>[] = [];
    let consistentCount = 0;
    let inconsistentCount = 0;

    const validateOne = async (sample: z.infer<typeof SampleSchema>) => {
      try {
        // Reverse transformations in parallel
        const [schemaFromLiquid, jsxFromSchema] = await Promise.all([
          schemaAgent.generate(
            `Parse this LiquidCode to LiquidSchema JSON:\n\n${sample.liquidcode}`
          ),
          jsxAgent.generate(
            `Generate React JSX for this schema:\n\n${JSON.stringify(sample.schema, null, 2)}`
          ),
        ]);

        // Judge
        const judgment = await judgeAgent.generate(`
Compare representations:
Original JSX: ${sample.jsx.slice(0, 1000)}...
Original Schema: ${JSON.stringify(sample.schema).slice(0, 1000)}...
Original LiquidCode: ${sample.liquidcode}
Reconstructed Schema: ${schemaFromLiquid.text.slice(0, 1000)}...
Reconstructed JSX: ${jsxFromSchema.text.slice(0, 1000)}...

Return JSON: { "consistent": boolean, "findings": [...] }
        `);

        const result = JSON.parse(judgment.text);
        return {
          sample: { ...sample, validated: result.consistent },
          consistent: result.consistent,
          findings: result.findings.map((f: any) => ({
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
            type: "error" as const,
            severity: "high" as const,
            description: `Validation failed: ${(e as Error).message}`,
            sourceRepresentation: "liquidcode" as const,
            targetRepresentation: "schema" as const,
            suggestedFix: "Review sample generation",
          }],
        };
      }
    };

    // Process in parallel batches
    const chunks: z.infer<typeof SampleSchema>[][] = [];
    for (let i = 0; i < inputData.samples.length; i += inputData.concurrency) {
      chunks.push(inputData.samples.slice(i, i + inputData.concurrency));
    }

    for (const chunk of chunks) {
      const results = await Promise.all(chunk.map(validateOne));

      for (const result of results) {
        validatedSamples.push(result.sample);
        allFindings.push(...result.findings);
        if (result.consistent) {
          consistentCount++;
        } else {
          inconsistentCount++;
        }
      }
    }

    return {
      validatedSamples,
      allFindings,
      consistentCount,
      inconsistentCount,
    };
  },
});
