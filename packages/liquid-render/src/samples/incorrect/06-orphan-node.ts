import type { GraphSurvey } from '../../types';

export const orphanNodeSurvey: GraphSurvey = {
  id: 'orphan-node',
  title: 'Orphan Node',
  description: 'Invalid: orphan node has no incoming connections',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Welcome', message: 'Hi' },
      next: [{ nodeId: 'end' }], // Skips orphan, goes straight to end
    },
    orphan: {
      id: 'orphan',
      type: 'question',
      content: { question: 'Nobody points to me!', type: 'text', required: true },
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
