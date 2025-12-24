/**
 * TCS Runner - Triangulated Compiler Synthesis Validation
 *
 * Validates:
 * 1. JSON Schema → DSL → JSON Schema roundtrip identity
 * 2. Schema completeness for React UI rendering
 * 3. Validation rules pass
 */

import { compile, parse, roundtrip } from '../../compiler';
import { validateSurvey } from '../../utils';
import type { GraphSurvey, QuestionType, SurveyNode, QuestionContent, NextStep } from '../../types';
import { fileURLToPath } from 'url';

// ============================================================================
// Sample Definitions
// ============================================================================

interface TCSResult {
  sampleId: string;
  passed: boolean;
  validationPassed: boolean;
  roundtripPassed: boolean;
  uiReady: boolean;
  errors: string[];
  warnings: string[];
}

// UI Readiness checks - ensure schema has everything needed to render
function checkUIReadiness(survey: GraphSurvey): { ready: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check survey-level requirements
  if (!survey.id) issues.push('Missing survey id');
  if (!survey.title) issues.push('Missing survey title');
  if (!survey.startNodeId) issues.push('Missing startNodeId');
  if (!survey.nodes || Object.keys(survey.nodes).length === 0) {
    issues.push('No nodes defined');
  }

  // Check each node
  for (const [nodeId, node] of Object.entries(survey.nodes)) {
    // All nodes need id and type
    if (!node.id) issues.push(`Node ${nodeId}: missing id`);
    if (!node.type) issues.push(`Node ${nodeId}: missing type`);

    // Check content based on node type
    if (node.type === 'question') {
      const content = node.content as QuestionContent | undefined;
      if (!content) {
        issues.push(`Node ${nodeId}: question node missing content`);
      } else {
        if (!content.question) issues.push(`Node ${nodeId}: missing question text`);
        if (!content.type) issues.push(`Node ${nodeId}: missing question type`);

        // Check options for choice-based questions
        const choiceTypes: QuestionType[] = ['choice', 'multiChoice', 'multiSelect', 'imageChoice'];
        if (choiceTypes.includes(content.type)) {
          if (!content.options || content.options.length === 0) {
            issues.push(`Node ${nodeId}: ${content.type} question missing options`);
          } else {
            // Validate each option
            for (let i = 0; i < content.options.length; i++) {
              const opt = content.options[i]!;
              if (!opt.id) issues.push(`Node ${nodeId}: option ${i} missing id`);
              if (!opt.label) issues.push(`Node ${nodeId}: option ${i} missing label`);
              if (!opt.value) issues.push(`Node ${nodeId}: option ${i} missing value`);
            }
          }
        }

        // Check rankingItems for ranking questions (uses different field name)
        if (content.type === 'ranking') {
          if (!content.rankingItems || content.rankingItems.length === 0) {
            issues.push(`Node ${nodeId}: ranking question missing rankingItems`);
          } else {
            for (let i = 0; i < content.rankingItems.length; i++) {
              const item = content.rankingItems[i]!;
              if (!item.id) issues.push(`Node ${nodeId}: rankingItem ${i} missing id`);
              if (!item.label) issues.push(`Node ${nodeId}: rankingItem ${i} missing label`);
              if (!item.value) issues.push(`Node ${nodeId}: rankingItem ${i} missing value`);
            }
          }
        }

        // Check imageOptions for imageChoice questions
        if (content.type === 'imageChoice') {
          if (!content.imageOptions || content.imageOptions.length === 0) {
            // imageChoice can use either options or imageOptions
            if (!content.options || content.options.length === 0) {
              issues.push(`Node ${nodeId}: imageChoice question missing options or imageOptions`);
            }
          }
        }

        // Check min/max for rating types
        const ratingTypes: QuestionType[] = ['rating', 'nps', 'slider'];
        if (ratingTypes.includes(content.type)) {
          // Rating/NPS should have min/max or reasonable defaults work
        }
      }
    }

    // Check transitions
    if (node.type !== 'end' && (!node.next || node.next.length === 0)) {
      issues.push(`Node ${nodeId}: non-end node missing transitions`);
    }

    // Validate transition targets exist
    if (node.next) {
      for (const transition of node.next) {
        if (transition.nodeId && !survey.nodes[transition.nodeId]) {
          issues.push(`Node ${nodeId}: transition to non-existent node ${transition.nodeId}`);
        }
      }
    }
  }

  return { ready: issues.length === 0, issues };
}

