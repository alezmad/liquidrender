// Incorrect survey samples - for testing validator error detection
export { missingStartNodeSurvey } from './01-missing-start-node';
export { missingEndNodeSurvey } from './02-missing-end-node';
export { isolatedLoopSurvey } from './03-isolated-loop';
export { deadEndPathSurvey } from './04-dead-end-path';
export { invalidNextReferenceSurvey } from './05-invalid-next-reference';
export { orphanNodeSurvey } from './06-orphan-node';
export { emptyQuestionSurvey } from './07-empty-question';
export { missingOptionsSurvey } from './08-missing-options';
export { wrongYesNoConditionSurvey } from './09-wrong-yesno-condition';
export { wrongStartTypeSurvey } from './10-wrong-start-type';

import { missingStartNodeSurvey } from './01-missing-start-node';
import { missingEndNodeSurvey } from './02-missing-end-node';
import { isolatedLoopSurvey } from './03-isolated-loop';
import { deadEndPathSurvey } from './04-dead-end-path';
import { invalidNextReferenceSurvey } from './05-invalid-next-reference';
import { orphanNodeSurvey } from './06-orphan-node';
import { emptyQuestionSurvey } from './07-empty-question';
import { missingOptionsSurvey } from './08-missing-options';
import { wrongYesNoConditionSurvey } from './09-wrong-yesno-condition';
import { wrongStartTypeSurvey } from './10-wrong-start-type';

import type { ExtendedValidationErrorCode } from '../../validator';

export const allIncorrectSamples = [
  { name: 'Missing Start Node', expectedError: 'MISSING_START_NODE' as ExtendedValidationErrorCode, survey: missingStartNodeSurvey },
  { name: 'Missing End Node', expectedError: 'MISSING_END_NODE' as ExtendedValidationErrorCode, survey: missingEndNodeSurvey },
  { name: 'Isolated Loop', expectedError: 'UNREACHABLE_NODE' as ExtendedValidationErrorCode, survey: isolatedLoopSurvey },
  { name: 'Dead End Path', expectedError: 'DEAD_END_PATH' as ExtendedValidationErrorCode, survey: deadEndPathSurvey },
  { name: 'Invalid Next Reference', expectedError: 'INVALID_NEXT_REFERENCE' as ExtendedValidationErrorCode, survey: invalidNextReferenceSurvey },
  { name: 'Orphan Node', expectedError: 'ORPHAN_NODE' as ExtendedValidationErrorCode, survey: orphanNodeSurvey },
  { name: 'Empty Question', expectedError: 'EMPTY_QUESTION' as ExtendedValidationErrorCode, survey: emptyQuestionSurvey },
  { name: 'Missing Options', expectedError: 'MISSING_OPTIONS' as ExtendedValidationErrorCode, survey: missingOptionsSurvey },
  { name: 'Wrong YesNo Condition', expectedError: 'CONDITION_TYPE_MISMATCH' as ExtendedValidationErrorCode, survey: wrongYesNoConditionSurvey },
  { name: 'Wrong Start Type', expectedError: 'START_NODE_WRONG_TYPE' as ExtendedValidationErrorCode, survey: wrongStartTypeSurvey },
] as const;
