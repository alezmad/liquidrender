import type { GraphSurvey } from '../types';

export const marketResearchSurvey: GraphSurvey = {
  id: 'market-research-survey',
  title: 'Market Research Survey',
  description: 'Comprehensive market research with dynamic branching based on product usage',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: {
        title: 'Welcome to Our Market Research Survey',
        message: 'Thank you for taking the time to share your thoughts with us. Your feedback helps us improve our products and services.',
      },
      next: [{ nodeId: 'age-group' }],
    },

    'age-group': {
      id: 'age-group',
      type: 'question',
      content: {
        question: 'What is your age group?',
        type: 'choice',
        required: true,
        options: [
          { id: 'age-18-24', label: '18-24', value: '18-24' },
          { id: 'age-25-34', label: '25-34', value: '25-34' },
          { id: 'age-35-44', label: '35-44', value: '35-44' },
          { id: 'age-45-54', label: '45-54', value: '45-54' },
          { id: 'age-55-plus', label: '55+', value: '55+' },
        ],
      },
      next: [{ nodeId: 'product-usage' }],
    },

    'product-usage': {
      id: 'product-usage',
      type: 'question',
      content: {
        question: 'Do you use our product?',
        type: 'choice',
        required: true,
        options: [
          { id: 'use-regularly', label: 'Yes regularly', value: 'regularly' },
          { id: 'use-occasionally', label: 'Yes occasionally', value: 'occasionally' },
          { id: 'aware-not-used', label: 'No but aware', value: 'aware' },
          { id: 'never-heard', label: 'Never heard of it', value: 'never' },
        ],
      },
      next: [
        {
          condition: { operator: 'equals', value: 'regularly' },
          nodeId: 'satisfaction',
        },
        {
          condition: { operator: 'equals', value: 'occasionally' },
          nodeId: 'satisfaction',
        },
        {
          condition: { operator: 'equals', value: 'aware' },
          nodeId: 'why-not-tried',
        },
        {
          condition: { operator: 'equals', value: 'never' },
          nodeId: 'product-explanation',
        },
      ],
    },

    // Branch 1: Active users (regularly or occasionally)
    satisfaction: {
      id: 'satisfaction',
      type: 'question',
      content: {
        question: 'How satisfied are you with our product?',
        description: 'Please rate your overall satisfaction',
        type: 'rating',
        required: true,
        min: 1,
        max: 5,
      },
      next: [{ nodeId: 'features-used' }],
    },

    'features-used': {
      id: 'features-used',
      type: 'question',
      content: {
        question: 'Which features do you use?',
        description: 'Select all that apply',
        type: 'multiChoice',
        required: false,
        options: [
          { id: 'feature-analytics', label: 'Analytics Dashboard', value: 'analytics' },
          { id: 'feature-reports', label: 'Custom Reports', value: 'reports' },
          { id: 'feature-integrations', label: 'Third-party Integrations', value: 'integrations' },
          { id: 'feature-automation', label: 'Workflow Automation', value: 'automation' },
          { id: 'feature-collaboration', label: 'Team Collaboration', value: 'collaboration' },
          { id: 'feature-mobile', label: 'Mobile App', value: 'mobile' },
        ],
      },
      next: [{ nodeId: 'price-importance' }],
    },

    // Branch 2: Aware but haven't tried
    'why-not-tried': {
      id: 'why-not-tried',
      type: 'question',
      content: {
        question: "Why haven't you tried our product?",
        type: 'choice',
        required: true,
        options: [
          { id: 'reason-price', label: 'Price', value: 'price' },
          { id: 'reason-features', label: 'Features', value: 'features' },
          { id: 'reason-competition', label: 'Competition', value: 'competition' },
          { id: 'reason-other', label: 'Other', value: 'other' },
        ],
      },
      next: [{ nodeId: 'price-importance' }],
    },

    // Branch 3: Never heard of it
    'product-explanation': {
      id: 'product-explanation',
      type: 'message',
      content: {
        title: 'About Our Product',
        message: 'Our product is a comprehensive business intelligence platform that helps companies make data-driven decisions. It offers analytics, reporting, automation, and collaboration features designed to streamline your workflow and improve productivity.',
      },
      next: [{ nodeId: 'interested-trying' }],
    },

    'interested-trying': {
      id: 'interested-trying',
      type: 'question',
      content: {
        question: 'Are you interested in trying our product?',
        type: 'yesNo',
        required: true,
      },
      next: [{ nodeId: 'price-importance' }],
    },

    // Common questions (all paths merge here)
    'price-importance': {
      id: 'price-importance',
      type: 'question',
      content: {
        question: 'How important is price when choosing a solution like ours?',
        description: 'Move the slider from 0 (not important) to 100 (very important)',
        type: 'slider',
        required: true,
        sliderMin: 0,
        sliderMax: 100,
        sliderStep: 1,
        sliderShowValue: true,
      },
      next: [{ nodeId: 'feedback' }],
    },

    feedback: {
      id: 'feedback',
      type: 'question',
      content: {
        question: 'Do you have any additional feedback or suggestions?',
        description: 'Your insights are valuable to us',
        type: 'text',
        required: false,
        placeholder: 'Share your thoughts here...',
      },
      next: [{ nodeId: 'end' }],
    },

    end: {
      id: 'end',
      type: 'end',
      content: {
        title: 'Thank You!',
        message: 'We appreciate your time and feedback. Your responses will help us improve our products and services.',
      },
      next: [],
    },
  },
};
