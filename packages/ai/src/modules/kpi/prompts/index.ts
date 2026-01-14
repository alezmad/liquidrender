/**
 * KPI Generation Prompts
 *
 * Versioned prompt templates for KPI generation and repair.
 * Each prompt includes:
 * - name: Unique identifier for tracing
 * - version: Semantic version for tracking evolution
 * - template: The prompt template with placeholders
 * - render(): Function to fill in placeholders
 * - changelog: History of changes
 */

export { SCHEMA_FIRST_GENERATION_PROMPT } from "./schema-first-generation";
export { SCHEMA_REPAIR_PROMPT } from "./schema-repair";
export { COMPILE_REPAIR_PROMPT } from "./compile-repair";

/**
 * Get prompt metadata for logging/tracing
 */
export function getPromptMetadata(promptName: string): {
  name: string;
  version: string;
} | null {
  const prompts: Record<string, { name: string; version: string }> = {
    "schema-first-kpi-generation": {
      name: "schema-first-kpi-generation",
      version: "1.0.0",
    },
    "schema-repair": {
      name: "schema-repair",
      version: "1.0.0",
    },
    "compile-repair": {
      name: "compile-repair",
      version: "1.0.0",
    },
  };

  return prompts[promptName] || null;
}
