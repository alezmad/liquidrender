import type { GraphSurvey } from '../../types';

export const wrongYesNoConditionSurvey: GraphSurvey = {
  id: 'wrong-yesno-condition',
  title: 'Wrong YesNo Condition',
  description: 'Invalid: yesNo condition uses boolean instead of string',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Welcome', message: 'Hi' },
      next: [{ nodeId: 'q1' }],
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: { question: 'Continue?', type: 'yesNo', required: true },
      next: [
        // WRONG! Should use 'yes' string, not true boolean
        { condition: { operator: 'equals', value: true as unknown as string }, nodeId: 'q2' },
        { nodeId: 'end' },
      ],
    },
    q2: {
      id: 'q2',
      type: 'question',
      content: { question: 'More info?', type: 'text', required: false },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Done', message: 'Bye' },
      next: [],
    },
  },
};
