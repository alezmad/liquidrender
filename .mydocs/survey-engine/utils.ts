import { customAlphabet } from 'nanoid';
import type {
  GraphSurvey,
  SurveyNode,
  QuestionContent,
  SurveyContext,
  QuestionStats,
  SurveyAnalytics,
  NextStep
} from './types';
import { isQuestionContent } from './types';

// Re-export validation functions from validator.ts
export {
  validateSurvey,
  isValidSurvey,
  getValidationMessages,
  validateSurveys,
  validateAllSamples,
  type ExtendedValidationResult,
  type ExtendedValidationError,
  type ExtendedValidationErrorCode,
} from './validator';

// Generate unique survey token
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 10);
export const generateSurveyToken = () => nanoid();

// Generate unique node ID
export const generateNodeId = () => `node_${nanoid()}`;

// Generate unique edge ID
export const generateEdgeId = (source: string, target: string) => `${source}-${target}-${nanoid(6)}`;

// Generate unique option ID
export const generateOptionId = () => `opt_${nanoid()}`;

/**
 * Create a default survey structure
 */
export function createDefaultSurvey(): GraphSurvey {
  const startNodeId = generateNodeId();
  const endNodeId = generateNodeId();
  
  return {
    id: generateNodeId(),
    title: 'New Survey',
    description: '',
    startNodeId,
    nodes: {
      [startNodeId]: {
        id: startNodeId,
        type: 'start',
        content: {
          title: 'Welcome',
          message: 'Thank you for taking our survey!'
        },
        next: [{ nodeId: endNodeId }]
      },
      [endNodeId]: {
        id: endNodeId,
        type: 'end',
        content: {
          title: 'Thank You!',
          message: 'Your responses have been recorded.'
        },
        next: []
      }
    }
  };
}

/**
 * Create a question node
 */
export function createQuestionNode(
  type: QuestionContent['type'],
  question: string
): SurveyNode {
  const nodeId = generateNodeId();
  
  const baseContent: QuestionContent = {
    question,
    type,
    required: true
  };
  
  // Add type-specific defaults
  switch (type) {
    case 'rating':
      baseContent.min = 1;
      baseContent.max = 5;
      break;
    case 'nps':
      baseContent.min = 0;
      baseContent.max = 10;
      break;
    case 'choice':
    case 'multiChoice':
    case 'multiSelect':
    case 'combobox':
      baseContent.options = [
        { id: generateOptionId(), label: 'Option 1', value: 'option1' },
        { id: generateOptionId(), label: 'Option 2', value: 'option2' }
      ];
      if (type === 'multiSelect') {
        baseContent.placeholder = 'Select options...';
      } else if (type === 'combobox') {
        baseContent.placeholder = 'Select or search...';
        baseContent.searchable = true;
      }
      break;
    case 'text':
      baseContent.placeholder = 'Enter your answer here...';
      break;
    case 'date':
      baseContent.placeholder = 'Select a date';
      baseContent.dateFormat = 'PPP';
      break;
    case 'dateRange':
      baseContent.placeholder = 'Select date range';
      baseContent.dateFormat = 'PPP';
      baseContent.numberOfMonths = 2;
      baseContent.startDatePlaceholder = 'Start date';
      baseContent.endDatePlaceholder = 'End date';
      break;
    case 'time':
      baseContent.placeholder = 'Select time';
      baseContent.timeFormat = '12';
      break;
    case 'number':
      baseContent.placeholder = 'Enter a number';
      baseContent.step = 1;
      baseContent.min = 0;
      break;
    case 'color':
      baseContent.placeholder = 'Select a color';
      break;
    case 'fileDropzone':
      baseContent.placeholder = 'Drop your files here or click to select';
      baseContent.accept = '*/*';
      baseContent.maxFileSize = 5242880; // 5MB in bytes
      baseContent.multiple = false;
      break;
    case 'email':
      baseContent.placeholder = 'Enter email address';
      baseContent.emailValidation = 'basic';
      baseContent.enforceValidation = true; // Default to true for validation
      break;
    case 'phone':
      baseContent.placeholder = 'Enter phone number';
      baseContent.countryCode = 'US';
      baseContent.enforceValidation = true; // Default to true for validation
      break;
    case 'url':
      baseContent.placeholder = 'Enter website URL';
      baseContent.urlProtocol = 'both';
      baseContent.enforceValidation = true; // Default to true for validation
      break;
    case 'currency':
      baseContent.placeholder = 'Enter amount';
      baseContent.currency = 'USD';
      baseContent.currencyPosition = 'before';
      break;
    case 'likert':
      baseContent.placeholder = 'Select your level of agreement';
      baseContent.likertScale = 5;
      baseContent.likertLabels = { start: 'Strongly Disagree', end: 'Strongly Agree' };
      break;
    case 'matrix':
      baseContent.matrixRows = ['Row 1', 'Row 2'];
      baseContent.matrixColumns = ['Column 1', 'Column 2', 'Column 3'];
      baseContent.matrixType = 'radio';
      break;
    case 'location':
      baseContent.placeholder = 'Enter location';
      baseContent.locationTypes = ['address'];
      break;
    case 'slider':
      baseContent.placeholder = 'Move slider to select value';
      baseContent.sliderMin = 0;
      baseContent.sliderMax = 100;
      baseContent.sliderStep = 1;
      baseContent.sliderShowValue = true;
      break;
    case 'imageChoice':
      baseContent.imageOptions = [
        { id: generateOptionId(), label: 'Option 1', value: 'option1', imageUrl: '/placeholder-1.png' },
        { id: generateOptionId(), label: 'Option 2', value: 'option2', imageUrl: '/placeholder-2.png' }
      ];
      break;
    case 'signature':
      baseContent.placeholder = 'Draw your signature here';
      break;
    case 'range':
      baseContent.placeholder = 'Select range';
      baseContent.rangeType = 'number';
      baseContent.rangeLabels = { start: 'Min', end: 'Max' };
      break;
    case 'yesNo':
      baseContent.placeholder = 'Select your answer';
      break;
    case 'percentage':
      baseContent.placeholder = 'Enter percentage (0-100)';
      baseContent.percentageDecimals = 0;
      break;
    case 'dimensions':
      baseContent.placeholder = 'Enter dimensions';
      baseContent.dimensionType = '2d';
      baseContent.dimensionUnits = 'px';
      break;
    case 'imageLocation':
      baseContent.placeholder = 'Click on the image to mark locations';
      baseContent.imageLocationUrl = '';
      baseContent.imageLocationPoints = [];
      break;
    case 'geolocation':
      baseContent.placeholder = 'Select your location on the map';
      baseContent.geolocationDefaultLocation = { lat: 51.505, lng: -0.09 };
      baseContent.geolocationDefaultZoom = 13;
      baseContent.geolocationMapHeight = '400px';
      baseContent.geolocationEnableUserLocation = true;
      baseContent.geolocationUseUserLocationByDefault = true;
      baseContent.geolocationTileLayer = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      baseContent.geolocationAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
      baseContent.geolocationMaxLocations = 1;
      baseContent.geolocationMinLocations = 0;
      baseContent.geolocationAllowLabels = true;
      baseContent.geolocationShowList = true;
      baseContent.geolocationSearchEnabled = false;
      break;
    case 'textarea':
      baseContent.placeholder = 'Enter your detailed response here...';
      baseContent.textareaRows = 4;
      baseContent.textareaResize = 'vertical';
      break;
    case 'ranking':
      baseContent.placeholder = 'Drag items to rank them';
      baseContent.rankingItems = [
        { id: generateOptionId(), label: 'Item 1', value: 'item1' },
        { id: generateOptionId(), label: 'Item 2', value: 'item2' },
        { id: generateOptionId(), label: 'Item 3', value: 'item3' },
      ];
      break;
    case 'hidden':
      baseContent.hiddenSource = 'static';
      baseContent.hiddenValue = '';
      break;
    case 'password':
      baseContent.placeholder = 'Enter password';
      baseContent.passwordMinLength = 8;
      baseContent.passwordRequireUppercase = true;
      baseContent.passwordRequireLowercase = true;
      baseContent.passwordRequireNumber = true;
      baseContent.passwordRequireSpecial = false;
      baseContent.passwordShowStrength = true;
      baseContent.passwordConfirm = false;
      break;
    case 'captcha':
      baseContent.captchaType = 'recaptcha';
      baseContent.captchaTheme = 'light';
      break;
    case 'audio':
      baseContent.placeholder = 'Click to start recording';
      baseContent.audioMaxDuration = 120; // 2 minutes
      baseContent.audioAllowPlayback = true;
      baseContent.audioAllowRetake = true;
      baseContent.audioFormat = 'webm';
      break;
    case 'video':
      baseContent.placeholder = 'Click to start recording';
      baseContent.videoMaxDuration = 60; // 1 minute
      baseContent.videoAllowPlayback = true;
      baseContent.videoAllowRetake = true;
      baseContent.videoMaxFileSize = 52428800; // 50MB
      baseContent.videoResolution = '720p';
      baseContent.videoFacingMode = 'user';
      break;
    case 'address':
      baseContent.placeholder = 'Enter your address';
      baseContent.addressFields = ['street', 'city', 'state', 'zip', 'country'];
      baseContent.addressDefaultCountry = 'US';
      baseContent.addressAutocomplete = true;
      baseContent.addressValidation = 'format';
      break;
  }
  
  return {
    id: nodeId,
    type: 'question',
    content: baseContent,
    next: []
  };
}

