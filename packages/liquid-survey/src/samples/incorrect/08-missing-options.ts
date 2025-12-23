import type { GraphSurvey } from '../../types';

export const missingOptionsSurvey: GraphSurvey = {
  id: 'missing-options',
  title: 'Missing Options',
  description: 'Invalid: choice question has no options',
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
      content: {
        question: 'Pick one?',
        type: 'choice',
        required: true,
        options: [], // Empty options array!
      },
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
