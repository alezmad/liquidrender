import type { GraphSurvey } from '../../types';

export const isolatedLoopSurvey: GraphSurvey = {
  id: 'isolated-loop',
  title: 'Isolated Loop',
  description: 'Invalid: nodes loopA and loopB form an isolated cycle',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Welcome', message: 'Hi' },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Done', message: 'Bye' },
      next: [],
    },
    // Isolated loop - not connected to main path
    loopA: {
      id: 'loopA',
      type: 'question',
      content: { question: 'Loop A?', type: 'text', required: true },
      next: [{ nodeId: 'loopB' }],
    },
    loopB: {
      id: 'loopB',
      type: 'question',
      content: { question: 'Loop B?', type: 'text', required: true },
      next: [{ nodeId: 'loopA' }],
    },
  },
};