/**
 * Interpolate context variables in text
 */
export function interpolateContext(text: string, context: SurveyContext): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = context[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Clone a survey with new IDs
 */
export function cloneSurvey(survey: GraphSurvey): GraphSurvey {
  const oldToNewId = new Map<string, string>();
  const newNodes: Record<string, SurveyNode> = {};
  
  // First pass: create new IDs
  Object.keys(survey.nodes).forEach(oldId => {
    oldToNewId.set(oldId, generateNodeId());
  });
  
  // Second pass: clone nodes with updated references
  (Object.entries(survey.nodes) as [string, SurveyNode][]).forEach(([oldId, node]) => {
    const newId = oldToNewId.get(oldId)!;
    newNodes[newId] = {
      ...node,
      id: newId,
      next: node.next.map((next: NextStep) => ({
        ...next,
        nodeId: oldToNewId.get(next.nodeId) || next.nodeId
      }))
    };
  });
  
  return {
    ...survey,
    id: generateNodeId(),
    startNodeId: oldToNewId.get(survey.startNodeId) || survey.startNodeId,
    nodes: newNodes
  };
}

/**
 * Calculate survey analytics from responses
 */
export function calculateSurveyAnalytics(
  templateId: string,
  responses: Array<{
    answers: Record<string, unknown>;
    metadata?: { duration?: number };
  }>,
  survey: GraphSurvey
): SurveyAnalytics {
  const totalResponses = responses.length;
  const completedResponses = responses.filter(r => 
    Object.keys(r.answers).length > 0
  ).length;
  
  const completionRate = totalResponses > 0 
    ? (completedResponses / totalResponses) * 100 
    : 0;
  
  const durations = responses
    .map(r => r.metadata?.duration)
    .filter((d): d is number => d !== undefined);
  
  const avgDuration = durations.length > 0
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length
    : 0;
  
  // Calculate question stats
  const questionStats: Record<string, QuestionStats> = {};
  
  (Object.entries(survey.nodes) as [string, SurveyNode][]).forEach(([nodeId, node]) => {
    if (node.type !== 'question') return;

    const content = node.content as QuestionContent;
    const questionAnswers = responses
      .map(r => r.answers[nodeId])
      .filter(a => a !== undefined && a !== null);
    
    const stats: QuestionStats = {
      questionId: nodeId,
      type: content.type,
      responses: questionAnswers.length,
      skipped: totalResponses - questionAnswers.length
    };
    
    // Calculate type-specific stats
    switch (content.type) {
      case 'rating':
      case 'nps': {
        const numericAnswers = questionAnswers
          .map(a => Number(a))
          .filter(n => !isNaN(n));
        
        if (numericAnswers.length > 0) {
          stats.avgValue = numericAnswers.reduce((sum, n) => sum + n, 0) / numericAnswers.length;
          
          // Distribution
          stats.distribution = {};
          numericAnswers.forEach(value => {
            stats.distribution![value] = (stats.distribution![value] || 0) + 1;
          });
        }
        break;
      }
      
      case 'choice':
      case 'combobox': {
        stats.distribution = {};
        questionAnswers.forEach(answer => {
          const answerKey = String(answer);
          stats.distribution![answerKey] = (stats.distribution![answerKey] || 0) + 1;
        });
        break;
      }
      
      case 'multiChoice':
      case 'multiSelect': {
        stats.distribution = {};
        questionAnswers.forEach(answers => {
          if (Array.isArray(answers)) {
            answers.forEach(answer => {
              const answerKey = String(answer);
              stats.distribution![answerKey] = (stats.distribution![answerKey] || 0) + 1;
            });
          }
        });
        break;
      }
      
      case 'date': {
        // For date questions, we can show distribution by month/year
        stats.distribution = {};
        questionAnswers.forEach(answer => {
          if (answer) {
            const date = new Date(answer as string);
            const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
            stats.distribution![monthYear] = (stats.distribution![monthYear] || 0) + 1;
          }
        });
        break;
      }
      
      case 'dateRange': {
        // For date range questions, we can show distribution of ranges
        stats.distribution = {};
        questionAnswers.forEach(answer => {
          if (answer && typeof answer === 'object') {
            const range = answer as { start?: string; end?: string };
            if (range.start && range.end) {
              const startDate = new Date(range.start);
              const endDate = new Date(range.end);
              const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
              const rangeLabel = `${days} days`;
              stats.distribution![rangeLabel] = (stats.distribution![rangeLabel] || 0) + 1;
            }
          }
        });
        break;
      }
      
      case 'time': {
        // For time questions, we can show distribution by hour
        stats.distribution = {};
        questionAnswers.forEach(answer => {
          if (answer && typeof answer === 'string') {
            const [hours] = answer.split(':').map(Number);
            const hourLabel = `${hours}:00-${hours}:59`;
            stats.distribution![hourLabel] = (stats.distribution![hourLabel] || 0) + 1;
          }
        });
        break;
      }
      
      case 'number': {
        const numericAnswers = questionAnswers
          .map(a => Number(a))
          .filter(n => !isNaN(n));
        
        if (numericAnswers.length > 0) {
          stats.avgValue = numericAnswers.reduce((sum, n) => sum + n, 0) / numericAnswers.length;
          
          // Distribution by ranges
          stats.distribution = {};
          numericAnswers.forEach(value => {
            const range = Math.floor(value / 10) * 10;
            const rangeLabel = `${range}-${range + 9}`;
            stats.distribution![rangeLabel] = (stats.distribution![rangeLabel] || 0) + 1;
          });
        }
        break;
      }
      
      case 'color': {
        // For color questions, show distribution of selected colors
        stats.distribution = {};
        questionAnswers.forEach(answer => {
          if (answer && typeof answer === 'string') {
            stats.distribution![answer] = (stats.distribution![answer] || 0) + 1;
          }
        });
        break;
      }
      
      case 'fileDropzone': {
        // For file dropzone, show basic stats
        stats.distribution = {};
        questionAnswers.forEach(answer => {
          if (answer) {
            const fileType = Array.isArray(answer) ? 'Multiple files' : 'Single file';
            stats.distribution![fileType] = (stats.distribution![fileType] || 0) + 1;
          }
        });
        break;
      }
      
      case 'email':
      case 'phone':
      case 'url':
      case 'location': {
        // For text-based inputs, show response count
        stats.distribution = { 'Responses': questionAnswers.length };
        break;
      }
      
      case 'currency': {
        const numericAnswers = questionAnswers
          .map(a => Number(a))
          .filter(n => !isNaN(n));
        
        if (numericAnswers.length > 0) {
          stats.avgValue = numericAnswers.reduce((sum, n) => sum + n, 0) / numericAnswers.length;
          
          // Distribution by ranges
          stats.distribution = {};
          numericAnswers.forEach(value => {
            const range = Math.floor(value / 100) * 100;
            const rangeLabel = `${range}-${range + 99}`;
            stats.distribution![rangeLabel] = (stats.distribution![rangeLabel] || 0) + 1;
          });
        }
        break;
      }
      
      case 'likert':
      case 'slider': {
        const numericAnswers = questionAnswers
          .map(a => Number(a))
          .filter(n => !isNaN(n));
        
        if (numericAnswers.length > 0) {
          stats.avgValue = numericAnswers.reduce((sum, n) => sum + n, 0) / numericAnswers.length;
          
          // Distribution
          stats.distribution = {};
          numericAnswers.forEach(value => {
            stats.distribution![value] = (stats.distribution![value] || 0) + 1;
          });
        }
        break;
      }
      
      case 'matrix': {
        stats.distribution = {};
        questionAnswers.forEach(answer => {
          if (answer && typeof answer === 'object') {
            const matrixAnswer = answer as Record<string, unknown>;
            Object.entries(matrixAnswer).forEach(([row, value]) => {
              const key = `${row}: ${value}`;
              stats.distribution![key] = (stats.distribution![key] || 0) + 1;
            });
          }
        });
        break;
      }
      
      case 'imageChoice': {
        stats.distribution = {};
        questionAnswers.forEach(answer => {
          const answerKey = String(answer);
          stats.distribution![answerKey] = (stats.distribution![answerKey] || 0) + 1;
        });
        break;
      }
      
      case 'signature': {
        stats.distribution = { 'Signed': questionAnswers.length };
        break;
      }
      
      case 'range': {
        stats.distribution = {};
        questionAnswers.forEach(answer => {
          if (answer && typeof answer === 'object') {
            const range = answer as { min?: number; max?: number };
            if (typeof range.min === 'number' && typeof range.max === 'number') {
              const rangeSize = range.max - range.min;
              const rangeLabel = `Range: ${rangeSize}`;
              stats.distribution![rangeLabel] = (stats.distribution![rangeLabel] || 0) + 1;
            }
          }
        });
        break;
      }
      
      case 'yesNo': {
        stats.distribution = {};
        questionAnswers.forEach(answer => {
          const key = answer === true ? 'Yes' : answer === false ? 'No' : 'Unknown';
          stats.distribution![key] = (stats.distribution![key] || 0) + 1;
        });
        break;
      }
      
      case 'percentage': {
        const numericAnswers = questionAnswers
          .map(a => Number(a))
          .filter(n => !isNaN(n) && n >= 0 && n <= 100);
        
        if (numericAnswers.length > 0) {
          stats.avgValue = numericAnswers.reduce((sum, n) => sum + n, 0) / numericAnswers.length;
          
          // Distribution by ranges
          stats.distribution = {};
          numericAnswers.forEach(value => {
            const range = Math.floor(value / 10) * 10;
            const rangeLabel = `${range}-${Math.min(range + 9, 100)}%`;
            stats.distribution![rangeLabel] = (stats.distribution![rangeLabel] || 0) + 1;
          });
        }
        break;
      }
      
      case 'dimensions': {
        stats.distribution = {};
        questionAnswers.forEach(answer => {
          if (answer && typeof answer === 'object') {
            const dims = answer as { width?: number; height?: number; depth?: number };
            if (typeof dims.width === 'number' && typeof dims.height === 'number') {
              const area = dims.width * dims.height;
              const volume = dims.depth ? area * dims.depth : null;
              const key = volume ? `Volume: ${volume}` : `Area: ${area}`;
              stats.distribution![key] = (stats.distribution![key] || 0) + 1;
            }
          }
        });
        break;
      }
      
      case 'imageLocation': {
        stats.distribution = {};
        let totalPoints = 0;
        questionAnswers.forEach(answer => {
          if (Array.isArray(answer)) {
            totalPoints += answer.length;
            const pointCount = answer.length;
            const key = `${pointCount} location${pointCount === 1 ? '' : 's'}`;
            stats.distribution![key] = (stats.distribution![key] || 0) + 1;
          }
        });
        stats.avgValue = questionAnswers.length > 0 ? totalPoints / questionAnswers.length : 0;
        break;
      }
      
      case 'geolocation': {
        stats.distribution = {};
        let totalLocations = 0;
        questionAnswers.forEach(answer => {
          if (Array.isArray(answer)) {
            // Multi-location mode
            totalLocations += answer.length;
            const locationCount = answer.length;
            const key = `${locationCount} location${locationCount === 1 ? '' : 's'}`;
            stats.distribution![key] = (stats.distribution![key] || 0) + 1;
            
            // Also track regions for multi-location
            answer.forEach((loc: unknown) => {
              if (loc && typeof loc === 'object' && 'lat' in loc && 'lng' in loc && 
                  typeof loc.lat === 'number' && typeof loc.lng === 'number') {
                const region = `${loc.lat.toFixed(1)}, ${loc.lng.toFixed(1)}`;
                const regionKey = `Region: ${region}`;
                stats.distribution![regionKey] = (stats.distribution![regionKey] || 0) + 1;
              }
            });
          } else if (answer && typeof answer === 'object') {
            // Single location mode
            const geo = answer as { lat: number; lng: number };
            totalLocations += 1;
            // Group by approximate region (rounding to 1 decimal place)
            const region = `${geo.lat.toFixed(1)}, ${geo.lng.toFixed(1)}`;
            stats.distribution![region] = (stats.distribution![region] || 0) + 1;
          }
        });
        
        // Average number of locations per response
        if (questionAnswers.length > 0) {
          stats.avgValue = totalLocations / questionAnswers.length;
        }
        break;
      }
    }
    
    questionStats[nodeId] = stats;
  });
  
  return {
    templateId,
    totalResponses,
    completionRate,
    avgDuration,
    questionStats
  };
}

/**
 * Export survey responses to CSV format
 */
export function exportResponsesToCSV(
  responses: Array<{
    id: string;
    answers: Record<string, unknown>;
    completedAt: Date;
    metadata?: unknown;
  }>,
  survey: GraphSurvey
): string {
  const questions = (Object.entries(survey.nodes) as [string, SurveyNode][])
    .filter(([_, node]) => node.type === 'question')
    .map(([id, node]) => ({
      id,
      question: (node.content as QuestionContent).question
    }));
  
  // Headers
  const headers = [
    'Response ID',
    'Completed At',
    ...questions.map(q => q.question)
  ];
  
  // Rows
  const rows = responses.map(response => {
    const row = [
      response.id,
      response.completedAt.toISOString(),
      ...questions.map(q => {
        const answer = response.answers[q.id];
        const node = survey.nodes[q.id];
        const content = node?.content as QuestionContent;
        
        if (Array.isArray(answer)) {
          // Handle geolocation multi-location mode
          if (content?.type === 'geolocation') {
            return answer.map((loc: unknown) => {
              if (loc && typeof loc === 'object' && 'lat' in loc && 'lng' in loc && 
                  typeof loc.lat === 'number' && typeof loc.lng === 'number') {
                const label = 'label' in loc && typeof loc.label === 'string' ? `${loc.label}: ` : '';
                return `${label}${loc.lat},${loc.lng}`;
              }
              return '';
            }).filter(Boolean).join('; ');
          }
          // Default array handling
          return answer.join('; ');
        } else if (answer && typeof answer === 'object' && 'start' in answer && 'end' in answer) {
          // Handle date range
          const range = answer as { start?: string; end?: string };
          return `${range.start || ''} to ${range.end || ''}`;
        } else if (answer && typeof answer === 'object' && 'lat' in answer && 'lng' in answer) {
          // Handle single geolocation
          const geo = answer as { lat: number; lng: number };
          return `${geo.lat},${geo.lng}`;
        } else if (typeof answer === 'string' && /^\d{2}:\d{2}$/.test(answer)) {
          // Handle time values
          return answer;
        }
        return answer !== undefined ? String(answer) : '';
      })
    ];
    return row;
  });
  
  // Convert to CSV
  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
  ].join('\n');
  
  return csvContent;
}

