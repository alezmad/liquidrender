import type { GraphSurvey } from '../../types';

export const invalidNextReferenceSurvey: GraphSurvey = {
  id: 'invalid-next-reference',
  title: 'Invalid Next Reference',
  description: 'Invalid: node references non-existent target',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Welcome', message: 'Hi' },
      next: [{ nodeId: 'nonexistent' }], // This node doesn't exist
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Done', message: 'Bye' },
      next: [],
    },
  },
};
