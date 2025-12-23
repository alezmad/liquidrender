import type { GraphSurvey } from '../types';

/**
 * Event registration with light branching
 * Tests: text, email, phone, choice, multiChoice, date, yesNo, conditions
 */
export const eventRegistrationSurvey: GraphSurvey = {
  id: 'event-registration',
  title: 'Event Registration',
  description: 'Register for our upcoming conference',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: {
        message: 'Welcome to TechConf 2025! Register now to secure your spot. The event runs March 15-17, 2025.',
        title: 'TechConf 2025 Registration'
      },
      next: [{ nodeId: 'q_name' }]
    },
    q_name: {
      id: 'q_name',
      type: 'question',
      content: {
        question: 'Full name',
        type: 'text',
        required: true,
        placeholder: 'Enter your full name'
      },
      next: [{ nodeId: 'q_email' }]
    },
    q_email: {
      id: 'q_email',
      type: 'question',
      content: {
        question: 'Email address',
        type: 'email',
        required: true,
        emailValidation: 'strict',
        placeholder: 'your@email.com'
      },
      next: [{ nodeId: 'q_phone' }]
    },
    q_phone: {
      id: 'q_phone',
      type: 'question',
      content: {
        question: 'Phone number',
        type: 'phone',
        required: false,
        countryCode: 'US',
        placeholder: '(555) 123-4567'
      },
      next: [{ nodeId: 'q_ticket' }]
    },
    q_ticket: {
      id: 'q_ticket',
      type: 'question',
      content: {
        question: 'Select your ticket type',
        type: 'choice',
        required: true,
        options: [
          { id: 'general', label: 'General Admission - $99', value: 'general' },
          { id: 'vip', label: 'VIP Pass - $249 (includes lunch & networking)', value: 'vip' },
          { id: 'student', label: 'Student - $49 (ID required)', value: 'student' }
        ]
      },
      next: [
        { condition: { operator: 'equals', value: 'vip' }, nodeId: 'q_dietary' },
        { nodeId: 'q_date' }
      ]
    },
    q_dietary: {
      id: 'q_dietary',
      type: 'question',
      content: {
        question: 'Dietary preferences (VIP lunch)',
        type: 'multiChoice',
        required: false,
        options: [
          { id: 'veg', label: 'Vegetarian', value: 'vegetarian' },
          { id: 'vegan', label: 'Vegan', value: 'vegan' },
          { id: 'gf', label: 'Gluten-free', value: 'gluten_free' },
          { id: 'none', label: 'No restrictions', value: 'none' }
        ]
      },
      next: [{ nodeId: 'q_date' }]
    },
    q_date: {
      id: 'q_date',
      type: 'question',
      content: {
        question: 'Which day will you attend?',
        type: 'date',
        required: true,
        minDate: '2025-03-15',
        maxDate: '2025-03-17',
        placeholder: 'Select date'
      },
      next: [{ nodeId: 'q_parking' }]
    },
    q_parking: {
      id: 'q_parking',
      type: 'question',
      content: {
        question: 'Do you need parking?',
        type: 'yesNo',
        required: true
      },
      next: [
        { condition: { operator: 'equals', value: 'yes' }, nodeId: 'q_vehicle' },
        { nodeId: 'q_special' }
      ]
    },
    q_vehicle: {
      id: 'q_vehicle',
      type: 'question',
      content: {
        question: 'Vehicle information',
        type: 'text',
        required: true,
        placeholder: 'Make, model, license plate'
      },
      next: [{ nodeId: 'q_special' }]
    },
    q_special: {
      id: 'q_special',
      type: 'question',
      content: {
        question: 'Any special requirements or accessibility needs?',
        type: 'text',
        required: false,
        placeholder: 'Let us know how we can help (optional)'
      },
      next: [{ nodeId: 'end' }]
    },
    end: {
      id: 'end',
      type: 'end',
      content: {
        message: 'Registration complete! Check your email for confirmation and ticket details.',
        title: 'See You at TechConf 2025!'
      },
      next: []
    }
  }
};
