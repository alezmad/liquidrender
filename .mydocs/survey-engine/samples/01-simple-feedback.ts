import type { GraphSurvey } from '../types';

export const simpleFeedbackSurvey: GraphSurvey = {
  id: 'simple-feedback-survey',
  title: 'Customer Feedback Survey',
  description: 'A simple 3-question feedback survey with no branching logic',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: {
        title: 'Welcome!',
        message: 'Thank you for taking the time to share your feedback with us. This survey will only take a minute.',
      },
      next: [{ nodeId: 'q1' }],
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: {
        question: "What's your name?",
        type: 'text',
        required: true,
        placeholder: 'Enter your name',
      },
      next: [{ nodeId: 'q2' }],
    },
    q2: {
      id: 'q2',
      type: 'question',
      content: {
        question: 'How would you rate our service?',
        type: 'rating',
        required: true,
        min: 1,
        max: 5,
      },
      next: [{ nodeId: 'q3' }],
    },
    q3: {
      id: 'q3',
      type: 'question',
      content: {
        question: 'Any additional comments?',
        type: 'text',
        required: false,
        placeholder: 'Share your thoughts...',
      },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: {
        title: 'Thank You!',
        message: 'We appreciate your feedback. Your responses help us improve our service.',
      },
      next: [],
    },
  },
};
