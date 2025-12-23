import type { GraphSurvey } from '../../types';

export const missingEndNodeSurvey: GraphSurvey = {
  id: 'missing-end-node',
  title: 'Missing End Node',
  description: 'Invalid: no end node exists',
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
      content: { question: 'Name?', type: 'text', required: true },
      next: [], // Goes nowhere - no end node
    },
  },
};
