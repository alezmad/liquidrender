import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { FindingSchema, SpecSchema } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// SPECIFICATION EVOLUTION STEPS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Categorize findings by spec section
 */
export const categorizeFindingsStep = createStep({
  id: "categorize-findings",
  inputSchema: z.object({
    findings: z.array(FindingSchema),
    currentSpec: SpecSchema,
  }),
  outputSchema: z.object({
    categorized: z.record(z.array(FindingSchema)),
    newSectionsNeeded: z.array(z.string()),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent("spec-evolver");
    if (!agent) throw new Error("spec-evolver agent not found");

    const result = await agent.generate(`
Categorize these findings by which spec section they affect:

CURRENT SPEC SECTIONS:
${inputData.currentSpec.sections.map(s => `- ${s.id}: ${s.title}`).join("\n")}

FINDINGS:
${JSON.stringify(inputData.findings, null, 2)}

Return JSON:
{
  "categorized": {
    "section-id": [findings...],
    ...
  },
  "newSectionsNeeded": ["New Section Title", ...]
}
    `);

    return JSON.parse(result.text);
  },
});

/**
 * Evolve a specific section of the spec
 */
export const evolveSectionStep = createStep({
  id: "evolve-section",
  inputSchema: z.object({
    sectionId: z.string(),
    currentContent: z.string(),
    findings: z.array(FindingSchema),
  }),
  outputSchema: z.object({
    sectionId: z.string(),
    newContent: z.string(),
    changes: z.array(z.string()),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent("spec-evolver");
    if (!agent) throw new Error("spec-evolver agent not found");

    const result = await agent.generate(`
Evolve this specification section to address the findings:

SECTION: ${inputData.sectionId}

CURRENT CONTENT:
${inputData.currentContent}

FINDINGS TO ADDRESS:
${JSON.stringify(inputData.findings, null, 2)}

REQUIREMENTS:
- Address every finding
- Maintain backwards compatibility
- Add examples for new/changed syntax
- Be precise and unambiguous

Return JSON:
{
  "newContent": "updated markdown content",
  "changes": ["Change 1", "Change 2", ...]
}
    `);

    const parsed = JSON.parse(result.text);
    return {
      sectionId: inputData.sectionId,
      newContent: parsed.newContent,
      changes: parsed.changes,
    };
  },
});

/**
 * Evolve multiple sections in PARALLEL
 */
export const evolveSectionsBatchStep = createStep({
  id: "evolve-sections-batch",
  inputSchema: z.object({
    sections: z.array(z.object({
      sectionId: z.string(),
      currentContent: z.string(),
      findings: z.array(FindingSchema),
    })),
  }),
  outputSchema: z.object({
    evolvedSections: z.array(z.object({
      sectionId: z.string(),
      newContent: z.string(),
      changes: z.array(z.string()),
    })),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent("spec-evolver");
    if (!agent) throw new Error("spec-evolver agent not found");

    // Evolve all sections in PARALLEL
    const evolvePromises = inputData.sections.map(async (section) => {
      const result = await agent.generate(`
Evolve this spec section:

SECTION: ${section.sectionId}
CURRENT: ${section.currentContent}
FINDINGS: ${JSON.stringify(section.findings)}

Return JSON: { "newContent": "...", "changes": [...] }
      `);

      const parsed = JSON.parse(result.text);
      return {
        sectionId: section.sectionId,
        newContent: parsed.newContent,
        changes: parsed.changes,
      };
    });

    const evolvedSections = await Promise.all(evolvePromises);
    return { evolvedSections };
  },
});

/**
 * Create new spec section
 */
export const createSectionStep = createStep({
  id: "create-section",
  inputSchema: z.object({
    title: z.string(),
    relatedFindings: z.array(FindingSchema),
    existingSpec: SpecSchema,
  }),
  outputSchema: z.object({
    section: z.object({
      id: z.string(),
      title: z.string(),
      content: z.string(),
    }),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent("spec-evolver");
    if (!agent) throw new Error("spec-evolver agent not found");

    const result = await agent.generate(`
Create a new specification section:

TITLE: ${inputData.title}

RELATED FINDINGS:
${JSON.stringify(inputData.relatedFindings, null, 2)}

EXISTING SPEC CONTEXT:
${inputData.existingSpec.sections.map(s => `${s.title}: ${s.content.slice(0, 200)}...`).join("\n\n")}

Create a comprehensive section that:
- Addresses all related findings
- Follows the style of existing sections
- Includes grammar definitions if syntax is involved
- Provides clear examples

Return JSON:
{
  "id": "section-id",
  "title": "Section Title",
  "content": "Full markdown content"
}
    `);

    return { section: JSON.parse(result.text) };
  },
});

/**
 * Assemble evolved spec from sections
 */
export const assembleSpecStep = createStep({
  id: "assemble-spec",
  inputSchema: z.object({
    currentSpec: SpecSchema,
    evolvedSections: z.array(z.object({
      sectionId: z.string(),
      newContent: z.string(),
      changes: z.array(z.string()),
    })),
    newSections: z.array(z.object({
      id: z.string(),
      title: z.string(),
      content: z.string(),
    })),
  }),
  outputSchema: SpecSchema,
  execute: async ({ inputData }) => {
    // Update existing sections
    const updatedSections = inputData.currentSpec.sections.map(section => {
      const evolved = inputData.evolvedSections.find(e => e.sectionId === section.id);
      if (evolved) {
        return { ...section, content: evolved.newContent };
      }
      return section;
    });

    // Add new sections
    const allSections = [...updatedSections, ...inputData.newSections];

    // Collect all changes for changelog
    const allChanges = inputData.evolvedSections.flatMap(e => e.changes);

    // Build new spec
    const newVersion = inputData.currentSpec.version + 1;

    return {
      version: newVersion,
      content: allSections.map(s => `## ${s.title}\n\n${s.content}`).join("\n\n---\n\n"),
      sections: allSections,
      changelog: [
        ...inputData.currentSpec.changelog,
        {
          version: newVersion,
          changes: allChanges,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  },
});

/**
 * Full spec evolution step (orchestrates the above)
 */
export const evolveSpecStep = createStep({
  id: "evolve-spec",
  inputSchema: z.object({
    currentSpec: SpecSchema,
    findings: z.array(FindingSchema),
  }),
  outputSchema: z.object({
    newSpec: SpecSchema,
    changesApplied: z.number(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent("spec-evolver");
    if (!agent) throw new Error("spec-evolver agent not found");

    // If no findings, return current spec
    if (inputData.findings.length === 0) {
      return { newSpec: inputData.currentSpec, changesApplied: 0 };
    }

    // Categorize findings
    const categorizationResult = await agent.generate(`
Categorize findings by spec section:
Sections: ${inputData.currentSpec.sections.map(s => s.id).join(", ")}
Findings: ${JSON.stringify(inputData.findings)}
Return JSON: { "categorized": { "sectionId": [findings] }, "newSectionsNeeded": [] }
    `);
    const { categorized, newSectionsNeeded } = JSON.parse(categorizationResult.text);

    // Evolve sections in PARALLEL
    const sectionEvolutions = await Promise.all(
      Object.entries(categorized).map(async ([sectionId, findings]) => {
        const section = inputData.currentSpec.sections.find(s => s.id === sectionId);
        if (!section) return null;

        const result = await agent.generate(`
Evolve section ${sectionId}:
Current: ${section.content}
Findings: ${JSON.stringify(findings)}
Return JSON: { "newContent": "...", "changes": [...] }
        `);
        const parsed = JSON.parse(result.text);
        return { sectionId, ...parsed };
      })
    );

    // Create new sections in PARALLEL
    const newSections = await Promise.all(
      newSectionsNeeded.map(async (title: string) => {
        const result = await agent.generate(`
Create new spec section "${title}" addressing related findings.
Return JSON: { "id": "...", "title": "...", "content": "..." }
        `);
        return JSON.parse(result.text);
      })
    );

    // Assemble new spec
    const evolvedSections = sectionEvolutions.filter(Boolean) as Array<{
      sectionId: string;
      newContent: string;
      changes: string[];
    }>;

    const updatedSections = inputData.currentSpec.sections.map(section => {
      const evolved = evolvedSections.find(e => e.sectionId === section.id);
      return evolved ? { ...section, content: evolved.newContent } : section;
    });

    const allChanges = evolvedSections.flatMap(e => e.changes);
    const newVersion = inputData.currentSpec.version + 1;

    return {
      newSpec: {
        version: newVersion,
        content: [...updatedSections, ...newSections]
          .map(s => `## ${s.title}\n\n${s.content}`)
          .join("\n\n---\n\n"),
        sections: [...updatedSections, ...newSections],
        changelog: [
          ...inputData.currentSpec.changelog,
          {
            version: newVersion,
            changes: allChanges,
            timestamp: new Date().toISOString(),
          },
        ],
      },
      changesApplied: allChanges.length,
    };
  },
});
