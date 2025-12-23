import type {
  GraphSurvey,
  SurveyNode,
  SurveyValidationResult,
  SurveyValidationError,
  ValidationErrorCode,
  QuestionContent,
  Condition,
  NextStep,
} from './types';
import { isQuestionContent } from './types';

// ============================================================================
// Extended Validation Error Codes
// ============================================================================

export type ExtendedValidationErrorCode =
  | ValidationErrorCode
  | 'DEAD_END_PATH'
  | 'CONDITION_TYPE_MISMATCH'
  | 'MISSING_DEFAULT_PATH'
  | 'INVALID_CONDITION_ORDER'
  | 'END_NODE_HAS_NEXT'
  | 'START_NODE_WRONG_TYPE'
  | 'MULTIPLE_START_NODES'
  | 'INVALID_NPS_RANGE'
  | 'INVALID_RATING_RANGE';

export interface ExtendedValidationError extends Omit<SurveyValidationError, 'code'> {
  code: ExtendedValidationErrorCode;
}

export interface ExtendedValidationResult extends Omit<SurveyValidationResult, 'errors' | 'warnings'> {
  errors: ExtendedValidationError[];
  warnings: ExtendedValidationError[];
}

// ============================================================================
// Core Validation Functions
// ============================================================================

/**
 * Validate survey graph structure
 * Comprehensive validation including:
 * - Start/end node existence and types
 * - Node reachability and connectivity
 * - Circular reference detection
 * - Path convergence (all paths reach end)
 * - Condition type validation
 * - Question content validation
 */
