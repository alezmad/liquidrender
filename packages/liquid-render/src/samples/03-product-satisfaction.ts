import type { GraphSurvey } from '../types';

/**
 * Product satisfaction survey - linear, multiple question types
 * Tests: choice, rating, likert, multiChoice, text
 */
export const productSatisfactionSurvey: GraphSurvey = {
  id: 'product-satisfaction',
  title: 'Product Satisfaction Survey',
  description: 'Help us understand your experience with our product',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: {
        message: 'Thank you for purchasing from us! Please take a moment to share your experience.',
        title: 'Product Feedback'
      },
      next: [{ nodeId: 'q1' }]
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: {
        question: 'Which product did you purchase?',
        type: 'choice',
        required: true,
        options: [
          { id: 'a', label: 'Product A - Basic', value: 'product_a' },
          { id: 'b', label: 'Product B - Standard', value: 'product_b' },
          { id: 'c', label: 'Product C - Premium', value: 'product_c' }
        ]
      },
      next: [{ nodeId: 'q2' }]
    },
    q2: {
      id: 'q2',
      type: 'question',
      content: {
        question: 'Rate the overall quality',
        type: 'rating',
        required: true,
        min: 1,
        max: 5
      },
      next: [{ nodeId: 'q3' }]
    },
    q3: {
      id: 'q3',
      type: 'question',
      content: {
        question: 'Rate the value for money',
        type: 'rating',
        required: true,
        min: 1,
        max: 5
      },
      next: [{ nodeId: 'q4' }]
    },
    q4: {
      id: 'q4',
      type: 'question',
      content: {
        question: 'The product met my expectations',
        type: 'likert',
        required: true,
        likertScale: 5,
        likertLabels: { start: 'Strongly Disagree', end: 'Strongly Agree' }
      },
      next: [{ nodeId: 'q5' }]
    },
    q5: {
      id: 'q5',
      type: 'question',
      content: {
        question: 'What features do you like most?',
        type: 'multiChoice',
        required: true,
        options: [
          { id: 'design', label: 'Design & Aesthetics', value: 'design' },
          { id: 'ease', label: 'Ease of Use', value: 'ease' },
          { id: 'performance', label: 'Performance', value: 'performance' },
          { id: 'durability', label: 'Durability', value: 'durability' },
          { id: 'price', label: 'Price Point', value: 'price' }
        ],
        maxSelections: 3
      },
      next: [{ nodeId: 'q6' }]
    },
    q6: {
      id: 'q6',
      type: 'question',
      content: {
        question: 'Any suggestions for improvement?',
        type: 'text',
        required: false,
        placeholder: 'Share your ideas (optional)'
      },
      next: [{ nodeId: 'end' }]
    },
    end: {
      id: 'end',
      type: 'end',
      content: {
        message: 'Thank you for your valuable feedback!',
        title: 'Survey Complete'
      },
      next: []
    }
  }
};