/**
 * Get question by ID from survey
 */
export function getQuestionById(
  survey: GraphSurvey, 
  questionId: string
): { node: SurveyNode; content: QuestionContent } | null {
  const node = survey.nodes[questionId];
  if (!node || node.type !== 'question') return null;
  
  return {
    node,
    content: node.content as QuestionContent
  };
}

/**
 * Count total questions in survey
 */
export function countQuestions(survey: GraphSurvey): number {
  return (Object.values(survey.nodes) as SurveyNode[]).filter(node => node.type === 'question').length;
}

/**
 * Estimate survey completion time in minutes
 */
export function estimateSurveyTime(survey: GraphSurvey): number {
  let seconds = 0;

  (Object.values(survey.nodes) as SurveyNode[]).forEach(node => {
    if (node.type === 'question') {
      const content = node.content as QuestionContent;
      
      // Base reading time
      seconds += 5; // 5 seconds to read question
      
      // Answer time based on type
      switch (content.type) {
        case 'text':
          seconds += 20; // Text answers take longer
          break;
        case 'choice':
        case 'combobox':
        case 'nps':
        case 'rating':
          seconds += 5; // Quick selections
          break;
        case 'multiChoice':
        case 'multiSelect':
          seconds += 10; // Multiple selections
          break;
        case 'date':
        case 'dateRange':
        case 'time':
          seconds += 8; // Date/time selections
          break;
        case 'number':
          seconds += 5; // Quick numeric input
          break;
        case 'color':
          seconds += 6; // Color selection
          break;
        case 'fileDropzone':
          seconds += 15; // File upload takes longer
          break;
        case 'likert':
          seconds += 8; // Reading scale, selecting point
          break;
        case 'matrix':
          const rows = (content.matrixRows?.length || 2);
          seconds += rows * 5; // 5 seconds per row
          break;
        case 'signature':
          seconds += 12; // Drawing signature
          break;
        case 'range':
          seconds += 8; // Selecting two values
          break;
        case 'yesNo':
          seconds += 3; // Quick binary choice
          break;
        case 'percentage':
        case 'currency':
          seconds += 6; // Numeric with consideration
          break;
        case 'dimensions':
          seconds += 10; // Multiple dimension inputs
          break;
        case 'imageLocation':
          seconds += 20; // Marking locations on images takes time
          break;
        case 'geolocation':
          // Base time for map interaction
          seconds += 15;
          // Add extra time for multi-location mode
          if (content.geolocationMaxLocations && content.geolocationMaxLocations > 1) {
            seconds += (content.geolocationMaxLocations - 1) * 10; // 10 seconds per additional location
          }
          break;
        case 'textarea':
          seconds += 45; // Long-form text takes more time
          break;
        case 'ranking':
          const rankingItems = content.rankingItems?.length || 3;
          seconds += rankingItems * 4; // 4 seconds per item to drag
          break;
        case 'hidden':
          seconds += 0; // No user interaction
          break;
        case 'password':
          seconds += 15; // Typing password carefully
          if (content.passwordConfirm) seconds += 10; // Confirmation field
          break;
        case 'captcha':
          seconds += 8; // Solving captcha
          break;
        case 'audio':
          const audioDuration = content.audioMaxDuration || 120;
          seconds += Math.min(audioDuration, 60) + 10; // Recording + review
          break;
        case 'video':
          const videoDuration = content.videoMaxDuration || 60;
          seconds += Math.min(videoDuration, 60) + 15; // Recording + review
          break;
        case 'address':
          const addressFields = content.addressFields?.length || 5;
          seconds += addressFields * 5; // 5 seconds per field
          break;
      }
    } else {
      seconds += 3; // Reading time for messages
    }
  });
  
  return Math.ceil(seconds / 60); // Return minutes
}

