/**
 * Survey Engine Unit Tests
 *
 * Tests for types, utils, and validation functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateSurveyToken,
  generateNodeId,
  generateEdgeId,
  generateOptionId,
  createDefaultSurvey,
  createQuestionNode,
  interpolateContext,
  cloneSurvey,
  calculateSurveyAnalytics,
  exportResponsesToCSV,
  getQuestionById,
  countQuestions,
  validateSurvey,
  estimateSurveyTime
} from '../src/utils';
import {
  isQuestionContent,
  isMessageContent,
  isQuestionNode,
  isMessageNode,
  type GraphSurvey,
  type SurveyNode,
  type QuestionContent,
  type MessageContent
} from '../src/types';

// ============================================================================
// §1 ID Generation Tests
// ============================================================================

describe('ID Generation', () => {
  describe('generateSurveyToken', () => {
    it('should generate a 10-character alphanumeric token', () => {
      const token = generateSurveyToken();
      expect(token).toHaveLength(10);
      expect(token).toMatch(/^[0-9A-Za-z]+$/);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set(Array.from({ length: 100 }, () => generateSurveyToken()));
      expect(tokens.size).toBe(100);
    });
  });

  describe('generateNodeId', () => {
    it('should generate node ID with prefix', () => {
      const nodeId = generateNodeId();
      expect(nodeId).toMatch(/^node_[0-9A-Za-z]{10}$/);
    });
  });

  describe('generateEdgeId', () => {
    it('should generate edge ID from source and target', () => {
      const edgeId = generateEdgeId('node_a', 'node_b');
      expect(edgeId).toMatch(/^node_a-node_b-[0-9A-Za-z]{6}$/);
    });
  });

  describe('generateOptionId', () => {
    it('should generate option ID with prefix', () => {
      const optionId = generateOptionId();
      expect(optionId).toMatch(/^opt_[0-9A-Za-z]{10}$/);
    });
  });
});

// ============================================================================
// §2 Type Guards Tests
// ============================================================================

describe('Type Guards', () => {
  describe('isQuestionContent', () => {
    it('should return true for valid QuestionContent', () => {
      const content: QuestionContent = {
        question: 'What is your name?',
        type: 'text'
      };
      expect(isQuestionContent(content)).toBe(true);
    });

    it('should return false for MessageContent', () => {
      const content: MessageContent = {
        message: 'Welcome!',
        title: 'Hello'
      };
      expect(isQuestionContent(content)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isQuestionContent(undefined)).toBe(false);
    });
  });

  describe('isMessageContent', () => {
    it('should return true for valid MessageContent', () => {
      const content: MessageContent = {
        message: 'Thank you!',
        title: 'Complete'
      };
      expect(isMessageContent(content)).toBe(true);
    });

    it('should return false for QuestionContent', () => {
      const content: QuestionContent = {
        question: 'Rate us',
        type: 'rating'
      };
      expect(isMessageContent(content)).toBe(false);
    });
  });

  describe('isQuestionNode', () => {
    it('should return true for question node with QuestionContent', () => {
      const node: SurveyNode = {
        id: 'node_1',
        type: 'question',
        content: { question: 'How are you?', type: 'text' },
        next: []
      };
      expect(isQuestionNode(node)).toBe(true);
    });

    it('should return false for start node', () => {
      const node: SurveyNode = {
        id: 'node_1',
        type: 'start',
        content: { message: 'Welcome', title: 'Start' },
        next: []
      };
      expect(isQuestionNode(node)).toBe(false);
    });
  });

  describe('isMessageNode', () => {
    it('should return true for start node with MessageContent', () => {
      const node: SurveyNode = {
        id: 'node_1',
        type: 'start',
        content: { message: 'Welcome!' },
        next: []
      };
      expect(isMessageNode(node)).toBe(true);
    });

    it('should return true for end node', () => {
      const node: SurveyNode = {
        id: 'node_1',
        type: 'end',
        content: { message: 'Thank you!' },
        next: []
      };
      expect(isMessageNode(node)).toBe(true);
    });

    it('should return false for question node', () => {
      const node: SurveyNode = {
        id: 'node_1',
        type: 'question',
        content: { question: 'Name?', type: 'text' },
        next: []
      };
      expect(isMessageNode(node)).toBe(false);
    });
  });
});

// ============================================================================
// §3 Survey Creation Tests
// ============================================================================

describe('Survey Creation', () => {
  describe('createDefaultSurvey', () => {
    it('should create a survey with start and end nodes', () => {
      const survey = createDefaultSurvey();

      expect(survey.id).toBeDefined();
      expect(survey.title).toBe('New Survey');
      expect(survey.startNodeId).toBeDefined();
      expect(Object.keys(survey.nodes)).toHaveLength(2);

      const startNode = survey.nodes[survey.startNodeId];
      expect(startNode.type).toBe('start');
      expect(startNode.next).toHaveLength(1);

      const endNodeId = startNode.next[0].nodeId;
      const endNode = survey.nodes[endNodeId];
      expect(endNode.type).toBe('end');
      expect(endNode.next).toHaveLength(0);
    });
  });

  describe('createQuestionNode', () => {
    it('should create a text question with placeholder', () => {
      const node = createQuestionNode('text', 'What is your name?');
      const content = node.content as QuestionContent;

      expect(node.type).toBe('question');
      expect(content.question).toBe('What is your name?');
      expect(content.type).toBe('text');
      expect(content.required).toBe(true);
      expect(content.placeholder).toBe('Enter your answer here...');
    });

    it('should create a rating question with min/max', () => {
      const node = createQuestionNode('rating', 'Rate our service');
      const content = node.content as QuestionContent;

      expect(content.type).toBe('rating');
      expect(content.min).toBe(1);
      expect(content.max).toBe(5);
    });

    it('should create an NPS question with 0-10 range', () => {
      const node = createQuestionNode('nps', 'How likely to recommend?');
      const content = node.content as QuestionContent;

      expect(content.type).toBe('nps');
      expect(content.min).toBe(0);
      expect(content.max).toBe(10);
    });

    it('should create a choice question with default options', () => {
      const node = createQuestionNode('choice', 'Select one');
      const content = node.content as QuestionContent;

      expect(content.type).toBe('choice');
      expect(content.options).toHaveLength(2);
      expect(content.options![0].label).toBe('Option 1');
      expect(content.options![1].label).toBe('Option 2');
    });

    it('should create a multiSelect with placeholder and searchable', () => {
      const node = createQuestionNode('multiSelect', 'Select multiple');
      const content = node.content as QuestionContent;

      expect(content.type).toBe('multiSelect');
      expect(content.placeholder).toBe('Select options...');
      expect(content.options).toHaveLength(2);
    });

    it('should create a combobox with searchable enabled', () => {
      const node = createQuestionNode('combobox', 'Search and select');
      const content = node.content as QuestionContent;

      expect(content.type).toBe('combobox');
      expect(content.searchable).toBe(true);
      expect(content.placeholder).toBe('Select or search...');
    });

    it('should create a date question with format', () => {
      const node = createQuestionNode('date', 'Select date');
      const content = node.content as QuestionContent;

      expect(content.type).toBe('date');
      expect(content.dateFormat).toBe('PPP');
    });

    it('should create a dateRange question with numberOfMonths', () => {
      const node = createQuestionNode('dateRange', 'Select range');
      const content = node.content as QuestionContent;

      expect(content.type).toBe('dateRange');
      expect(content.numberOfMonths).toBe(2);
      expect(content.startDatePlaceholder).toBe('Start date');
      expect(content.endDatePlaceholder).toBe('End date');
    });

    it('should create a time question with format', () => {
      const node = createQuestionNode('time', 'Select time');
      const content = node.content as QuestionContent;

      expect(content.type).toBe('time');
      expect(content.timeFormat).toBe('12');
    });

    it('should create a number question with step', () => {
      const node = createQuestionNode('number', 'Enter number');
      const content = node.content as QuestionContent;

      expect(content.type).toBe('number');
      expect(content.step).toBe(1);
      expect(content.min).toBe(0);
    });

    it('should create a slider question with range', () => {
      const node = createQuestionNode('slider', 'Select value');
      const content = node.content as QuestionContent;

      expect(content.type).toBe('slider');
      expect(content.sliderMin).toBe(0);
      expect(content.sliderMax).toBe(100);
      expect(content.sliderStep).toBe(1);
      expect(content.sliderShowValue).toBe(true);
    });

    it('should create a likert question with scale', () => {
      const node = createQuestionNode('likert', 'Rate agreement');
      const content = node.content as QuestionContent;

      expect(content.type).toBe('likert');
      expect(content.likertScale).toBe(5);
      expect(content.likertLabels).toEqual({
        start: 'Strongly Disagree',
        end: 'Strongly Agree'
      });
    });

    it('should create a matrix question with rows and columns', () => {
      const node = createQuestionNode('matrix', 'Rate aspects');
      const content = node.content as QuestionContent;

      expect(content.type).toBe('matrix');
      expect(content.matrixRows).toHaveLength(2);
      expect(content.matrixColumns).toHaveLength(3);
      expect(content.matrixType).toBe('radio');
    });

    it('should create an imageChoice question with imageOptions', () => {
      const node = createQuestionNode('imageChoice', 'Pick an image');
      const content = node.content as QuestionContent;

      expect(content.type).toBe('imageChoice');
      expect(content.imageOptions).toHaveLength(2);
      expect(content.imageOptions![0].imageUrl).toBe('/placeholder-1.png');
    });

    it('should create a geolocation question with defaults', () => {
      const node = createQuestionNode('geolocation', 'Select location');
      const content = node.content as QuestionContent;

      expect(content.type).toBe('geolocation');
      expect(content.geolocationDefaultZoom).toBe(13);
      expect(content.geolocationMapHeight).toBe('400px');
      expect(content.geolocationEnableUserLocation).toBe(true);
      expect(content.geolocationMaxLocations).toBe(1);
    });

    it('should create an email question with validation', () => {
      const node = createQuestionNode('email', 'Enter email');
      const content = node.content as QuestionContent;

      expect(content.type).toBe('email');
      expect(content.emailValidation).toBe('basic');
      expect(content.enforceValidation).toBe(true);
    });

    it('should create a phone question with country code', () => {
      const node = createQuestionNode('phone', 'Enter phone');
      const content = node.content as QuestionContent;

      expect(content.type).toBe('phone');
      expect(content.countryCode).toBe('US');
      expect(content.enforceValidation).toBe(true);
    });

    it('should create a currency question with defaults', () => {
      const node = createQuestionNode('currency', 'Enter amount');
      const content = node.content as QuestionContent;

      expect(content.type).toBe('currency');
      expect(content.currency).toBe('USD');
      expect(content.currencyPosition).toBe('before');
    });

    it('should create a fileDropzone question with settings', () => {
      const node = createQuestionNode('fileDropzone', 'Upload file');
      const content = node.content as QuestionContent;

      expect(content.type).toBe('fileDropzone');
      expect(content.accept).toBe('*/*');
      expect(content.maxFileSize).toBe(5242880); // 5MB
      expect(content.multiple).toBe(false);
    });

    it('should create a yesNo question', () => {
      const node = createQuestionNode('yesNo', 'Agree?');
      const content = node.content as QuestionContent;

      expect(content.type).toBe('yesNo');
      expect(content.placeholder).toBe('Select your answer');
    });

    it('should create a percentage question', () => {
      const node = createQuestionNode('percentage', 'Completion rate');
      const content = node.content as QuestionContent;

      expect(content.type).toBe('percentage');
      expect(content.percentageDecimals).toBe(0);
    });

    it('should create a dimensions question', () => {
      const node = createQuestionNode('dimensions', 'Enter size');
      const content = node.content as QuestionContent;

      expect(content.type).toBe('dimensions');
      expect(content.dimensionType).toBe('2d');
      expect(content.dimensionUnits).toBe('px');
    });
  });
});

