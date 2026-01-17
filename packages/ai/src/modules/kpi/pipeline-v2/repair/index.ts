/**
 * KPI Repair Module - Escalating Model Repair
 *
 * Exports the repair system for Pipeline V2:
 * - repairKPIs: Main entry point for batch repair
 * - Tier-specific repair functions for testing
 * - Repair prompts and metadata
 */

// Main repair function
export { repairKPIs } from './repairer';

// Individual tier functions (for testing)
export {
  tryHaikuRepair,
  trySonnetRepair,
  tryOpusRepair,
  repairSingleKPI,
  testCompilation,
} from './repairer';

// Prompt builders
export {
  buildHaikuRepairPrompt,
  buildSonnetRepairPrompt,
  buildOpusRepairPrompt,
  HAIKU_REPAIR_PROMPT_NAME,
  HAIKU_REPAIR_PROMPT_VERSION,
  SONNET_REPAIR_PROMPT_NAME,
  SONNET_REPAIR_PROMPT_VERSION,
  OPUS_REPAIR_PROMPT_NAME,
  OPUS_REPAIR_PROMPT_VERSION,
  REPAIR_PROMPTS_CHANGELOG,
} from './repair-prompts';