// ============================================================================
// Runtime Validation (JSON Schema-like)
// ============================================================================

export interface RuntimeValidationError {
  path: string;
  message: string;
  expected?: string;
  received?: string;
}

/**
 * Validate survey structure at runtime
 * Returns errors if structure doesn't match expected schema
 */
export function validateSurveySchema(survey: unknown): RuntimeValidationError[] {
  const errors: RuntimeValidationError[] = [];

  if (!survey || typeof survey !== 'object') {
    errors.push({ path: 'survey', message: 'Survey must be an object' });
    return errors;
  }

  const s = survey as Record<string, unknown>;

  // Required string fields
  if (typeof s.id !== 'string' || !s.id) {
    errors.push({ path: 'survey.id', message: 'id must be a non-empty string', expected: 'string', received: typeof s.id });
  }
  if (typeof s.title !== 'string') {
    errors.push({ path: 'survey.title', message: 'title must be a string', expected: 'string', received: typeof s.title });
  }
  if (typeof s.startNodeId !== 'string' || !s.startNodeId) {
    errors.push({ path: 'survey.startNodeId', message: 'startNodeId must be a non-empty string', expected: 'string', received: typeof s.startNodeId });
  }

  // Nodes object
  if (!s.nodes || typeof s.nodes !== 'object') {
    errors.push({ path: 'survey.nodes', message: 'nodes must be an object', expected: 'object', received: typeof s.nodes });
    return errors;
  }

  const nodes = s.nodes as Record<string, unknown>;

  // Validate each node
  for (const [nodeId, node] of Object.entries(nodes)) {
    if (!node || typeof node !== 'object') {
      errors.push({ path: `survey.nodes.${nodeId}`, message: 'node must be an object' });
      continue;
    }

    const n = node as Record<string, unknown>;

    if (typeof n.id !== 'string') {
      errors.push({ path: `survey.nodes.${nodeId}.id`, message: 'id must be a string' });
    }

    const validTypes = ['start', 'question', 'message', 'end'];
    if (!validTypes.includes(n.type as string)) {
      errors.push({ path: `survey.nodes.${nodeId}.type`, message: `type must be one of: ${validTypes.join(', ')}`, received: String(n.type) });
    }

    if (!Array.isArray(n.next)) {
      errors.push({ path: `survey.nodes.${nodeId}.next`, message: 'next must be an array' });
    } else {
      n.next.forEach((step, i) => {
        if (!step || typeof step !== 'object') {
          errors.push({ path: `survey.nodes.${nodeId}.next[${i}]`, message: 'next step must be an object' });
        } else if (typeof (step as Record<string, unknown>).nodeId !== 'string') {
          errors.push({ path: `survey.nodes.${nodeId}.next[${i}].nodeId`, message: 'nodeId must be a string' });
        }
      });
    }

    // Validate question content
    if (n.type === 'question' && n.content) {
      const content = n.content as Record<string, unknown>;
      if (typeof content.question !== 'string') {
        errors.push({ path: `survey.nodes.${nodeId}.content.question`, message: 'question must be a string' });
      }
      if (typeof content.type !== 'string') {
        errors.push({ path: `survey.nodes.${nodeId}.content.type`, message: 'type must be a string' });
      }
    }
  }

  // Verify startNodeId exists in nodes
  if (s.startNodeId && !nodes[s.startNodeId as string]) {
    errors.push({ path: 'survey.startNodeId', message: `startNodeId "${s.startNodeId}" not found in nodes` });
  }

  return errors;
}

