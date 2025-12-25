// Debug complex survey
import { compile, parse, roundtrip } from '../packages/liquid-render/src/compiler';
import type { GraphSurvey } from '../packages/liquid-render/src/types';

function opt(label: string, value?: string): { id: string; label: string; value: string } {
  const v = value || label.toLowerCase().replace(/\s+/g, '-');
  return { id: `opt_${v}`, label, value: v };
}

const complexSurvey: GraphSurvey = {
  id: 'tcs-20-complex',
  title: 'Customer Journey',
  description: 'Complex multi-path survey',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Customer Survey', message: 'Help us understand your journey' },
      next: [{ nodeId: 'q_type' }],
    },
    q_type: {
      id: 'q_type',
      type: 'question',
      content: {
        question: 'Are you a new or existing customer?',
        type: 'choice',
        required: true,
        options: [opt('New Customer', 'new'), opt('Existing Customer', 'existing')],
      },
      next: [
        { nodeId: 'q_new_source', condition: { operator: 'equals', value: 'new' } },
        { nodeId: 'q_existing_satisfaction', condition: { operator: 'equals', value: 'existing' } },
      ],
    },
    q_new_source: {
      id: 'q_new_source',
      type: 'question',
      content: {
        question: 'How did you hear about us?',
        type: 'choice',
        required: true,
        options: [
          opt('Search Engine', 'search'),
          opt('Social Media', 'social'),
          opt('Friend Referral', 'referral'),
          opt('Advertisement', 'ad'),
        ],
      },
      next: [{ nodeId: 'q_expectations' }],
    },
    q_expectations: {
      id: 'q_expectations',
      type: 'question',
      content: {
        question: 'What are you looking for?',
        type: 'multiChoice',
        required: false,
        options: [opt('Quality Products'), opt('Good Prices'), opt('Fast Shipping'), opt('Customer Support')],
      },
      next: [{ nodeId: 'end_new' }],
    },
    end_new: {
      id: 'end_new',
      type: 'end',
      content: { title: 'Welcome!', message: 'Thank you for choosing us' },
      next: [],
    },
    q_existing_satisfaction: {
      id: 'q_existing_satisfaction',
      type: 'question',
      content: {
        question: 'How satisfied are you?',
        type: 'rating',
        required: true,
        min: 1,
        max: 5,
      },
      next: [
        { nodeId: 'q_existing_positive', condition: { operator: 'greaterOrEqual', value: 4 } },
        { nodeId: 'q_existing_negative', condition: { operator: 'less', value: 4 } },
      ],
    },
    q_existing_positive: {
      id: 'q_existing_positive',
      type: 'question',
      content: { question: 'What do you like most?', type: 'text', required: false },
      next: [{ nodeId: 'q_nps' }],
    },
    q_existing_negative: {
      id: 'q_existing_negative',
      type: 'question',
      content: {
        question: 'What can we improve?',
        type: 'multiSelect',
        required: true,
        options: [opt('Product Quality'), opt('Pricing'), opt('Shipping'), opt('Support'), opt('Website')],
      },
      next: [{ nodeId: 'q_nps' }],
    },
    q_nps: {
      id: 'q_nps',
      type: 'question',
      content: { question: 'Would you recommend us?', type: 'nps', required: true, min: 0, max: 10 },
      next: [{ nodeId: 'end_existing' }],
    },
    end_existing: {
      id: 'end_existing',
      type: 'end',
      content: { title: 'Thank You', message: 'We appreciate your loyalty' },
      next: [],
    },
  },
};

console.log('Original node count:', Object.keys(complexSurvey.nodes).length);
console.log('Original nodes:', Object.keys(complexSurvey.nodes));

// Compile to DSL
const dsl = compile(complexSurvey);
console.log('\n--- DSL ---');
console.log(dsl);

// Parse back
const parsed = parse(dsl);
console.log('\n--- Parsed ---');
console.log('Parsed node count:', Object.keys(parsed.nodes).length);
console.log('Parsed nodes:', Object.keys(parsed.nodes));

// Find extra node
const origNodes = new Set(Object.keys(complexSurvey.nodes));
const parsedNodes = new Set(Object.keys(parsed.nodes));
const extra = [...parsedNodes].filter(n => !origNodes.has(n));
const missing = [...origNodes].filter(n => !parsedNodes.has(n));
console.log('\nExtra nodes:', extra);
console.log('Missing nodes:', missing);
