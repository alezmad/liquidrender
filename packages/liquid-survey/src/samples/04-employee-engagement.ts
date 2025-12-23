import type { GraphSurvey } from '../types';

export const employeeEngagementSurvey: GraphSurvey = {
  id: 'employee-engagement-survey',
  title: 'Employee Engagement Survey',
  description: 'Help us improve your workplace experience',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: {
        title: 'Employee Engagement Survey',
        message: 'Your feedback is confidential and will help us create a better workplace. This survey takes approximately 5 minutes to complete.'
      },
      next: [{ nodeId: 'q1' }]
    },
    q1: {
      id: 'q1',
      type: 'question',
      content: {
        question: 'Which department do you work in?',
        type: 'choice',
        required: true,
        options: [
          { id: 'opt_engineering', label: 'Engineering', value: 'engineering' },
          { id: 'opt_sales', label: 'Sales', value: 'sales' },
          { id: 'opt_marketing', label: 'Marketing', value: 'marketing' },
          { id: 'opt_hr', label: 'HR', value: 'hr' },
          { id: 'opt_operations', label: 'Operations', value: 'operations' }
        ]
      },
      next: [{ nodeId: 'q2' }]
    },
    q2: {
      id: 'q2',
      type: 'question',
      content: {
        question: 'How long have you worked here?',
        type: 'choice',
        required: true,
        options: [
          { id: 'opt_less_than_1', label: 'Less than 1 year', value: 'less_than_1' },
          { id: 'opt_1_to_3', label: '1-3 years', value: '1_to_3' },
          { id: 'opt_3_to_5', label: '3-5 years', value: '3_to_5' },
          { id: 'opt_5_plus', label: '5+ years', value: '5_plus' }
        ]
      },
      next: [{ nodeId: 'q3' }]
    },
    q3: {
      id: 'q3',
      type: 'question',
      content: {
        question: 'I feel valued at work',
        type: 'likert',
        required: true,
        likertScale: 5,
        likertLabels: {
          start: 'Strongly Disagree',
          end: 'Strongly Agree'
        }
      },
      next: [{ nodeId: 'q4' }]
    },
    q4: {
      id: 'q4',
      type: 'question',
      content: {
        question: 'I have opportunities for growth',
        type: 'likert',
        required: true,
        likertScale: 5,
        likertLabels: {
          start: 'Strongly Disagree',
          end: 'Strongly Agree'
        }
      },
      next: [{ nodeId: 'q5' }]
    },
    q5: {
      id: 'q5',
      type: 'question',
      content: {
        question: 'My manager supports me',
        type: 'likert',
        required: true,
        likertScale: 5,
        likertLabels: {
          start: 'Strongly Disagree',
          end: 'Strongly Agree'
        }
      },
      next: [{ nodeId: 'q6' }]
    },
    q6: {
      id: 'q6',
      type: 'question',
      content: {
        question: 'How likely are you to recommend our company as a place to work?',
        type: 'nps',
        required: true,
        min: 0,
        max: 10,
        description: '0 = Not at all likely, 10 = Extremely likely'
      },
      next: [{ nodeId: 'q7' }]
    },
    q7: {
      id: 'q7',
      type: 'question',
      content: {
        question: 'Which areas do you think need improvement?',
        description: 'Select all that apply',
        type: 'multiSelect',
        required: true,
        placeholder: 'Select areas for improvement...',
        options: [
          { id: 'opt_communication', label: 'Communication', value: 'communication' },
          { id: 'opt_work_life_balance', label: 'Work-life balance', value: 'work_life_balance' },
          { id: 'opt_compensation', label: 'Compensation and benefits', value: 'compensation' },
          { id: 'opt_career_development', label: 'Career development', value: 'career_development' },
          { id: 'opt_workplace_culture', label: 'Workplace culture', value: 'workplace_culture' },
          { id: 'opt_tools_resources', label: 'Tools and resources', value: 'tools_resources' }
        ]
      },
      next: [{ nodeId: 'q8' }]
    },
    q8: {
      id: 'q8',
      type: 'question',
      content: {
        question: 'Do you have any additional feedback or suggestions?',
        type: 'text',
        required: false,
        placeholder: 'Share your thoughts here...'
      },
      next: [{ nodeId: 'end' }]
    },
    end: {
      id: 'end',
      type: 'end',
      content: {
        title: 'Thank You!',
        message: 'Your feedback is valuable and will help us improve. All responses are kept confidential.'
      },
      next: []
    }
  }
};