/**
 * Validate a single response answer against question type
 */
export function validateAnswer(
  answer: unknown,
  questionType: string,
  content: QuestionContent
): RuntimeValidationError[] {
  const errors: RuntimeValidationError[] = [];

  if (answer === undefined || answer === null) {
    if (content.required) {
      errors.push({ path: 'answer', message: 'Answer is required' });
    }
    return errors;
  }

  switch (questionType) {
    case 'text':
    case 'email':
    case 'phone':
    case 'url':
    case 'color':
      if (typeof answer !== 'string') {
        errors.push({ path: 'answer', message: 'Expected string', received: typeof answer });
      }
      break;

    case 'number':
    case 'rating':
    case 'nps':
    case 'slider':
    case 'percentage':
    case 'currency':
    case 'likert':
      if (typeof answer !== 'number') {
        errors.push({ path: 'answer', message: 'Expected number', received: typeof answer });
      }
      break;

    case 'yesNo':
      if (typeof answer !== 'boolean') {
        errors.push({ path: 'answer', message: 'Expected boolean', received: typeof answer });
      }
      break;

    case 'choice':
    case 'combobox':
    case 'imageChoice':
      if (typeof answer !== 'string') {
        errors.push({ path: 'answer', message: 'Expected string', received: typeof answer });
      }
      break;

    case 'multiChoice':
    case 'multiSelect':
      if (!Array.isArray(answer)) {
        errors.push({ path: 'answer', message: 'Expected array', received: typeof answer });
      }
      break;

    case 'date':
    case 'time':
      if (typeof answer !== 'string') {
        errors.push({ path: 'answer', message: 'Expected string (ISO format)', received: typeof answer });
      }
      break;

    case 'dateRange':
      if (!answer || typeof answer !== 'object') {
        errors.push({ path: 'answer', message: 'Expected object with start/end' });
      } else {
        const range = answer as Record<string, unknown>;
        if (typeof range.start !== 'string') errors.push({ path: 'answer.start', message: 'Expected string' });
        if (typeof range.end !== 'string') errors.push({ path: 'answer.end', message: 'Expected string' });
      }
      break;

    case 'range':
      if (!answer || typeof answer !== 'object') {
        errors.push({ path: 'answer', message: 'Expected object with min/max' });
      } else {
        const range = answer as Record<string, unknown>;
        if (typeof range.min !== 'number') errors.push({ path: 'answer.min', message: 'Expected number' });
        if (typeof range.max !== 'number') errors.push({ path: 'answer.max', message: 'Expected number' });
      }
      break;

    case 'dimensions':
      if (!answer || typeof answer !== 'object') {
        errors.push({ path: 'answer', message: 'Expected object with width/height' });
      } else {
        const dims = answer as Record<string, unknown>;
        if (typeof dims.width !== 'number') errors.push({ path: 'answer.width', message: 'Expected number' });
        if (typeof dims.height !== 'number') errors.push({ path: 'answer.height', message: 'Expected number' });
      }
      break;

    case 'geolocation':
      if (Array.isArray(answer)) {
        answer.forEach((loc, i) => {
          if (!loc || typeof loc !== 'object') {
            errors.push({ path: `answer[${i}]`, message: 'Expected location object' });
          } else {
            const l = loc as Record<string, unknown>;
            if (typeof l.lat !== 'number') errors.push({ path: `answer[${i}].lat`, message: 'Expected number' });
            if (typeof l.lng !== 'number') errors.push({ path: `answer[${i}].lng`, message: 'Expected number' });
          }
        });
      } else if (answer && typeof answer === 'object') {
        const loc = answer as Record<string, unknown>;
        if (typeof loc.lat !== 'number') errors.push({ path: 'answer.lat', message: 'Expected number' });
        if (typeof loc.lng !== 'number') errors.push({ path: 'answer.lng', message: 'Expected number' });
      } else {
        errors.push({ path: 'answer', message: 'Expected location object or array' });
      }
      break;

    case 'matrix':
      if (!answer || typeof answer !== 'object') {
        errors.push({ path: 'answer', message: 'Expected object mapping rows to values' });
      }
      break;
  }

  return errors;
}

