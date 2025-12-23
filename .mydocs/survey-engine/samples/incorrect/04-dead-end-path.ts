import type { GraphSurvey } from '../../types';

export const deadEndPathSurvey: GraphSurvey = {
  id: 'dead-end-path',
  title: 'Dead End Path',
  description: 'Invalid: one branch leads to dead end',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Welcome', message: 'Hi' },
      next: [{ nodeId: 'branch' }],
    },
    branch: {
      id: 'branch',
      type: 'question',
      content: {
        question: 'Choose path?',
        type: 'choice',
        required: true,
        options: [
          { id: 'a', label: 'Path A', value: 'a' },
          { id: 'b', label: 'Path B', value: 'b' },
        ],
      },
      next: [
        { condition: { operator: 'equals', value: 'a' }, nodeId: 'end' },
        { condition: { operator: 'equals', value: 'b' }, nodeId: 'deadEnd' },
      ],
    },
    deadEnd: {
      id: 'deadEnd',
      type: 'question',
      content: { question: 'Stuck here!', type: 'text', required: true },
      next: [], // Cannot reach end
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Done', message: 'Bye' },
      next: [],
    },
  },
};
