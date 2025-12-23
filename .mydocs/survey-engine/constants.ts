import type { QuestionType } from './types';

// Survey limits
export const SURVEY_LIMITS = {
  MAX_NODES: 100,
  MAX_OPTIONS_PER_QUESTION: 20,
  MAX_QUESTION_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_TEMPLATE_NAME_LENGTH: 255,
  MAX_TEMPLATE_KEY_LENGTH: 255,
  MAX_SURVEY_DURATION_HOURS: 24 * 30, // 30 days
  MIN_SURVEY_DURATION_HOURS: 1,
} as const;

// Default values
export const SURVEY_DEFAULTS = {
  RATING_MIN: 1,
  RATING_MAX: 5,
  NPS_MIN: 0,
  NPS_MAX: 10,
  TEXT_PLACEHOLDER: 'Enter your answer here...',
  SURVEY_EXPIRY_DAYS: 30,
} as const;

// Question type labels
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Text Input',
  rating: 'Rating Scale',
  choice: 'Single Choice',
  multiChoice: 'Multiple Choice',
  multiSelect: 'Multi-Select Dropdown',
  nps: 'NPS Score',
  date: 'Date Picker',
  dateRange: 'Date Range',
  time: 'Time Picker',
  combobox: 'Searchable Dropdown',
  number: 'Number Input',
  color: 'Color Picker',
  fileDropzone: 'File Upload',
  email: 'Email Input',
  phone: 'Phone Number',
  url: 'URL Input',
  currency: 'Currency Input',
  likert: 'Likert Scale',
  matrix: 'Matrix/Grid',
  location: 'Location Picker',
  slider: 'Slider',
  imageChoice: 'Image Choice',
  signature: 'Signature',
  range: 'Range Input',
  yesNo: 'Yes/No',
  percentage: 'Percentage',
  dimensions: 'Dimensions',
  imageLocation: 'Image Location',
  geolocation: 'Geolocation',
} as const;

// Question type icons (using Lucide icon names)
export const QUESTION_TYPE_ICONS: Record<QuestionType, string> = {
  text: 'MessageSquare',
  rating: 'Star',
  choice: 'CircleDot',
  multiChoice: 'CheckSquare',
  multiSelect: 'ListFilter',
  nps: 'TrendingUp',
  date: 'Calendar',
  dateRange: 'CalendarRange',
  time: 'Clock',
  combobox: 'Search',
  number: 'Hash',
  color: 'Palette',
  fileDropzone: 'Upload',
  email: 'Mail',
  phone: 'Phone',
  url: 'Link',
  currency: 'DollarSign',
  likert: 'BarChart3',
  matrix: 'Grid3X3',
  location: 'MapPin',
  slider: 'SlidersHorizontal',
  imageChoice: 'Image',
  signature: 'PenTool',
  range: 'Scale',
  yesNo: 'ToggleLeft',
  percentage: 'Percent',
  dimensions: 'Ruler',
  imageLocation: 'Target',
  geolocation: 'Navigation',
} as const;

// Question type descriptions
export const QUESTION_TYPE_DESCRIPTIONS: Record<QuestionType, string> = {
  text: 'Allow respondents to enter free-form text',
  rating: 'Ask for a rating on a numeric scale',
  choice: 'Let respondents pick one option from a list',
  multiChoice: 'Let respondents pick multiple options',
  multiSelect: 'Searchable dropdown for selecting multiple options',
  nps: 'Measure Net Promoter Score (0-10)',
  date: 'Let respondents select a date from a calendar',
  dateRange: 'Let respondents select a start and end date',
  time: 'Let respondents select a specific time',
  combobox: 'Searchable dropdown for selecting a single option',
  number: 'Allow respondents to enter numeric values',
  color: 'Let respondents select a color using a color picker',
  fileDropzone: 'Allow respondents to upload files via drag and drop',
  email: 'Collect email addresses with validation',
  phone: 'Collect international phone numbers with country codes',
  url: 'Collect website URLs with validation',
  currency: 'Collect monetary values with currency symbols',
  likert: 'Measure agreement levels on a balanced scale',
  matrix: 'Ask multiple questions in a grid format',
  location: 'Collect addresses or location coordinates',
  slider: 'Visual range selector for numeric values',
  imageChoice: 'Let respondents select from image options',
  signature: 'Capture digital signatures',
  range: 'Collect minimum and maximum value ranges',
  yesNo: 'Simple binary choice with better UX than radio buttons',
  percentage: 'Collect percentage values (0-100%)',
  dimensions: 'Collect width, height, and optional depth measurements',
  imageLocation: 'Let respondents mark and label positions on an image',
  geolocation: 'Let respondents select a location on an interactive map',
} as const;