// ============================================================================
// Survey Versioning Utilities
// ============================================================================

export interface SurveyVersion {
  version: number;
  survey: GraphSurvey;
  createdAt: Date;
  changeDescription?: string;
}

/**
 * Create a new version of a survey
 */
export function createSurveyVersion(
  survey: GraphSurvey,
  previousVersion: number,
  changeDescription?: string
): SurveyVersion {
  return {
    version: previousVersion + 1,
    survey: cloneSurvey(survey),
    createdAt: new Date(),
    changeDescription
  };
}

/**
 * Compare two surveys and return list of changes
 */
export function diffSurveys(
  oldSurvey: GraphSurvey,
  newSurvey: GraphSurvey
): { added: string[]; removed: string[]; modified: string[] } {
  const oldNodeIds = new Set(Object.keys(oldSurvey.nodes));
  const newNodeIds = new Set(Object.keys(newSurvey.nodes));

  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  // Find added nodes
  for (const nodeId of newNodeIds) {
    if (!oldNodeIds.has(nodeId)) {
      added.push(nodeId);
    }
  }

  // Find removed nodes
  for (const nodeId of oldNodeIds) {
    if (!newNodeIds.has(nodeId)) {
      removed.push(nodeId);
    }
  }

  // Find modified nodes (in both, but different)
  for (const nodeId of oldNodeIds) {
    if (newNodeIds.has(nodeId)) {
      const oldNode = oldSurvey.nodes[nodeId];
      const newNode = newSurvey.nodes[nodeId];
      if (JSON.stringify(oldNode) !== JSON.stringify(newNode)) {
        modified.push(nodeId);
      }
    }
  }

  return { added, removed, modified };
}

