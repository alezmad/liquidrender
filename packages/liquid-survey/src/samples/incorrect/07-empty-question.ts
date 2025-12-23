import type { GraphSurvey } from '../../types';

export const emptyQuestionSurvey: GraphSurvey = {
  id: 'empty-question',
  title: 'Empty Question',
  description: 'Invalid: question has empty text',
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
      content: { question: '', type: 'text', required: true }, // Empty question!
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