// Survey status labels
export const SURVEY_STATUS_LABELS = {
  draft: 'Draft',
  published: 'Active',
  archived: 'Paused',
} as const;

// Survey status colors (Tailwind classes)
export const SURVEY_STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-orange-100 text-orange-800',
} as const;

// Instance status labels
export const INSTANCE_STATUS_LABELS = {
  pending: 'Not Started',
  started: 'In Progress',
  target_reached: 'Target Reached',
  completed: 'Completed',
  expired: 'Expired',
  archived: 'Archived',
} as const;

// Instance status colors (Tailwind classes)
export const INSTANCE_STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-800',
  started: 'bg-blue-100 text-blue-800',
  target_reached: 'bg-blue-500 text-white',
  completed: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
  archived: 'bg-gray-100 text-gray-600',
} as const;

// Condition operator labels
export const CONDITION_OPERATOR_LABELS = {
  equals: 'Equals',
  notEquals: 'Not Equals',
  greater: 'Greater Than',
  less: 'Less Than',
  contains: 'Contains',
  in: 'In List',
  notIn: 'Not In List',
} as const;

// Error messages
export const SURVEY_ERROR_MESSAGES = {
  SURVEY_NOT_FOUND: 'Survey not found',
  TEMPLATE_NOT_FOUND: 'Survey template not found',
  INSTANCE_NOT_FOUND: 'Survey instance not found',
  INSTANCE_EXPIRED: 'This survey has expired',
  INSTANCE_COMPLETED: 'This survey has already been completed',
  INVALID_TOKEN: 'Invalid survey token',
  REQUIRED_QUESTION: 'This question is required',
  INVALID_ANSWER: 'Invalid answer format',
  MAX_NODES_REACHED: `Maximum of ${SURVEY_LIMITS.MAX_NODES} nodes allowed`,
  ORPHANED_NODES: 'Survey contains unreachable questions',
  NO_END_NODE: 'Survey must have at least one end point',
  CIRCULAR_REFERENCE: 'Survey contains circular references',
} as const;

// Success messages
export const SURVEY_SUCCESS_MESSAGES = {
  TEMPLATE_CREATED: 'Survey template created successfully',
  TEMPLATE_UPDATED: 'Survey template updated successfully',
  TEMPLATE_PUBLISHED: 'Survey published successfully',
  TEMPLATE_ARCHIVED: 'Survey archived successfully',
  TEMPLATE_DELETED: 'Survey template deleted successfully',
  RESPONSE_SUBMITTED: 'Thank you! Your response has been submitted',
  INSTANCE_CREATED: 'Survey link created successfully',
} as const;

// Analytics time ranges
export const ANALYTICS_TIME_RANGES = {
  LAST_7_DAYS: { label: 'Last 7 days', days: 7 },
  LAST_30_DAYS: { label: 'Last 30 days', days: 30 },
  LAST_90_DAYS: { label: 'Last 90 days', days: 90 },
  LAST_YEAR: { label: 'Last year', days: 365 },
  ALL_TIME: { label: 'All time', days: null },
} as const;

