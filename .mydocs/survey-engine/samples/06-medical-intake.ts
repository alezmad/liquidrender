import type { GraphSurvey } from '../types';

export const medicalIntakeSurvey: GraphSurvey = {
  id: 'medical-intake-survey',
  title: 'Medical Intake Survey',
  description: 'Patient information and medical history intake form',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: {
        title: 'Welcome to Medical Intake',
        message: 'Please complete this medical intake form. Your information is confidential and will be used solely for medical purposes. All data is protected under HIPAA regulations.',
      },
      next: [{ nodeId: 'q1' }],
    },

    q1: {
      id: 'q1',
      type: 'question',
      content: {
        question: 'Full name',
        type: 'text',
        required: true,
        placeholder: 'Enter your full legal name',
        validation: {
          minLength: 2,
          errorMessage: 'Please enter your full name',
        },
      },
      next: [{ nodeId: 'q2' }],
    },

    q2: {
      id: 'q2',
      type: 'question',
      content: {
        question: 'Date of birth',
        type: 'date',
        required: true,
        placeholder: 'MM/DD/YYYY',
        dateFormat: 'MM/dd/yyyy',
        maxDate: new Date().toISOString(),
      },
      next: [{ nodeId: 'q3' }],
    },

    q3: {
      id: 'q3',
      type: 'question',
      content: {
        question: 'Gender',
        type: 'choice',
        required: true,
        options: [
          { id: 'male', label: 'Male', value: 'male' },
          { id: 'female', label: 'Female', value: 'female' },
          { id: 'other', label: 'Other', value: 'other' },
          { id: 'prefer-not-to-say', label: 'Prefer not to say', value: 'prefer-not-to-say' },
        ],
      },
      next: [{ nodeId: 'q4' }],
    },

    q4: {
      id: 'q4',
      type: 'question',
      content: {
        question: 'Contact number',
        type: 'phone',
        required: true,
        countryCode: 'US',
        placeholder: '(555) 123-4567',
      },
      next: [{ nodeId: 'q5' }],
    },

    q5: {
      id: 'q5',
      type: 'question',
      content: {
        question: 'Do you have any allergies?',
        type: 'yesNo',
        required: true,
      },
      next: [
        {
          condition: { operator: 'equals', value: 'yes' },
          nodeId: 'q5a',
        },
        {
          nodeId: 'q6',
        },
      ],
    },

    q5a: {
      id: 'q5a',
      type: 'question',
      content: {
        question: 'Select allergies',
        description: 'Please select all that apply',
        type: 'multiSelect',
        required: true,
        options: [
          { id: 'penicillin', label: 'Penicillin', value: 'penicillin' },
          { id: 'latex', label: 'Latex', value: 'latex' },
          { id: 'peanuts', label: 'Peanuts', value: 'peanuts' },
          { id: 'shellfish', label: 'Shellfish', value: 'shellfish' },
          { id: 'other', label: 'Other', value: 'other' },
        ],
        searchable: true,
      },
      next: [{ nodeId: 'q6' }],
    },

    q6: {
      id: 'q6',
      type: 'question',
      content: {
        question: 'Currently on medication?',
        type: 'yesNo',
        required: true,
      },
      next: [
        {
          condition: { operator: 'equals', value: 'yes' },
          nodeId: 'q6a',
        },
        {
          nodeId: 'q7',
        },
      ],
    },

    q6a: {
      id: 'q6a',
      type: 'question',
      content: {
        question: 'List medications',
        description: 'Please list all current medications including dosage',
        type: 'text',
        required: true,
        placeholder: 'e.g., Aspirin 81mg daily, Lisinopril 10mg daily',
        validation: {
          minLength: 3,
          errorMessage: 'Please provide medication details',
        },
      },
      next: [{ nodeId: 'q7' }],
    },

    q7: {
      id: 'q7',
      type: 'question',
      content: {
        question: 'Reason for visit',
        description: 'Select all that apply',
        type: 'multiChoice',
        required: true,
        options: [
          { id: 'checkup', label: 'Checkup', value: 'checkup' },
          { id: 'follow-up', label: 'Follow-up', value: 'follow-up' },
          { id: 'new-symptoms', label: 'New symptoms', value: 'new-symptoms' },
          { id: 'other', label: 'Other', value: 'other' },
        ],
      },
      next: [{ nodeId: 'q8' }],
    },

    q8: {
      id: 'q8',
      type: 'question',
      content: {
        question: 'Additional notes',
        description: 'Any additional information we should know?',
        type: 'text',
        required: false,
        placeholder: 'Optional: Provide any additional details about your visit or medical history',
      },
      next: [{ nodeId: 'end' }],
    },

    end: {
      id: 'end',
      type: 'end',
      content: {
        title: 'Thank You',
        message: 'Your medical intake form has been submitted successfully. A healthcare professional will review your information and contact you shortly.',
      },
      next: [],
    },
  },
};