/**
 * Check if survey has breaking changes (removed questions that had responses)
 */
export function hasBreakingChanges(
  oldSurvey: GraphSurvey,
  newSurvey: GraphSurvey,
  existingResponses: Array<{ answers: Record<string, unknown> }>
): { breaking: boolean; affectedQuestions: string[] } {
  const { removed } = diffSurveys(oldSurvey, newSurvey);

  // Check if any removed nodes have existing responses
  const affectedQuestions: string[] = [];
  for (const nodeId of removed) {
    const hasResponses = existingResponses.some(r => r.answers[nodeId] !== undefined);
    if (hasResponses) {
      affectedQuestions.push(nodeId);
    }
  }

  return {
    breaking: affectedQuestions.length > 0,
    affectedQuestions
  };
}

// ============================================================================
// Response Normalization
// ============================================================================

/**
 * Normalize a response answer to a consistent format
 */
export function normalizeAnswer(answer: unknown, questionType: string): unknown {
  if (answer === undefined || answer === null) {
    return null;
  }

  switch (questionType) {
    case 'text':
    case 'email':
    case 'phone':
    case 'url':
      return typeof answer === 'string' ? answer.trim() : String(answer);

    case 'number':
    case 'rating':
    case 'nps':
    case 'slider':
    case 'percentage':
    case 'currency':
    case 'likert':
      return typeof answer === 'number' ? answer : Number(answer);

    case 'yesNo':
      if (typeof answer === 'boolean') return answer;
      if (answer === 'true' || answer === 'yes' || answer === '1') return true;
      if (answer === 'false' || answer === 'no' || answer === '0') return false;
      return Boolean(answer);

    case 'multiChoice':
    case 'multiSelect':
      if (Array.isArray(answer)) return answer;
      if (typeof answer === 'string') return answer.split(',').map(s => s.trim());
      return [answer];

    case 'date':
      if (answer instanceof Date) return answer.toISOString().split('T')[0];
      if (typeof answer === 'string') return answer;
      return null;

    case 'time':
      if (typeof answer === 'string') {
        // Normalize to HH:mm format
        const match = answer.match(/(\d{1,2}):(\d{2})/);
        if (match) {
          return `${match[1].padStart(2, '0')}:${match[2]}`;
        }
      }
      return answer;

    default:
      return answer;
  }
}

/**
 * Normalize all answers in a response
 */
export function normalizeResponse(
  answers: Record<string, unknown>,
  survey: GraphSurvey
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [nodeId, answer] of Object.entries(answers)) {
    const node = survey.nodes[nodeId];
    if (node && node.type === 'question' && isQuestionContent(node.content)) {
      normalized[nodeId] = normalizeAnswer(answer, node.content.type);
    } else {
      normalized[nodeId] = answer;
    }
  }

  return normalized;
}

// ============================================================================
// Undo/Redo History
// ============================================================================

export interface SurveyHistoryState {
  survey: GraphSurvey;
  timestamp: number;
  action: string;
}

export interface SurveyHistory {
  states: SurveyHistoryState[];
  currentIndex: number;
  maxSize: number;
}

/**
 * Create a new history tracker
 */
export function createHistory(initialSurvey: GraphSurvey, maxSize = 50): SurveyHistory {
  return {
    states: [{
      survey: cloneSurvey(initialSurvey),
      timestamp: Date.now(),
      action: 'initial'
    }],
    currentIndex: 0,
    maxSize
  };
}

/**
 * Push a new state to history
 */