// Export formats
export const EXPORT_FORMATS = {
  CSV: { value: 'csv', label: 'CSV', extension: '.csv', mimeType: 'text/csv' },
  EXCEL: { value: 'excel', label: 'Excel', extension: '.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  JSON: { value: 'json', label: 'JSON', extension: '.json', mimeType: 'application/json' },
} as const;

// Context variable placeholders
export const CONTEXT_VARIABLES = [
  { key: 'userName', label: 'User Name', example: '{{userName}}' },
  { key: 'userEmail', label: 'User Email', example: '{{userEmail}}' },
  { key: 'organizationName', label: 'Organization', example: '{{organizationName}}' },
] as const;

// File type options for file upload component
export const FILE_TYPE_OPTIONS = [
  { value: '*/*', label: 'All Files', description: 'Accept any file type' },
  { value: 'image/*', label: 'Images (all formats)', description: 'JPG, PNG, GIF, SVG, etc.' },
  { value: 'image/jpeg,image/png', label: 'Images (JPG, PNG only)', description: 'Common image formats' },
  { value: 'application/pdf', label: 'PDF Documents', description: 'Portable Document Format' },
  { value: 'application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Word Documents', description: 'DOC, DOCX files' },
  { value: 'application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'Excel Spreadsheets', description: 'XLS, XLSX files' },
  { value: 'application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation', label: 'PowerPoint Presentations', description: 'PPT, PPTX files' },
  { value: 'audio/*', label: 'Audio Files', description: 'MP3, WAV, OGG, etc.' },
  { value: 'video/*', label: 'Video Files', description: 'MP4, AVI, MOV, etc.' },
  { value: 'text/plain', label: 'Text Files', description: 'TXT files' },
  { value: 'text/csv', label: 'CSV Files', description: 'Comma-separated values' },
  { value: 'application/zip,application/x-rar-compressed', label: 'Archive Files', description: 'ZIP, RAR files' },
] as const;

// MIME type to friendly name mapping
export const MIME_TYPE_NAMES: Record<string, string> = {
  // All files
  '*/*': 'files',
  
  // Images
  'image/*': 'images',
  'image/jpeg': 'images',
  'image/png': 'images',
  'image/gif': 'images',
  'image/svg+xml': 'images',
  'image/webp': 'images',
  
  // Documents
  'application/pdf': 'PDF',
  'application/msword': 'Word documents',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word documents',
  'application/vnd.ms-excel': 'Excel files',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel files',
  'application/vnd.ms-powerpoint': 'PowerPoint files',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint files',
  
  // Media
  'audio/*': 'audio files',
  'audio/mpeg': 'audio files',
  'audio/wav': 'audio files',
  'audio/ogg': 'audio files',
  'video/*': 'videos',
  'video/mp4': 'videos',
  'video/avi': 'videos',
  'video/mov': 'videos',
  'video/wmv': 'videos',
  
  // Text
  'text/plain': 'text files',
  'text/csv': 'CSV files',
  'text/html': 'HTML files',
  'text/css': 'CSS files',
  'text/javascript': 'JavaScript files',
  
  // Archives
  'application/zip': 'ZIP files',
  'application/x-rar-compressed': 'RAR files',
  'application/x-7z-compressed': '7Z files',
  
  // Other
  'application/json': 'JSON files',
  'application/xml': 'XML files',
} as const;

/**
 * Get a user-friendly upload title based on accepted MIME types
 */
export function getUploadTitle(acceptedTypes?: string): string {
  if (!acceptedTypes) {
    return 'Upload files';
  }
  
  // Split comma-separated MIME types and clean them
  const types = acceptedTypes.split(',').map(type => type.trim());
  
  // If only one specific type, use its friendly name
  if (types.length === 1) {
    const friendlyName = MIME_TYPE_NAMES[types[0]];
    if (friendlyName) {
      return `Upload ${friendlyName}`;
    }
  }
  
  // For multiple types, try to find a common category
  const uniqueNames = [...new Set(types.map(type => MIME_TYPE_NAMES[type]).filter(Boolean))];
  
  if (uniqueNames.length === 1) {
    return `Upload ${uniqueNames[0]}`;
  }
  
  // Check for common patterns
  const hasImages = types.some(type => type.startsWith('image/') || type === 'image/*');
  const hasDocuments = types.some(type => 
    type.includes('pdf') || 
    type.includes('word') || 
    type.includes('excel') || 
    type.includes('powerpoint')
  );
  const hasMedia = types.some(type => type.startsWith('audio/') || type.startsWith('video/'));
  
  // If it's a mix of similar types, use a general term
  if (hasImages && hasDocuments) {
    return 'Upload files';
  } else if (hasImages) {
    return 'Upload images';
  } else if (hasDocuments) {
    return 'Upload documents';
  } else if (hasMedia) {
    return 'Upload media';
  }
  
  // Default fallback
  return 'Upload files';
}

// Survey templates (for quick start)
export const SURVEY_TEMPLATES = {
  CUSTOMER_SATISFACTION: {
    key: 'customer-satisfaction',
    name: 'Customer Satisfaction',
    description: 'Measure customer satisfaction with your product or service',
  },
  NPS: {
    key: 'nps',
    name: 'Net Promoter Score',
    description: 'Measure customer loyalty and likelihood to recommend',
  },
  FEEDBACK: {
    key: 'feedback',
    name: 'General Feedback',
    description: 'Collect open-ended feedback from users',
  },
  ONBOARDING: {
    key: 'onboarding',
    name: 'Onboarding Experience',
    description: 'Evaluate new user onboarding experience',
  },
} as const;