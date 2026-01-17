/**
 * KPI Recipe Generation Module
 *
 * Generates calculated metric recipes for business KPIs using LLMs.
 *
 * V1: Single-prompt generation with repair
 * V2: Cognitive decomposition (PLAN → GENERATE → VALIDATE → REPAIR)
 */

export * from "./types";
export * from "./recipe-generator";

// V2 Pipeline
export * from "./pipeline-v2";
export * from "./schema-intelligence";