export function pushHistory(
  history: SurveyHistory,
  survey: GraphSurvey,
  action: string
): SurveyHistory {
  // Remove any states after current index (discard redo stack)
  const states = history.states.slice(0, history.currentIndex + 1);

  // Add new state
  states.push({
    survey: cloneSurvey(survey),
    timestamp: Date.now(),
    action
  });

  // Trim to max size
  while (states.length > history.maxSize) {
    states.shift();
  }

  return {
    ...history,
    states,
    currentIndex: states.length - 1
  };
}

/**
 * Undo to previous state
 */
export function undo(history: SurveyHistory): { history: SurveyHistory; survey: GraphSurvey | null } {
  if (history.currentIndex <= 0) {
    return { history, survey: null };
  }

  const newIndex = history.currentIndex - 1;
  return {
    history: { ...history, currentIndex: newIndex },
    survey: cloneSurvey(history.states[newIndex].survey)
  };
}

/**
 * Redo to next state
 */
export function redo(history: SurveyHistory): { history: SurveyHistory; survey: GraphSurvey | null } {
  if (history.currentIndex >= history.states.length - 1) {
    return { history, survey: null };
  }

  const newIndex = history.currentIndex + 1;
  return {
    history: { ...history, currentIndex: newIndex },
    survey: cloneSurvey(history.states[newIndex].survey)
  };
}

/**
 * Check if undo is available
 */
export function canUndo(history: SurveyHistory): boolean {
  return history.currentIndex > 0;
}

/**
 * Check if redo is available
 */
export function canRedo(history: SurveyHistory): boolean {
  return history.currentIndex < history.states.length - 1;
}

// ============================================================================
// Localization Helpers
// ============================================================================

export interface LocalizedStrings {
  [key: string]: string;
}

export interface SurveyLocalization {
  locale: string;
  strings: LocalizedStrings;
}

/**
 * Extract all translatable strings from a survey
 */
export function extractTranslatableStrings(survey: GraphSurvey): LocalizedStrings {
  const strings: LocalizedStrings = {};

  // Survey title and description
  if (survey.title) strings[`survey.title`] = survey.title;
  if (survey.description) strings[`survey.description`] = survey.description;

  // Node content
  for (const [nodeId, node] of Object.entries(survey.nodes)) {
    if (isQuestionContent(node.content)) {
      const content = node.content;
      strings[`${nodeId}.question`] = content.question;
      if (content.description) strings[`${nodeId}.description`] = content.description;
      if (content.placeholder) strings[`${nodeId}.placeholder`] = content.placeholder;

      // Options
      if (content.options) {
        content.options.forEach((opt, i) => {
          strings[`${nodeId}.options.${i}.label`] = opt.label;
        });
      }

      // Image options
      if (content.imageOptions) {
        content.imageOptions.forEach((opt, i) => {
          strings[`${nodeId}.imageOptions.${i}.label`] = opt.label;
        });
      }

      // Matrix rows/columns
      if (content.matrixRows) {
        content.matrixRows.forEach((row, i) => {
          strings[`${nodeId}.matrixRows.${i}`] = row;
        });
      }
      if (content.matrixColumns) {
        content.matrixColumns.forEach((col, i) => {
          strings[`${nodeId}.matrixColumns.${i}`] = col;
        });
      }

      // Likert labels
      if (content.likertLabels) {
        strings[`${nodeId}.likertLabels.start`] = content.likertLabels.start;
        strings[`${nodeId}.likertLabels.end`] = content.likertLabels.end;
      }
    } else if (node.content && 'message' in node.content) {
      const content = node.content;
      strings[`${nodeId}.message`] = content.message;
      if (content.title) strings[`${nodeId}.title`] = content.title;
    }
  }

  return strings;
}

/**
 * Apply localized strings to a survey
 */
export function applyLocalization(
  survey: GraphSurvey,
  localization: SurveyLocalization
): GraphSurvey {
  const localized = cloneSurvey(survey);
  const { strings } = localization;

  // Survey title and description
  if (strings['survey.title']) localized.title = strings['survey.title'];
  if (strings['survey.description']) localized.description = strings['survey.description'];

  // Node content
  for (const [nodeId, node] of Object.entries(localized.nodes)) {
    if (isQuestionContent(node.content)) {
      const content = node.content;
      if (strings[`${nodeId}.question`]) content.question = strings[`${nodeId}.question`];
      if (strings[`${nodeId}.description`]) content.description = strings[`${nodeId}.description`];
      if (strings[`${nodeId}.placeholder`]) content.placeholder = strings[`${nodeId}.placeholder`];

      // Options
      if (content.options) {
        content.options.forEach((opt, i) => {
          const key = `${nodeId}.options.${i}.label`;
          if (strings[key]) opt.label = strings[key];
        });
      }

      // Image options
      if (content.imageOptions) {
        content.imageOptions.forEach((opt, i) => {
          const key = `${nodeId}.imageOptions.${i}.label`;
          if (strings[key]) opt.label = strings[key];
        });
      }

      // Matrix rows/columns
      if (content.matrixRows) {
        content.matrixRows = content.matrixRows.map((_, i) =>
          strings[`${nodeId}.matrixRows.${i}`] || content.matrixRows![i]
        );
      }
      if (content.matrixColumns) {
        content.matrixColumns = content.matrixColumns.map((_, i) =>
          strings[`${nodeId}.matrixColumns.${i}`] || content.matrixColumns![i]
        );
      }

      // Likert labels
      if (content.likertLabels) {
        if (strings[`${nodeId}.likertLabels.start`]) content.likertLabels.start = strings[`${nodeId}.likertLabels.start`];
        if (strings[`${nodeId}.likertLabels.end`]) content.likertLabels.end = strings[`${nodeId}.likertLabels.end`];
      }
    } else if (node.content && 'message' in node.content) {
      const content = node.content;
      if (strings[`${nodeId}.message`]) content.message = strings[`${nodeId}.message`];
      if (strings[`${nodeId}.title`]) content.title = strings[`${nodeId}.title`];
    }
  }

  return localized;
}