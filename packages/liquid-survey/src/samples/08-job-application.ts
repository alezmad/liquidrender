import type { GraphSurvey } from '../types';

export const jobApplicationSurvey: GraphSurvey = {
  id: 'job-application-survey',
  title: 'Job Application',
  description: 'Complete this form to apply for a position at our company',
  startNodeId: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'start',
      content: {
        title: 'Welcome to Our Application Portal',
        message: 'Thank you for your interest in joining our team. Please complete all required fields.',
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
        placeholder: 'Enter your full name',
      },
      next: [{ nodeId: 'q2' }],
    },
    q2: {
      id: 'q2',
      type: 'question',
      content: {
        question: 'Email',
        type: 'email',
        required: true,
        placeholder: 'your.email@example.com',
        emailValidation: 'strict',
      },
      next: [{ nodeId: 'q3' }],
    },
    q3: {
      id: 'q3',
      type: 'question',
      content: {
        question: 'Phone',
        type: 'phone',
        required: false,
        countryCode: 'US',
        placeholder: 'Enter your phone number',
      },
      next: [{ nodeId: 'q4' }],
    },
    q4: {
      id: 'q4',
      type: 'question',
      content: {
        question: 'LinkedIn profile',
        type: 'url',
        required: false,
        placeholder: 'https://linkedin.com/in/yourprofile',
        urlProtocol: 'https',
      },
      next: [{ nodeId: 'q5' }],
    },
    q5: {
      id: 'q5',
      type: 'question',
      content: {
        question: 'Position applying for',
        type: 'choice',
        required: true,
        options: [
          { id: 'developer', label: 'Developer', value: 'developer' },
          { id: 'designer', label: 'Designer', value: 'designer' },
          { id: 'manager', label: 'Manager', value: 'manager' },
          { id: 'intern', label: 'Intern', value: 'intern' },
        ],
      },
      next: [
        { condition: { operator: 'equals', value: 'developer' }, nodeId: 'q6_dev' },
        { condition: { operator: 'equals', value: 'designer' }, nodeId: 'q6_des' },
        { condition: { operator: 'equals', value: 'manager' }, nodeId: 'q6_mgr' },
        { condition: { operator: 'equals', value: 'intern' }, nodeId: 'q6_int' },
      ],
    },
    // Developer path
    q6_dev: {
      id: 'q6_dev',
      type: 'question',
      content: {
        question: 'Programming languages',
        type: 'multiChoice',
        required: true,
        options: [
          { id: 'javascript', label: 'JavaScript', value: 'javascript' },
          { id: 'python', label: 'Python', value: 'python' },
          { id: 'go', label: 'Go', value: 'go' },
          { id: 'rust', label: 'Rust', value: 'rust' },
          { id: 'java', label: 'Java', value: 'java' },
          { id: 'other', label: 'Other', value: 'other' },
        ],
      },
      next: [{ nodeId: 'q7_dev' }],
    },
    q7_dev: {
      id: 'q7_dev',
      type: 'question',
      content: {
        question: 'Years of experience',
        type: 'number',
        required: true,
        min: 0,
        max: 50,
        step: 0.5,
        unit: 'years',
        placeholder: 'Enter years of experience',
      },
      next: [{ nodeId: 'q_resume' }],
    },
    // Designer path
    q6_des: {
      id: 'q6_des',
      type: 'question',
      content: {
        question: 'Design tools',
        type: 'multiChoice',
        required: true,
        options: [
          { id: 'figma', label: 'Figma', value: 'figma' },
          { id: 'sketch', label: 'Sketch', value: 'sketch' },
          { id: 'adobe-xd', label: 'Adobe XD', value: 'adobe-xd' },
          { id: 'photoshop', label: 'Photoshop', value: 'photoshop' },
        ],
      },
      next: [{ nodeId: 'q7_des' }],
    },
    q7_des: {
      id: 'q7_des',
      type: 'question',
      content: {
        question: 'Portfolio link',
        type: 'url',
        required: true,
        placeholder: 'https://yourportfolio.com',
        urlProtocol: 'https',
      },
      next: [{ nodeId: 'q_resume' }],
    },
    // Manager path
    q6_mgr: {
      id: 'q6_mgr',
      type: 'question',
      content: {
        question: 'Team size managed',
        type: 'number',
        required: true,
        min: 1,
        max: 1000,
        step: 1,
        unit: 'people',
        placeholder: 'Enter team size',
      },
      next: [{ nodeId: 'q7_mgr' }],
    },
    q7_mgr: {
      id: 'q7_mgr',
      type: 'question',
      content: {
        question: 'Leadership style',
        type: 'text',
        required: true,
        placeholder: 'Describe your leadership approach',
      },
      next: [{ nodeId: 'q_resume' }],
    },
    // Intern path
    q6_int: {
      id: 'q6_int',
      type: 'question',
      content: {
        question: 'Current school/university',
        type: 'text',
        required: true,
        placeholder: 'Enter your current educational institution',
      },
      next: [{ nodeId: 'q7_int' }],
    },
    q7_int: {
      id: 'q7_int',
      type: 'question',
      content: {
        question: 'Expected graduation',
        type: 'date',
        required: true,
        placeholder: 'Select expected graduation date',
        dateFormat: 'PPP',
      },
      next: [{ nodeId: 'q_resume' }],
    },
    // All paths converge here
    q_resume: {
      id: 'q_resume',
      type: 'question',
      content: {
        question: 'Upload resume',
        type: 'fileDropzone',
        required: true,
        accept: 'application/pdf,.doc,.docx',
        maxFileSize: 5242880, // 5MB in bytes
        multiple: false,
      },
      next: [{ nodeId: 'q_why' }],
    },
    q_why: {
      id: 'q_why',
      type: 'question',
      content: {
        question: 'Why do you want this role?',
        type: 'text',
        required: true,
        placeholder: 'Tell us what motivates you to apply for this position',
        validation: {
          minLength: 50,
          maxLength: 1000,
          errorMessage: 'Please provide a response between 50 and 1000 characters',
        },
      },
      next: [{ nodeId: 'q_availability' }],
    },
    q_availability: {
      id: 'q_availability',
      type: 'question',
      content: {
        question: 'Available to start immediately?',
        type: 'yesNo',
        required: true,
      },
      next: [{ nodeId: 'end' }],
    },
    end: {
      id: 'end',
      type: 'end',
      content: {
        title: 'Application Submitted',
        message: 'Thank you for applying! We will review your application and get back to you within 5-7 business days.',
      },
      next: [],
    },
  },
};
