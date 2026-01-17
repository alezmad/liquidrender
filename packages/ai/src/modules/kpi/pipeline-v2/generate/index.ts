/**
 * KPI Pipeline V2 - GENERATE Phase
 *
 * Type-specific prompt-based generation of KPI DSL definitions.
 * Runs prompts in parallel for maximum throughput.
 */

// Main generator function
export { generateKPIs } from './generator';

// Type-specific prompts (for customization/testing)
export * as SimplePrompt from './simple-prompt';
export * as RatioPrompt from './ratio-prompt';
export * as FilteredPrompt from './filtered-prompt';
export * as CompositePrompt from './composite-prompt';