// Run single sample test
function runSampleTest(survey: GraphSurvey): TCSResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validate the survey structure
  const validation = validateSurvey(survey);
  const validationPassed = validation.isValid;
  if (!validationPassed) {
    for (const err of validation.errors) {
      errors.push(`Validation: ${err.message}`);
    }
  }
  for (const warn of validation.warnings) {
    warnings.push(`Validation: ${warn.message}`);
  }

  // 2. Test roundtrip
  let roundtripPassed = false;
  try {
    // Cast via unknown to avoid type incompatibility between types.ts and emitter.ts GraphSurvey
    const result = roundtrip(survey as unknown as Parameters<typeof roundtrip>[0]);
    roundtripPassed = result.isEquivalent;
    if (!roundtripPassed) {
      for (const diff of result.differences) {
        errors.push(`Roundtrip: ${diff}`);
      }
    }
  } catch (e) {
    errors.push(`Roundtrip: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 3. Check UI readiness
  const uiCheck = checkUIReadiness(survey);
  for (const issue of uiCheck.issues) {
    errors.push(`UI: ${issue}`);
  }

  return {
    sampleId: survey.id,
    passed: validationPassed && roundtripPassed && uiCheck.ready,
    validationPassed,
    roundtripPassed,
    uiReady: uiCheck.ready,
    errors,
    warnings,
  };
}

// ============================================================================
// 20 Sample Definitions
// ============================================================================

// Helper to create unique option IDs
let optionCounter = 0;
function opt(label: string, value?: string): { id: string; label: string; value: string } {
  optionCounter++;
  return {
    id: `opt_${optionCounter}`,
    label,
    value: value || label.toLowerCase().replace(/\s+/g, '_'),
  };
}

// Reset counter for clean runs
function resetOptions() {
  optionCounter = 0;
}

export const tcsSamples: GraphSurvey[] = [];

// Sample 1: Simple Text Survey
tcsSamples.push({
  id: 'tcs-01-simple-text',
  title: 'Simple Text Survey',
  description: 'Basic text input questions',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Welcome', message: 'Please answer a few questions' },
      next: [{ nodeId: 'q1' }],
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: { question: 'What is your name?', type: 'text', required: true },
      next: [{ nodeId: 'q2' }],
    },
    q2: {
      id: 'q2',
      type: 'question',
      content: { question: 'What is your email?', type: 'email', required: true },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Thank you', message: 'Your responses have been recorded' },
      next: [],
    },
  },
});

// Sample 2: Rating and NPS
tcsSamples.push({
  id: 'tcs-02-ratings',
  title: 'Rating Survey',
  description: 'Star ratings and NPS questions',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Rate Us', message: 'Help us improve' },
      next: [{ nodeId: 'q1' }],
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: { question: 'Rate our service', type: 'rating', required: true, min: 1, max: 5 },
      next: [{ nodeId: 'q2' }],
    },
    q2: {
      id: 'q2',
      type: 'question',
      content: { question: 'How likely are you to recommend us?', type: 'nps', required: true, min: 0, max: 10 },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Thanks', message: 'Your feedback matters' },
      next: [],
    },
  },
});

// Sample 3: Single Choice with Branching
resetOptions();
tcsSamples.push({
  id: 'tcs-03-choice-branching',
  title: 'Product Feedback',
  description: 'Single choice with conditional branching',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Product Survey', message: 'Tell us about your experience' },
      next: [{ nodeId: 'q1' }],
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: {
        question: 'Are you satisfied?',
        type: 'choice',
        required: true,
        options: [opt('Yes', 'yes'), opt('No', 'no')],
      },
      next: [
        { nodeId: 'q_positive', condition: { operator: 'equals', value: 'yes' } },
        { nodeId: 'q_negative', condition: { operator: 'equals', value: 'no' } },
      ],
    },
    q_positive: {
      id: 'q_positive',
      type: 'question',
      content: { question: 'What did you like most?', type: 'text', required: false },
      next: [{ nodeId: 'end' }],
    },
    q_negative: {
      id: 'q_negative',
      type: 'question',
      content: { question: 'What went wrong?', type: 'textarea', required: true },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Thank you', message: 'We appreciate your feedback' },
      next: [],
    },
  },
});

// Sample 4: Multi-Choice Questions
resetOptions();
tcsSamples.push({
  id: 'tcs-04-multichoice',
  title: 'Feature Preferences',
  description: 'Multi-select and multi-choice questions',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Feature Survey', message: 'Help us prioritize' },
      next: [{ nodeId: 'q1' }],
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: {
        question: 'Which features do you use?',
        type: 'multiChoice',
        required: true,
        options: [opt('Dashboard'), opt('Reports'), opt('Analytics'), opt('Settings')],
      },
      next: [{ nodeId: 'q2' }],
    },
    q2: {
      id: 'q2',
      type: 'question',
      content: {
        question: 'What improvements would you like?',
        type: 'multiSelect',
        required: false,
        searchable: true,
        maxSelections: 3,
        options: [opt('Performance'), opt('UI Design'), opt('Mobile App'), opt('Integrations'), opt('Documentation')],
      },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Thanks', message: 'Your input shapes our roadmap' },
      next: [],
    },
  },
});

// Sample 5: Date and Time Questions
tcsSamples.push({
  id: 'tcs-05-datetime',
  title: 'Event Scheduling',
  description: 'Date and time picker questions',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Schedule Event', message: 'Choose your preferred timing' },
      next: [{ nodeId: 'q1' }],
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: {
        question: 'Preferred date',
        type: 'date',
        required: true,
        minDate: '2025-01-01',
        maxDate: '2025-12-31',
        dateFormat: 'MM/dd/yyyy',
      },
      next: [{ nodeId: 'q2' }],
    },
    q2: {
      id: 'q2',
      type: 'question',
      content: {
        question: 'Preferred time',
        type: 'time',
        required: true,
        timeFormat: '12',
        minTime: '09:00',
        maxTime: '17:00',
      },
      next: [{ nodeId: 'q3' }],
    },
    q3: {
      id: 'q3',
      type: 'question',
      content: {
        question: 'Available date range',
        type: 'dateRange',
        required: false,
        numberOfMonths: 2,
      },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Scheduled', message: 'We will confirm your booking' },
      next: [],
    },
  },
});

// Sample 6: Numeric and Slider Questions
tcsSamples.push({
  id: 'tcs-06-numeric',
  title: 'Quantity Survey',
  description: 'Number inputs and sliders',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Usage Survey', message: 'Tell us about your usage' },
      next: [{ nodeId: 'q1' }],
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: {
        question: 'How many hours per day?',
        type: 'number',
        required: true,
        min: 0,
        max: 24,
        step: 0.5,
        unit: 'hours',
      },
      next: [{ nodeId: 'q2' }],
    },
    q2: {
      id: 'q2',
      type: 'question',
      content: {
        question: 'Rate your experience',
        type: 'slider',
        required: true,
        sliderMin: 0,
        sliderMax: 100,
        sliderStep: 5,
        sliderShowValue: true,
      },
      next: [{ nodeId: 'q3' }],
    },
    q3: {
      id: 'q3',
      type: 'question',
      content: {
        question: 'What percentage of time do you use mobile?',
        type: 'percentage',
        required: false,
        percentageDecimals: 0,
      },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Complete', message: 'Thank you for the data' },
      next: [],
    },
  },
});

// Sample 7: Likert Scale Survey
tcsSamples.push({
  id: 'tcs-07-likert',
  title: 'Employee Satisfaction',
  description: 'Likert scale questions',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Satisfaction Survey', message: 'Rate your work environment' },
      next: [{ nodeId: 'q1' }],
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: {
        question: 'I feel valued at work',
        type: 'likert',
        required: true,
        likertScale: 5,
        likertLabels: { start: 'Strongly Disagree', end: 'Strongly Agree' },
      },
      next: [{ nodeId: 'q2' }],
    },
    q2: {
      id: 'q2',
      type: 'question',
      content: {
        question: 'I have opportunities for growth',
        type: 'likert',
        required: true,
        likertScale: 7,
        likertLabels: { start: 'Completely Disagree', end: 'Completely Agree' },
      },
      next: [{ nodeId: 'q3' }],
    },
    q3: {
      id: 'q3',
      type: 'question',
      content: {
        question: 'My manager supports me',
        type: 'likert',
        required: true,
        likertScale: 5,
        likertLabels: { start: 'Never', end: 'Always' },
      },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Thank You', message: 'Your feedback is confidential' },
      next: [],
    },
  },
});

// Sample 8: Yes/No Questions with Branching
tcsSamples.push({
  id: 'tcs-08-yesno',
  title: 'Eligibility Check',
  description: 'Yes/No questions with branching',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Eligibility', message: 'Check if you qualify' },
      next: [{ nodeId: 'q1' }],
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: { question: 'Are you over 18?', type: 'yesNo', required: true },
      next: [
        { nodeId: 'q2', condition: { operator: 'equals', value: 'yes' } },
        { nodeId: 'ineligible', condition: { operator: 'equals', value: 'no' } },
      ],
    },
    q2: {
      id: 'q2',
      type: 'question',
      content: { question: 'Do you have a valid ID?', type: 'yesNo', required: true },
      next: [
        { nodeId: 'eligible', condition: { operator: 'equals', value: 'yes' } },
        { nodeId: 'ineligible', condition: { operator: 'equals', value: 'no' } },
      ],
    },
    eligible: {
      id: 'eligible',
      type: 'end',
      content: { title: 'Eligible', message: 'You qualify for the program' },
      next: [],
    },
    ineligible: {
      id: 'ineligible',
      type: 'end',
      content: { title: 'Not Eligible', message: 'Sorry, you do not qualify' },
      next: [],
    },
  },
});

// Sample 9: Contact Information
tcsSamples.push({
  id: 'tcs-09-contact',
  title: 'Contact Form',
  description: 'Email, phone, URL inputs',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Contact Info', message: 'Please provide your details' },
      next: [{ nodeId: 'q1' }],
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: {
        question: 'Email address',
        type: 'email',
        required: true,
        emailValidation: 'strict',
        placeholder: 'you@example.com',
      },
      next: [{ nodeId: 'q2' }],
    },
    q2: {
      id: 'q2',
      type: 'question',
      content: {
        question: 'Phone number',
        type: 'phone',
        required: false,
        countryCode: 'US',
        placeholder: '(555) 123-4567',
      },
      next: [{ nodeId: 'q3' }],
    },
    q3: {
      id: 'q3',
      type: 'question',
      content: {
        question: 'Website URL',
        type: 'url',
        required: false,
        urlProtocol: 'https',
        placeholder: 'https://example.com',
      },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Received', message: 'We will be in touch' },
      next: [],
    },
  },
});

// Sample 10: File Upload and Signature
tcsSamples.push({
  id: 'tcs-10-uploads',
  title: 'Document Submission',
  description: 'File upload and signature',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Document Upload', message: 'Please submit required documents' },
      next: [{ nodeId: 'q1' }],
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: {
        question: 'Upload your resume',
        type: 'fileDropzone',
        required: true,
        accept: 'application/pdf,.doc,.docx',
        maxFileSize: 5242880,
        multiple: false,
      },
      next: [{ nodeId: 'q2' }],
    },
    q2: {
      id: 'q2',
      type: 'question',
      content: {
        question: 'Your signature',
        type: 'signature',
        required: true,
      },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Submitted', message: 'Documents received successfully' },
      next: [],
    },
  },
});

// Sample 11: Location Questions
tcsSamples.push({
  id: 'tcs-11-location',
  title: 'Location Survey',
  description: 'Geolocation and address',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Location', message: 'Share your location' },
      next: [{ nodeId: 'q1' }],
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: {
        question: 'Your address',
        type: 'address',
        required: true,
        addressFields: ['street', 'city', 'state', 'zip', 'country'],
        addressDefaultCountry: 'US',
        addressAutocomplete: true,
      },
      next: [{ nodeId: 'q2' }],
    },
    q2: {
      id: 'q2',
      type: 'question',
      content: {
        question: 'Mark your location on map',
        type: 'geolocation',
        required: false,
        geolocationDefaultZoom: 12,
        geolocationEnableUserLocation: true,
      },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Saved', message: 'Location recorded' },
      next: [],
    },
  },
});

// Sample 12: Ranking Question
resetOptions();
tcsSamples.push({
  id: 'tcs-12-ranking',
  title: 'Priority Ranking',
  description: 'Drag and drop ranking',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Rank Priorities', message: 'Order by importance' },
      next: [{ nodeId: 'q1' }],
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: {
        question: 'Rank these features by importance',
        type: 'ranking',
        required: true,
        rankingItems: [
          { id: 'r1', label: 'Speed', value: 'speed' },
          { id: 'r2', label: 'Reliability', value: 'reliability' },
          { id: 'r3', label: 'Price', value: 'price' },
          { id: 'r4', label: 'Support', value: 'support' },
        ],
      },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Ranked', message: 'Thank you for your priorities' },
      next: [],
    },
  },
});

// Sample 13: Complex Branching with NPS
resetOptions();
tcsSamples.push({
  id: 'tcs-13-nps-branching',
  title: 'NPS with Follow-up',
  description: 'NPS score branching to different paths',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Quick Survey', message: 'Just 2 minutes' },
      next: [{ nodeId: 'nps' }],
    },
    nps: {
      id: 'nps',
      type: 'question',
      content: {
        question: 'How likely are you to recommend us?',
        type: 'nps',
        required: true,
        min: 0,
        max: 10,
      },
      next: [
        { nodeId: 'promoter', condition: { operator: 'greaterOrEqual', value: 9 } },
        { nodeId: 'passive', condition: { operator: 'greaterOrEqual', value: 7 } },
        { nodeId: 'detractor', condition: { operator: 'lessOrEqual', value: 6 } },
      ],
    },
    promoter: {
      id: 'promoter',
      type: 'question',
      content: { question: 'What do you love most?', type: 'text', required: false },
      next: [{ nodeId: 'end' }],
    },
    passive: {
      id: 'passive',
      type: 'question',
      content: {
        question: 'What could we improve?',
        type: 'multiChoice',
        required: false,
        options: [opt('Speed'), opt('Features'), opt('Price'), opt('Support')],
      },
      next: [{ nodeId: 'end' }],
    },
    detractor: {
      id: 'detractor',
      type: 'question',
      content: { question: 'What went wrong?', type: 'textarea', required: true },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Thank You', message: 'We value your feedback' },
      next: [],
    },
  },
});

// Sample 14: Currency and Color
tcsSamples.push({
  id: 'tcs-14-specialized',
  title: 'Specialized Inputs',
  description: 'Currency and color pickers',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Preferences', message: 'Tell us your preferences' },
      next: [{ nodeId: 'q1' }],
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: {
        question: 'Your budget',
        type: 'currency',
        required: true,
        currency: 'USD',
        currencyPosition: 'before',
        min: 0,
        max: 1000000,
      },
      next: [{ nodeId: 'q2' }],
    },
    q2: {
      id: 'q2',
      type: 'question',
      content: {
        question: 'Favorite color',
        type: 'color',
        required: false,
      },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Saved', message: 'Preferences recorded' },
      next: [],
    },
  },
});

// Sample 15: Matrix Question
tcsSamples.push({
  id: 'tcs-15-matrix',
  title: 'Matrix Survey',
  description: 'Matrix/grid questions',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Evaluation', message: 'Rate each aspect' },
      next: [{ nodeId: 'q1' }],
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: {
        question: 'Rate each department',
        type: 'matrix',
        required: true,
        matrixRows: ['Sales', 'Support', 'Engineering', 'Marketing'],
        matrixColumns: ['Poor', 'Fair', 'Good', 'Excellent'],
        matrixType: 'radio',
      },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Complete', message: 'Evaluation submitted' },
      next: [],
    },
  },
});

// Sample 16: Message Nodes
tcsSamples.push({
  id: 'tcs-16-messages',
  title: 'Info Survey',
  description: 'Message and info nodes',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Welcome', message: 'This survey takes 5 minutes' },
      next: [{ nodeId: 'info1' }],
    },
    info1: {
      id: 'info1',
      type: 'message',
      content: { title: 'Section 1', message: 'Please read carefully before proceeding' },
      next: [{ nodeId: 'q1' }],
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: { question: 'Did you understand the instructions?', type: 'yesNo', required: true },
      next: [{ nodeId: 'info2' }],
    },
    info2: {
      id: 'info2',
      type: 'message',
      content: { title: 'Section 2', message: 'Almost done!' },
      next: [{ nodeId: 'q2' }],
    },
    q2: {
      id: 'q2',
      type: 'question',
      content: { question: 'Any final comments?', type: 'text', required: false },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Finished', message: 'Thank you for completing the survey' },
      next: [],
    },
  },
});

// Sample 17: Textarea with Validation
tcsSamples.push({
  id: 'tcs-17-textarea',
  title: 'Feedback Form',
  description: 'Textarea with validation',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Feedback', message: 'Share your thoughts' },
      next: [{ nodeId: 'q1' }],
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: {
        question: 'Describe your experience',
        type: 'textarea',
        required: true,
        textareaRows: 5,
        textareaMaxRows: 10,
        textareaResize: 'vertical',
        validation: {
          minLength: 20,
          maxLength: 1000,
          errorMessage: 'Please provide at least 20 characters',
        },
      },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Received', message: 'Your feedback has been submitted' },
      next: [],
    },
  },
});

// Sample 18: Range Question
tcsSamples.push({
  id: 'tcs-18-range',
  title: 'Budget Range',
  description: 'Range selection',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Budget Survey', message: 'Define your range' },
      next: [{ nodeId: 'q1' }],
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: {
        question: 'Your budget range',
        type: 'range',
        required: true,
        rangeType: 'number',
        rangeLabels: { start: 'Minimum', end: 'Maximum' },
        min: 0,
        max: 100000,
      },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Saved', message: 'Budget recorded' },
      next: [],
    },
  },
});

// Sample 19: Dimensions Question
tcsSamples.push({
  id: 'tcs-19-dimensions',
  title: 'Size Specification',
  description: 'Dimension inputs',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: { title: 'Dimensions', message: 'Specify the size' },
      next: [{ nodeId: 'q1' }],
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: {
        question: 'Product dimensions',
        type: 'dimensions',
        required: true,
        dimensionType: '3d',
        dimensionUnits: 'cm',
      },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: { title: 'Recorded', message: 'Dimensions saved' },
      next: [],
    },
  },
});

// Sample 20: Complex Multi-Path Survey
resetOptions();
tcsSamples.push({
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
});

// ============================================================================
// Main Runner
// ============================================================================

export function runTCSValidation(): { results: TCSResult[]; summary: string } {
  const results: TCSResult[] = [];

  console.log('TCS Validation - 20 Samples');
  console.log('='.repeat(60));

  for (const sample of tcsSamples) {
    console.log(`\nTesting: ${sample.id}`);
    const result = runSampleTest(sample);
    results.push(result);

    if (result.passed) {
      console.log(`  ✅ PASSED`);
    } else {
      console.log(`  ❌ FAILED`);
      for (const error of result.errors) {
        console.log(`     - ${error}`);
      }
    }
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  const summary = `
${'='.repeat(60)}
TCS VALIDATION SUMMARY
${'='.repeat(60)}
Total Samples: ${results.length}
Passed: ${passed}
Failed: ${failed}
Pass Rate: ${((passed / results.length) * 100).toFixed(1)}%

Breakdown:
- Validation Passed: ${results.filter((r) => r.validationPassed).length}
- Roundtrip Passed: ${results.filter((r) => r.roundtripPassed).length}
- UI Ready: ${results.filter((r) => r.uiReady).length}
${'='.repeat(60)}
`;

  console.log(summary);

  return { results, summary };
}

// Run if executed directly
const isMain = import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('tcs-runner.ts');

if (isMain) {
  const { results } = runTCSValidation();
  process.exit(results.every((r) => r.passed) ? 0 : 1);
}
