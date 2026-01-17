/**
 * KPI Plan Module
 *
 * PLAN phase of Pipeline V2: Opus-powered strategic planning.
 *
 * Exports:
 * - planKPIs: Main planning function
 * - KPI_PLAN_PROMPT: The prompt template
 * - PLAN_PROMPT_NAME, PLAN_PROMPT_VERSION: Prompt metadata
 * - parseKPIPlanResponse: Response parser utility
 */

export {
  planKPIs,
  PLAN_PROMPT_NAME,
  PLAN_PROMPT_VERSION,
} from './planner';

export {
  KPI_PLAN_PROMPT,
  parseKPIPlanResponse,
} from './plan-prompt';
