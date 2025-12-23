import type { GraphSurvey } from '../../types';

export const missingStartNodeSurvey: GraphSurvey = {
  id: 'missing-start-node',
  title: 'Missing Start Node',
  description: 'Invalid: startNodeId references non-existent node',
  startNodeId: 'nonexistent', // This doesn't exist in nodes
  nodes: {
    // Only has end node, no start
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Done', message: 'Bye' },
      next: [],
    },
  },
};
