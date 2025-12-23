import type { GraphSurvey } from '../../types';

export const wrongStartTypeSurvey: GraphSurvey = {
  id: 'wrong-start-type',
  title: 'Wrong Start Type',
  description: 'Invalid: startNodeId points to a question node, not start node',
  startNodeId: 'q1', // Points to question, not start!
  nodes: {
    q1: {
      id: 'q1',
      type: 'question', // Should be 'start'
      content: { question: 'Name?', type: 'text', required: true },
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