// ============================================================================
// §4 Survey Utilities Tests
// ============================================================================

describe('Survey Utilities', () => {
  describe('interpolateContext', () => {
    it('should replace context variables in text', () => {
      const text = 'Hello {{userName}}, welcome to {{organizationName}}!';
      const context = { userName: 'John', organizationName: 'Acme Corp' };

      const result = interpolateContext(text, context);
      expect(result).toBe('Hello John, welcome to Acme Corp!');
    });

    it('should leave unmatched variables unchanged', () => {
      const text = 'Hello {{userName}}, your ID is {{userId}}';
      const context = { userName: 'Jane' };

      const result = interpolateContext(text, context);
      expect(result).toBe('Hello Jane, your ID is {{userId}}');
    });

    it('should handle empty context', () => {
      const text = 'Hello {{name}}!';
      const result = interpolateContext(text, {});
      expect(result).toBe('Hello {{name}}!');
    });
  });

  describe('cloneSurvey', () => {
    it('should create a deep clone with new IDs', () => {
      const original = createDefaultSurvey();
      const clone = cloneSurvey(original);

      expect(clone.id).not.toBe(original.id);
      expect(clone.startNodeId).not.toBe(original.startNodeId);
      expect(clone.title).toBe(original.title);

      // Node IDs should be different
      const originalNodeIds = Object.keys(original.nodes);
      const cloneNodeIds = Object.keys(clone.nodes);

      for (const originalId of originalNodeIds) {
        expect(cloneNodeIds).not.toContain(originalId);
      }
    });

    it('should preserve node connections with updated IDs', () => {
      const original = createDefaultSurvey();
      const clone = cloneSurvey(original);

      const cloneStartNode = clone.nodes[clone.startNodeId];
      expect(cloneStartNode.next).toHaveLength(1);
      expect(clone.nodes[cloneStartNode.next[0].nodeId]).toBeDefined();
    });
  });

  describe('countQuestions', () => {
    it('should count only question nodes', () => {
      const survey = createDefaultSurvey();
      expect(countQuestions(survey)).toBe(0);

      // Add a question
      const questionNode = createQuestionNode('text', 'Name?');
      survey.nodes[questionNode.id] = questionNode;

      expect(countQuestions(survey)).toBe(1);
    });
  });

  describe('getQuestionById', () => {
    it('should return question node and content', () => {
      const survey = createDefaultSurvey();
      const questionNode = createQuestionNode('rating', 'Rate us');
      survey.nodes[questionNode.id] = questionNode;

      const result = getQuestionById(survey, questionNode.id);
      expect(result).not.toBeNull();
      expect(result!.node.id).toBe(questionNode.id);
      expect(result!.content.type).toBe('rating');
    });

    it('should return null for non-question node', () => {
      const survey = createDefaultSurvey();
      const result = getQuestionById(survey, survey.startNodeId);
      expect(result).toBeNull();
    });

    it('should return null for non-existent node', () => {
      const survey = createDefaultSurvey();
      const result = getQuestionById(survey, 'non_existent');
      expect(result).toBeNull();
    });
  });

  describe('estimateSurveyTime', () => {
    it('should estimate time for empty survey', () => {
      const survey = createDefaultSurvey();
      const minutes = estimateSurveyTime(survey);
      expect(minutes).toBeGreaterThan(0); // Start/end nodes have reading time
    });

    it('should increase time for more questions', () => {
      const survey = createDefaultSurvey();

      // Add many questions to ensure time increases beyond rounding
      const questions = [
        createQuestionNode('text', 'Name?'),
        createQuestionNode('text', 'Email?'),
        createQuestionNode('text', 'Address?'),
        createQuestionNode('rating', 'Rate service?'),
        createQuestionNode('rating', 'Rate quality?'),
        createQuestionNode('matrix', 'Rate aspects?'),
      ];

      for (const q of questions) {
        survey.nodes[q.id] = q;
      }

      const time = estimateSurveyTime(survey);
      // With 6 questions including matrix, should be at least 2 minutes
      expect(time).toBeGreaterThanOrEqual(2);
    });

    it('should account for matrix rows', () => {
      const survey = createDefaultSurvey();
      const matrixNode = createQuestionNode('matrix', 'Rate aspects');
      (matrixNode.content as QuestionContent).matrixRows = ['A', 'B', 'C', 'D', 'E'];
      survey.nodes[matrixNode.id] = matrixNode;

      const time = estimateSurveyTime(survey);
      expect(time).toBeGreaterThan(0);
    });

    it('should account for geolocation multi-location', () => {
      const survey = createDefaultSurvey();
      const geoNode = createQuestionNode('geolocation', 'Select locations');
      (geoNode.content as QuestionContent).geolocationMaxLocations = 5;
      survey.nodes[geoNode.id] = geoNode;

      const time = estimateSurveyTime(survey);
      expect(time).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// §5 Survey Validation Tests
// ============================================================================

describe('Survey Validation', () => {
  describe('validateSurvey', () => {
    it('should validate a correct survey', () => {
      const survey = createDefaultSurvey();
      const result = validateSurvey(survey);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing start node', () => {
      const survey = createDefaultSurvey();
      survey.startNodeId = 'non_existent';

      const result = validateSurvey(survey);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_START_NODE')).toBe(true);
    });

    it('should detect missing end node', () => {
      const survey = createDefaultSurvey();
      // Remove end node
      const startNode = survey.nodes[survey.startNodeId];
      const endNodeId = startNode.next[0].nodeId;
      delete survey.nodes[endNodeId];
      startNode.next = [];

      const result = validateSurvey(survey);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_END_NODE')).toBe(true);
    });

    it('should detect invalid next reference', () => {
      const survey = createDefaultSurvey();
      const startNode = survey.nodes[survey.startNodeId];
      startNode.next = [{ nodeId: 'invalid_node' }];

      const result = validateSurvey(survey);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_NEXT_REFERENCE')).toBe(true);
    });

    it('should warn about unreachable nodes', () => {
      const survey = createDefaultSurvey();
      const orphanNode: SurveyNode = {
        id: 'orphan_node',
        type: 'question',
        content: { question: 'Unreachable', type: 'text' },
        next: []
      };
      survey.nodes[orphanNode.id] = orphanNode;

      const result = validateSurvey(survey);
      // UNREACHABLE_NODE is now an error, not a warning (dead nodes are always mistakes)
      expect(result.errors.some(e => e.code === 'UNREACHABLE_NODE')).toBe(true);
      expect(result.isValid).toBe(false);
    });

    it('should detect empty question text', () => {
      const survey = createDefaultSurvey();
      const questionNode: SurveyNode = {
        id: 'q1',
        type: 'question',
        content: { question: '', type: 'text' },
        next: []
      };
      survey.nodes[questionNode.id] = questionNode;
      // Connect it
      survey.nodes[survey.startNodeId].next = [{ nodeId: questionNode.id }];

      const result = validateSurvey(survey);
      expect(result.errors.some(e => e.code === 'EMPTY_QUESTION')).toBe(true);
    });

    it('should detect choice question without options', () => {
      const survey = createDefaultSurvey();
      const questionNode: SurveyNode = {
        id: 'q1',
        type: 'question',
        content: { question: 'Select one', type: 'choice', options: [] },
        next: []
      };
      survey.nodes[questionNode.id] = questionNode;
      survey.nodes[survey.startNodeId].next = [{ nodeId: questionNode.id }];

      const result = validateSurvey(survey);
      expect(result.errors.some(e => e.code === 'MISSING_OPTIONS')).toBe(true);
    });

    it('should detect imageChoice without imageOptions', () => {
      const survey = createDefaultSurvey();
      const questionNode: SurveyNode = {
        id: 'q1',
        type: 'question',
        content: { question: 'Pick image', type: 'imageChoice', imageOptions: [] },
        next: []
      };
      survey.nodes[questionNode.id] = questionNode;
      survey.nodes[survey.startNodeId].next = [{ nodeId: questionNode.id }];

      const result = validateSurvey(survey);
      expect(result.errors.some(e => e.code === 'MISSING_OPTIONS')).toBe(true);
    });

    it('should warn about circular references', () => {
      const survey = createDefaultSurvey();
      const endNodeId = survey.nodes[survey.startNodeId].next[0].nodeId;

      const node1: SurveyNode = {
        id: 'node1',
        type: 'question',
        content: { question: 'Q1', type: 'text' },
        next: [{ nodeId: 'node2' }]
      };
      const node2: SurveyNode = {
        id: 'node2',
        type: 'question',
        content: { question: 'Q2', type: 'text' },
        next: [
          { nodeId: 'node1' }, // Circular back to node1!
          { nodeId: endNodeId } // Also path to end
        ]
      };
      survey.nodes[node1.id] = node1;
      survey.nodes[node2.id] = node2;
      survey.nodes[survey.startNodeId].next = [{ nodeId: node1.id }];

      const result = validateSurvey(survey);
      expect(result.warnings.some(w => w.code === 'CIRCULAR_REFERENCE')).toBe(true);
    });

    it('should detect cycles in complex diamond graphs', () => {
      // Diamond with cycle: start -> A -> B -> D -> A (cycle)
      //                          -> C -> D
      const survey = createDefaultSurvey();
      const endNodeId = survey.nodes[survey.startNodeId].next[0].nodeId;

      const nodeA: SurveyNode = {
        id: 'nodeA',
        type: 'question',
        content: { question: 'A', type: 'text' },
        next: [{ nodeId: 'nodeB' }, { nodeId: 'nodeC' }]
      };
      const nodeB: SurveyNode = {
        id: 'nodeB',
        type: 'question',
        content: { question: 'B', type: 'text' },
        next: [{ nodeId: 'nodeD' }]
      };
      const nodeC: SurveyNode = {
        id: 'nodeC',
        type: 'question',
        content: { question: 'C', type: 'text' },
        next: [{ nodeId: 'nodeD' }]
      };
      const nodeD: SurveyNode = {
        id: 'nodeD',
        type: 'question',
        content: { question: 'D', type: 'text' },
        next: [{ nodeId: 'nodeA' }, { nodeId: endNodeId }] // Cycle back to A!
      };

      survey.nodes[nodeA.id] = nodeA;
      survey.nodes[nodeB.id] = nodeB;
      survey.nodes[nodeC.id] = nodeC;
      survey.nodes[nodeD.id] = nodeD;
      survey.nodes[survey.startNodeId].next = [{ nodeId: nodeA.id }];

      const result = validateSurvey(survey);
      expect(result.warnings.some(w => w.code === 'CIRCULAR_REFERENCE')).toBe(true);
      // Should still be valid (cycles are warnings, not errors)
      expect(result.isValid).toBe(true);
    });

    it('should handle self-referencing nodes', () => {
      const survey = createDefaultSurvey();
      const endNodeId = survey.nodes[survey.startNodeId].next[0].nodeId;

      const selfRef: SurveyNode = {
        id: 'selfRef',
        type: 'question',
        content: { question: 'Retry?', type: 'yesNo' },
        next: [
          { nodeId: 'selfRef' }, // Points to itself!
          { nodeId: endNodeId }
        ]
      };

      survey.nodes[selfRef.id] = selfRef;
      survey.nodes[survey.startNodeId].next = [{ nodeId: selfRef.id }];

      const result = validateSurvey(survey);
      expect(result.warnings.some(w => w.code === 'CIRCULAR_REFERENCE' && w.nodeId === 'selfRef')).toBe(true);
    });
  });
});

// ============================================================================
// §6 Analytics Tests
// ============================================================================

describe('Survey Analytics', () => {
  let survey: GraphSurvey;

  beforeEach(() => {
    survey = createDefaultSurvey();
    const ratingQ = createQuestionNode('rating', 'Rate us');
    const choiceQ = createQuestionNode('choice', 'Pick one');

    survey.nodes[ratingQ.id] = ratingQ;
    survey.nodes[choiceQ.id] = choiceQ;

    // Wire up: start -> rating -> choice -> end
    const endNodeId = survey.nodes[survey.startNodeId].next[0].nodeId;
    survey.nodes[survey.startNodeId].next = [{ nodeId: ratingQ.id }];
    ratingQ.next = [{ nodeId: choiceQ.id }];
    choiceQ.next = [{ nodeId: endNodeId }];
  });

  describe('calculateSurveyAnalytics', () => {
    it('should calculate basic analytics', () => {
      const ratingNodeId = Object.keys(survey.nodes).find(
        id => (survey.nodes[id].content as QuestionContent)?.type === 'rating'
      )!;
      const choiceNodeId = Object.keys(survey.nodes).find(
        id => (survey.nodes[id].content as QuestionContent)?.type === 'choice'
      )!;

      const responses = [
        { answers: { [ratingNodeId]: 5, [choiceNodeId]: 'option1' }, metadata: { duration: 60 } },
        { answers: { [ratingNodeId]: 4, [choiceNodeId]: 'option2' }, metadata: { duration: 45 } },
        { answers: { [ratingNodeId]: 3 }, metadata: { duration: 30 } }
      ];

      const analytics = calculateSurveyAnalytics('template_1', responses, survey);

      expect(analytics.totalResponses).toBe(3);
      expect(analytics.completionRate).toBe(100); // All have at least one answer
      expect(analytics.avgDuration).toBe(45);
      expect(analytics.questionStats[ratingNodeId].avgValue).toBe(4);
      expect(analytics.questionStats[choiceNodeId].distribution).toBeDefined();
    });

    it('should handle empty responses', () => {
      const analytics = calculateSurveyAnalytics('template_1', [], survey);

      expect(analytics.totalResponses).toBe(0);
      expect(analytics.completionRate).toBe(0);
      expect(analytics.avgDuration).toBe(0);
    });

    it('should calculate NPS distribution', () => {
      const npsQ = createQuestionNode('nps', 'Recommend?');
      survey.nodes[npsQ.id] = npsQ;

      const responses = [
        { answers: { [npsQ.id]: 9 } },
        { answers: { [npsQ.id]: 10 } },
        { answers: { [npsQ.id]: 7 } },
        { answers: { [npsQ.id]: 3 } }
      ];

      const analytics = calculateSurveyAnalytics('template_1', responses, survey);
      const stats = analytics.questionStats[npsQ.id];

      expect(stats.avgValue).toBeCloseTo(7.25);
      expect(stats.distribution).toBeDefined();
      expect(stats.distribution!['9']).toBe(1);
      expect(stats.distribution!['10']).toBe(1);
    });

    it('should handle multiChoice arrays', () => {
      const multiQ = createQuestionNode('multiChoice', 'Select many');
      survey.nodes[multiQ.id] = multiQ;

      const responses = [
        { answers: { [multiQ.id]: ['a', 'b'] } },
        { answers: { [multiQ.id]: ['b', 'c'] } },
        { answers: { [multiQ.id]: ['a'] } }
      ];

      const analytics = calculateSurveyAnalytics('template_1', responses, survey);
      const stats = analytics.questionStats[multiQ.id];

      expect(stats.distribution!['a']).toBe(2);
      expect(stats.distribution!['b']).toBe(2);
      expect(stats.distribution!['c']).toBe(1);
    });

    it('should handle yesNo boolean values', () => {
      const yesNoQ = createQuestionNode('yesNo', 'Agree?');
      survey.nodes[yesNoQ.id] = yesNoQ;

      const responses = [
        { answers: { [yesNoQ.id]: true } },
        { answers: { [yesNoQ.id]: true } },
        { answers: { [yesNoQ.id]: false } }
      ];

      const analytics = calculateSurveyAnalytics('template_1', responses, survey);
      const stats = analytics.questionStats[yesNoQ.id];

      expect(stats.distribution!['Yes']).toBe(2);
      expect(stats.distribution!['No']).toBe(1);
    });
  });
});

// ============================================================================
// §7 CSV Export Tests
// ============================================================================

describe('CSV Export', () => {
  describe('exportResponsesToCSV', () => {
    it('should generate valid CSV with headers', () => {
      const survey = createDefaultSurvey();
      const textQ = createQuestionNode('text', 'Your name?');
      survey.nodes[textQ.id] = textQ;

      const responses = [
        {
          id: 'resp_1',
          answers: { [textQ.id]: 'John' },
          completedAt: new Date('2024-01-15T10:00:00Z')
        }
      ];

      const csv = exportResponsesToCSV(responses, survey);
      const lines = csv.split('\n');

      expect(lines[0]).toContain('Response ID');
      expect(lines[0]).toContain('Completed At');
      expect(lines[0]).toContain('Your name?');
      expect(lines[1]).toContain('resp_1');
      expect(lines[1]).toContain('John');
    });

    it('should escape quotes in values', () => {
      const survey = createDefaultSurvey();
      const textQ = createQuestionNode('text', 'Comments');
      survey.nodes[textQ.id] = textQ;

      const responses = [
        {
          id: 'resp_1',
          answers: { [textQ.id]: 'He said "hello"' },
          completedAt: new Date()
        }
      ];

      const csv = exportResponsesToCSV(responses, survey);
      expect(csv).toContain('""hello""'); // Escaped quotes
    });

    it('should handle array answers', () => {
      const survey = createDefaultSurvey();
      const multiQ = createQuestionNode('multiSelect', 'Tags');
      survey.nodes[multiQ.id] = multiQ;

      const responses = [
        {
          id: 'resp_1',
          answers: { [multiQ.id]: ['tag1', 'tag2', 'tag3'] },
          completedAt: new Date()
        }
      ];

      const csv = exportResponsesToCSV(responses, survey);
      expect(csv).toContain('tag1; tag2; tag3');
    });

    it('should handle date range answers', () => {
      const survey = createDefaultSurvey();
      const dateRangeQ = createQuestionNode('dateRange', 'Period');
      survey.nodes[dateRangeQ.id] = dateRangeQ;

      const responses = [
        {
          id: 'resp_1',
          answers: { [dateRangeQ.id]: { start: '2024-01-01', end: '2024-01-31' } },
          completedAt: new Date()
        }
      ];

      const csv = exportResponsesToCSV(responses, survey);
      expect(csv).toContain('2024-01-01 to 2024-01-31');
    });

    it('should handle geolocation answers', () => {
      const survey = createDefaultSurvey();
      const geoQ = createQuestionNode('geolocation', 'Location');
      survey.nodes[geoQ.id] = geoQ;

      const responses = [
        {
          id: 'resp_1',
          answers: { [geoQ.id]: { lat: 51.505, lng: -0.09 } },
          completedAt: new Date()
        }
      ];

      const csv = exportResponsesToCSV(responses, survey);
      expect(csv).toContain('51.505,-0.09');
    });

    it('should handle multi-location geolocation', () => {
      const survey = createDefaultSurvey();
      const geoQ = createQuestionNode('geolocation', 'Locations');
      (geoQ.content as QuestionContent).geolocationMaxLocations = 3;
      survey.nodes[geoQ.id] = geoQ;

      const responses = [
        {
          id: 'resp_1',
          answers: {
            [geoQ.id]: [
              { lat: 51.5, lng: -0.1, label: 'Home' },
              { lat: 51.6, lng: -0.2, label: 'Work' }
            ]
          },
          completedAt: new Date()
        }
      ];

      const csv = exportResponsesToCSV(responses, survey);
      expect(csv).toContain('Home: 51.5,-0.1');
      expect(csv).toContain('Work: 51.6,-0.2');
    });
  });
});