export function validateSurvey(survey: GraphSurvey): ExtendedValidationResult {
  const errors: ExtendedValidationError[] = [];
  const warnings: ExtendedValidationError[] = [];
  const nodeIds = new Set(Object.keys(survey.nodes));

  // 1. Validate start node
  validateStartNode(survey, errors);

  // 2. Validate end nodes
  validateEndNodes(survey, errors, warnings);

  // 3. Build reachability and detect cycles
  const { reachable, cycles } = analyzeReachability(survey, errors);

  // Add cycle warnings
  cycles.forEach(nodeId => {
    warnings.push({
      code: 'CIRCULAR_REFERENCE',
      nodeId,
      message: `Circular reference detected at node "${nodeId}"`,
      severity: 'warning',
    });
  });

  // 4. Find unreachable nodes (dead code - always an error)
  for (const nodeId of nodeIds) {
    if (!reachable.has(nodeId)) {
      errors.push({
        code: 'UNREACHABLE_NODE',
        nodeId,
        message: `Node "${nodeId}" is not reachable from start`,
        severity: 'error',
      });
    }
  }

  // 5. Find orphan nodes (no incoming edges except start)
  validateOrphanNodes(survey, errors);

  // 6. Validate all paths reach end node
  validatePathConvergence(survey, reachable, errors, warnings);

  // 7. Validate question content
  validateQuestionContent(survey, errors, warnings);

  // 8. Validate conditions
  validateConditions(survey, errors, warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Start Node Validation
// ============================================================================

function validateStartNode(
  survey: GraphSurvey,
  errors: ExtendedValidationError[]
): void {
  if (!survey.startNodeId) {
    errors.push({
      code: 'MISSING_START_NODE',
      message: 'Survey must have a startNodeId',
      severity: 'error',
    });
    return;
  }

  const startNode = survey.nodes[survey.startNodeId];
  if (!startNode) {
    errors.push({
      code: 'MISSING_START_NODE',
      nodeId: survey.startNodeId,
      message: `Start node "${survey.startNodeId}" not found in nodes`,
      severity: 'error',
    });
    return;
  }

  if (startNode.type !== 'start') {
    errors.push({
      code: 'START_NODE_WRONG_TYPE',
      nodeId: survey.startNodeId,
      message: `Start node must have type "start", got "${startNode.type}"`,
      severity: 'error',
    });
  }

  // Check for multiple start nodes
  const startNodes = Object.values(survey.nodes).filter(n => n.type === 'start');
  if (startNodes.length > 1) {
    errors.push({
      code: 'MULTIPLE_START_NODES',
      message: `Survey has ${startNodes.length} start nodes, expected 1`,
      severity: 'error',
    });
  }
}

// ============================================================================
// End Node Validation
// ============================================================================

function validateEndNodes(
  survey: GraphSurvey,
  errors: ExtendedValidationError[],
  warnings: ExtendedValidationError[]
): void {
  const endNodes = Object.entries(survey.nodes).filter(([_, n]) => n.type === 'end');

  if (endNodes.length === 0) {
    errors.push({
      code: 'MISSING_END_NODE',
      message: 'Survey must have at least one end node',
      severity: 'error',
    });
    return;
  }

  // End nodes should not have next steps
  for (const [nodeId, node] of endNodes) {
    if (node.next && node.next.length > 0) {
      warnings.push({
        code: 'END_NODE_HAS_NEXT',
        nodeId,
        message: `End node "${nodeId}" has next steps which will be ignored`,
        severity: 'warning',
      });
    }
  }
}

// ============================================================================
// Reachability Analysis
// ============================================================================

interface ReachabilityResult {
  reachable: Set<string>;
  cycles: Set<string>;
}

function analyzeReachability(
  survey: GraphSurvey,
  errors: ExtendedValidationError[]
): ReachabilityResult {
  const reachable = new Set<string>();
  const cycles = new Set<string>();
  const fullyExplored = new Set<string>();
  const inStack = new Set<string>();

  function traverse(nodeId: string): void {
    if (!nodeId || !survey.nodes[nodeId]) return;

    if (fullyExplored.has(nodeId)) return;

    if (inStack.has(nodeId)) {
      cycles.add(nodeId);
      return;
    }

    inStack.add(nodeId);
    reachable.add(nodeId);
    const node = survey.nodes[nodeId];

    for (const next of node.next) {
      if (!survey.nodes[next.nodeId]) {
        errors.push({
          code: 'INVALID_NEXT_REFERENCE',
          nodeId,
          message: `Node "${nodeId}" references non-existent node "${next.nodeId}"`,
          severity: 'error',
        });
      } else {
        traverse(next.nodeId);
      }
    }

    inStack.delete(nodeId);
    fullyExplored.add(nodeId);
  }

  if (survey.startNodeId && survey.nodes[survey.startNodeId]) {
    traverse(survey.startNodeId);
  }

  return { reachable, cycles };
}

// ============================================================================
// Orphan Node Detection
// ============================================================================

function validateOrphanNodes(
  survey: GraphSurvey,
  errors: ExtendedValidationError[]
): void {
  const hasIncoming = new Set<string>([survey.startNodeId]);

  for (const node of Object.values(survey.nodes)) {
    for (const next of node.next) {
      hasIncoming.add(next.nodeId);
    }
  }

  for (const nodeId of Object.keys(survey.nodes)) {
    if (!hasIncoming.has(nodeId)) {
      errors.push({
        code: 'ORPHAN_NODE',
        nodeId,
        message: `Node "${nodeId}" has no incoming connections`,
        severity: 'error',
      });
    }
  }
}

// ============================================================================
// Path Convergence Validation
// ============================================================================

function validatePathConvergence(
  survey: GraphSurvey,
  reachable: Set<string>,
  errors: ExtendedValidationError[],
  warnings: ExtendedValidationError[]
): void {
  const endNodeIds = new Set(
    Object.entries(survey.nodes)
      .filter(([_, n]) => n.type === 'end')
      .map(([id]) => id)
  );

  // Check if all reachable non-end nodes can eventually reach an end node
  const canReachEnd = new Set<string>(endNodeIds);
  let changed = true;

  // Work backwards from end nodes
  while (changed) {
    changed = false;
    for (const [nodeId, node] of Object.entries(survey.nodes)) {
      if (canReachEnd.has(nodeId)) continue;

      // Check if any next step leads to a node that can reach end
      const canReach = node.next.some(next => canReachEnd.has(next.nodeId));
      if (canReach) {
        canReachEnd.add(nodeId);
        changed = true;
      }
    }
  }

  // Find dead ends (reachable nodes that can't reach end)
  for (const nodeId of reachable) {
    if (!canReachEnd.has(nodeId)) {
      const node = survey.nodes[nodeId];
      if (!node) continue;
      if (node.type !== 'end') {
        errors.push({
          code: 'DEAD_END_PATH',
          nodeId,
          message: `Node "${nodeId}" cannot reach any end node`,
          severity: 'error',
        });
      }
    }
  }
}

// ============================================================================
// Question Content Validation
// ============================================================================

function validateQuestionContent(
  survey: GraphSurvey,
  errors: ExtendedValidationError[],
  warnings: ExtendedValidationError[]
): void {
  for (const [nodeId, node] of Object.entries(survey.nodes)) {
    if (node.type !== 'question') continue;

    if (!isQuestionContent(node.content)) {
      errors.push({
        code: 'EMPTY_QUESTION',
        nodeId,
        message: `Question node "${nodeId}" has invalid or missing content`,
        severity: 'error',
      });
      continue;
    }

    const content = node.content;

    // Empty question text
    if (!content.question?.trim()) {
      errors.push({
        code: 'EMPTY_QUESTION',
        nodeId,
        message: `Question node "${nodeId}" has empty question text`,
        severity: 'error',
      });
    }

    // Choice types need options
    const needsOptions = ['choice', 'multiChoice', 'multiSelect', 'combobox'];
    if (needsOptions.includes(content.type) && (!content.options || content.options.length === 0)) {
      errors.push({
        code: 'MISSING_OPTIONS',
        nodeId,
        message: `${content.type} question "${nodeId}" requires options`,
        severity: 'error',
      });
    }

    // imageChoice needs imageOptions
    if (content.type === 'imageChoice' && (!content.imageOptions || content.imageOptions.length === 0)) {
      errors.push({
        code: 'MISSING_OPTIONS',
        nodeId,
        message: `imageChoice question "${nodeId}" requires imageOptions`,
        severity: 'error',
      });
    }

    // ranking needs rankingItems
    if (content.type === 'ranking' && (!content.rankingItems || content.rankingItems.length < 2)) {
      errors.push({
        code: 'MISSING_OPTIONS',
        nodeId,
        message: `ranking question "${nodeId}" requires at least 2 rankingItems`,
        severity: 'error',
      });
    }

    // captcha needs siteKey (except for 'simple' type)
    if (content.type === 'captcha' && content.captchaType !== 'simple' && !content.captchaSiteKey) {
      warnings.push({
        code: 'MISSING_OPTIONS',
        nodeId,
        message: `captcha question "${nodeId}" requires captchaSiteKey for ${content.captchaType || 'recaptcha'}`,
        severity: 'warning',
      });
    }

    // hidden should have a value or source
    if (content.type === 'hidden' && content.hiddenValue === undefined && content.hiddenSource !== 'context' && content.hiddenSource !== 'computed') {
      warnings.push({
        code: 'EMPTY_QUESTION',
        nodeId,
        message: `hidden question "${nodeId}" has no value defined`,
        severity: 'warning',
      });
    }

    // NPS range validation
    if (content.type === 'nps') {
      const min = content.min ?? 0;
      const max = content.max ?? 10;
      if (min !== 0 || max !== 10) {
        warnings.push({
          code: 'INVALID_NPS_RANGE',
          nodeId,
          message: `NPS question "${nodeId}" should use 0-10 range (found ${min}-${max})`,
          severity: 'warning',
        });
      }
    }

    // Rating range validation
    if (content.type === 'rating') {
      const min = content.min ?? 1;
      const max = content.max ?? 5;
      if (min < 1) {
        warnings.push({
          code: 'INVALID_RATING_RANGE',
          nodeId,
          message: `Rating question "${nodeId}" min should be >= 1 (found ${min})`,
          severity: 'warning',
        });
      }
    }
  }
}

// ============================================================================
// Condition Validation
// ============================================================================

function validateConditions(
  survey: GraphSurvey,
  errors: ExtendedValidationError[],
  warnings: ExtendedValidationError[]
): void {
  for (const [nodeId, node] of Object.entries(survey.nodes)) {
    if (node.next.length === 0) continue;

    const content = node.content;
    const questionType = isQuestionContent(content) ? content.type : null;

    // Check for missing default path when using conditions
    const hasConditions = node.next.some(n => n.condition);
    const hasDefault = node.next.some(n => !n.condition);

    if (hasConditions && !hasDefault) {
      warnings.push({
        code: 'MISSING_DEFAULT_PATH',
        nodeId,
        message: `Node "${nodeId}" has conditions but no default (fallback) path`,
        severity: 'warning',
      });
    }

    // Validate condition types match question type
    if (questionType) {
      for (const next of node.next) {
        if (!next.condition) continue;

        const typeError = validateConditionType(questionType, next.condition);
        if (typeError) {
          errors.push({
            code: 'CONDITION_TYPE_MISMATCH',
            nodeId,
            message: `Node "${nodeId}": ${typeError}`,
            severity: 'error',
          });
        }
      }
    }

    // Validate condition ordering for numeric comparisons
    validateConditionOrder(nodeId, node.next, warnings);
  }
}

/**
 * Validate that condition value type matches question type
 */
function validateConditionType(
  questionType: string,
  condition: Condition
): string | null {
  const { operator, value } = condition;

  switch (questionType) {
    case 'yesNo':
      // yesNo conditions must use string 'yes' or 'no', NOT boolean
      if (typeof value === 'boolean') {
        return `yesNo conditions must use string "yes" or "no", got boolean ${value}`;
      }
      if (typeof value === 'string' && !['yes', 'no'].includes(value)) {
        return `yesNo conditions must use "yes" or "no", got "${value}"`;
      }
      break;

    case 'rating':
    case 'nps':
    case 'slider':
    case 'number':
    case 'percentage':
    case 'likert':
      // Numeric types should use number values for comparison operators
      if (operator && ['greater', 'less', 'greaterOrEqual', 'lessOrEqual'].includes(operator)) {
        if (typeof value !== 'number') {
          return `${questionType} with ${operator} operator should use number value, got ${typeof value}`;
        }
      }
      break;

    case 'choice':
    case 'combobox':
      // Single choice should use string value
      if (operator === 'equals' && typeof value !== 'string') {
        return `${questionType} with equals operator should use string value, got ${typeof value}`;
      }
      break;

    case 'multiChoice':
    case 'multiSelect':
      // Multi-choice typically uses 'contains' or 'in' operators
      if (operator === 'equals' && typeof value !== 'string') {
        return `${questionType} with equals operator should use string value, got ${typeof value}`;
      }
      break;
  }

  return null;
}

/**
 * Validate ordering of numeric conditions
 * For greaterOrEqual conditions, higher values should come first
 */
function validateConditionOrder(
  nodeId: string,
  nextSteps: NextStep[],
  warnings: ExtendedValidationError[]
): void {
  const numericConditions = nextSteps
    .filter(n => n.condition && n.condition.operator && ['greaterOrEqual', 'greater'].includes(n.condition.operator))
    .map(n => ({
      value: typeof n.condition!.value === 'number' ? n.condition!.value : NaN,
      nodeId: n.nodeId,
    }))
    .filter(c => !isNaN(c.value));

  if (numericConditions.length < 2) return;

  // Check if values are in descending order
  for (let i = 1; i < numericConditions.length; i++) {
    const current = numericConditions[i];
    const previous = numericConditions[i - 1];
    if (current && previous && current.value > previous.value) {
      warnings.push({
        code: 'INVALID_CONDITION_ORDER',
        nodeId,
        message: `Node "${nodeId}": greaterOrEqual conditions should be ordered from highest to lowest value for correct evaluation`,
        severity: 'warning',
      });
      break;
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Quick validation check - returns true if survey is valid
 */
export function isValidSurvey(survey: GraphSurvey): boolean {
  return validateSurvey(survey).isValid;
}

/**
 * Get all validation messages as strings
 */
export function getValidationMessages(result: ExtendedValidationResult): string[] {
  return [
    ...result.errors.map(e => `ERROR: ${e.message}`),
    ...result.warnings.map(w => `WARNING: ${w.message}`),
  ];
}

/**
 * Validate multiple surveys and return summary
 */
export function validateSurveys(
  surveys: { name: string; survey: GraphSurvey }[]
): { name: string; result: ExtendedValidationResult }[] {
  return surveys.map(({ name, survey }) => ({
    name,
    result: validateSurvey(survey),
  }));
}

/**
 * Print validation results to console
 */
export function printValidationResults(
  results: { name: string; result: ExtendedValidationResult }[]
): void {
  for (const { name, result } of results) {
    const status = result.isValid ? '✅' : '❌';
    console.log(`${status} ${name}`);

    if (result.errors.length > 0) {
      console.log('  Errors:');
      result.errors.forEach(e => console.log(`    - ${e.message}`));
    }

    if (result.warnings.length > 0) {
      console.log('  Warnings:');
      result.warnings.forEach(w => console.log(`    - ${w.message}`));
    }
  }
}

// ============================================================================
// Sample Validation Runner
// ============================================================================

/**
 * Validate all sample surveys
 * Import and run this to validate all samples
 */
export async function validateAllSamples(): Promise<{
  passed: number;
  failed: number;
  results: { name: string; result: ExtendedValidationResult }[];
}> {
  // Dynamic import to avoid circular dependency
  const { allSamples } = await import('./samples');

  const results = allSamples.map(sample => ({
    name: sample.name,
    result: validateSurvey(sample.survey),
  }));

  const passed = results.filter(r => r.result.isValid).length;
  const failed = results.filter(r => !r.result.isValid).length;

  return { passed, failed, results };
}
