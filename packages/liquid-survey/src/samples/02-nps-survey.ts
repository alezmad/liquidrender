import type { GraphSurvey } from '../types';

export const npsSurvey: GraphSurvey = {
  id: 'nps-survey',
  title: 'Net Promoter Score Survey',
  description: 'Simple NPS survey with branching logic based on score',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: {
        title: 'Welcome!',
        message: 'Thank you for taking the time to share your feedback with us. This will only take a minute.',
      },
      next: [{ nodeId: 'nps-question' }],
    },
    'nps-question': {
      id: 'nps-question',
      type: 'question',
      content: {
        question: 'How likely are you to recommend us to a friend or colleague?',
        description: 'Please rate on a scale from 0 (not at all likely) to 10 (extremely likely)',
        type: 'nps',
        required: true,
        min: 0,
        max: 10,
      },
      next: [
        {
          condition: {
            operator: 'greaterOrEqual',
            value: 9,
          },
          nodeId: 'promoter-question',
        },
        {
          condition: {
            operator: 'greaterOrEqual',
            value: 7,
          },
          nodeId: 'passive-question',
        },
        {
          condition: {
            operator: 'lessOrEqual',
            value: 6,
          },
          nodeId: 'detractor-question',
        },
      ],
    },
    'promoter-question': {
      id: 'promoter-question',
      type: 'question',
      content: {
        question: 'What do you love most about our product or service?',
        description: 'We\'d love to know what we\'re doing right!',
        type: 'text',
        required: false,
        placeholder: 'Share what you appreciate most...',
      },
      next: [{ nodeId: 'end' }],
    },
    'passive-question': {
      id: 'passive-question',
      type: 'question',
      content: {
        question: 'What would make you rate us higher?',
        description: 'Help us understand what we could improve',
        type: 'text',
        required: false,
        placeholder: 'Tell us what would make a difference...',
      },
      next: [{ nodeId: 'end' }],
    },
    'detractor-question': {
      id: 'detractor-question',
      type: 'question',
      content: {
        question: 'What went wrong?',
        description: 'We\'re sorry to hear you had a poor experience. Please help us understand what happened.',
        type: 'text',
        required: false,
        placeholder: 'Share your concerns...',
      },
      next: [{ nodeId: 'detractor-issues' }],
    },
    'detractor-issues': {
      id: 'detractor-issues',
      type: 'question',
      content: {
        question: 'Which of the following issues did you experience?',
        description: 'Select all that apply',
        type: 'multiChoice',
        required: false,
        options: [
          {
            id: 'issue-1',
            label: 'Poor customer service',
            value: 'customer-service',
          },
          {
            id: 'issue-2',
            label: 'Product quality issues',
            value: 'product-quality',
          },
          {
            id: 'issue-3',
            label: 'Pricing concerns',
            value: 'pricing',
          },
          {
            id: 'issue-4',
            label: 'Technical problems',
            value: 'technical',
          },
          {
            id: 'issue-5',
            label: 'Delivery or shipping issues',
            value: 'delivery',
          },
          {
            id: 'issue-6',
            label: 'Other',
            value: 'other',
          },
        ],
      },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: {
        title: 'Thank you!',
        message: 'We appreciate you taking the time to share your feedback. Your input helps us improve and serve you better.',
      },
      next: [],
    },
  },
};
