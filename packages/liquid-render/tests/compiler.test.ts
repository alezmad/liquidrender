/**
 * Compiler Unit Tests
 *
 * Tests for scanner, parser, emitter, and roundtrip functionality
 * for both LiquidSurvey and LiquidCode DSLs
 */

import { describe, it, expect } from 'vitest';
import { SurveyScanner } from '../src/compiler/scanner';
import { SurveyParser } from '../src/compiler/parser';
import { SurveyEmitter } from '../src/compiler/emitter';
import { compile, parse, roundtrip, parseUI, compileUI, roundtripUI, detectFormat, parseAny } from '../src/compiler/compiler';
import { UIScanner } from '../src/compiler/ui-scanner';
import { UIParser } from '../src/compiler/ui-parser';
import { UIEmitter, type LiquidSchema } from '../src/compiler/ui-emitter';
import type { GraphSurvey } from '../src/types';

// ============================================================================
// §1 Scanner Tests
// ============================================================================

describe('Scanner', () => {
  describe('basic tokens', () => {
    it('should tokenize node symbols', () => {
      const scanner = new SurveyScanner('> ? ! <');
      const tokens = scanner.scan();

      expect(tokens[0].type).toBe('NODE_START');
      expect(tokens[1].type).toBe('NODE_QUESTION');
      expect(tokens[2].type).toBe('NODE_MESSAGE');
      expect(tokens[3].type).toBe('NODE_END');
    });

    it('should tokenize identifiers', () => {
      const scanner = new SurveyScanner('start-node my_id');
      const tokens = scanner.scan();

      expect(tokens[0].type).toBe('IDENTIFIER');
      expect(tokens[0].value).toBe('start-node');
      expect(tokens[1].type).toBe('IDENTIFIER');
      expect(tokens[1].value).toBe('my_id');
    });

    it('should tokenize strings with escapes', () => {
      const scanner = new SurveyScanner('"Hello \\"world\\""');
      const tokens = scanner.scan();

      expect(tokens[0].type).toBe('STRING');
      expect(tokens[0].value).toBe('Hello \\"world\\"');
    });

    it('should tokenize numbers', () => {
      const scanner = new SurveyScanner('42 3.14 -5');
      const tokens = scanner.scan();

      expect(tokens[0].type).toBe('NUMBER');
      expect(tokens[0].value).toBe('42');
      expect(tokens[1].type).toBe('NUMBER');
      expect(tokens[1].value).toBe('3.14');
      expect(tokens[2].type).toBe('NUMBER');
      expect(tokens[2].value).toBe('-5');
    });

    it('should tokenize booleans', () => {
      const scanner = new SurveyScanner('true false');
      const tokens = scanner.scan();

      expect(tokens[0].type).toBe('BOOLEAN');
      expect(tokens[0].value).toBe('true');
      expect(tokens[1].type).toBe('BOOLEAN');
      expect(tokens[1].value).toBe('false');
    });
  });

  describe('identifiers starting with numbers', () => {
    it('should tokenize 1_to_3 as a single identifier', () => {
      const scanner = new SurveyScanner('1_to_3');
      const tokens = scanner.scan();

      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe('IDENTIFIER');
      expect(tokens[0].value).toBe('1_to_3');
    });

    it('should tokenize 3_to_5 as a single identifier', () => {
      const scanner = new SurveyScanner('3_to_5');
      const tokens = scanner.scan();

      expect(tokens[0].type).toBe('IDENTIFIER');
      expect(tokens[0].value).toBe('3_to_5');
    });

    it('should tokenize regular numbers correctly', () => {
      const scanner = new SurveyScanner('123 45.67');
      const tokens = scanner.scan();

      expect(tokens[0].type).toBe('NUMBER');
      expect(tokens[0].value).toBe('123');
      expect(tokens[1].type).toBe('NUMBER');
      expect(tokens[1].value).toBe('45.67');
    });
  });

  describe('condition operators', () => {
    it('should tokenize basic comparison operators', () => {
      const scanner = new SurveyScanner('?= ?> ?< ?>= ?<=');
      const tokens = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'CONDITION_OP', value: '?=' });
      expect(tokens[1]).toMatchObject({ type: 'CONDITION_OP', value: '?>' });
      expect(tokens[2]).toMatchObject({ type: 'CONDITION_OP', value: '?<' });
      expect(tokens[3]).toMatchObject({ type: 'CONDITION_OP', value: '?>=' });
      expect(tokens[4]).toMatchObject({ type: 'CONDITION_OP', value: '?<=' });
    });

    it('should tokenize negation operators', () => {
      const scanner = new SurveyScanner('?!= ?!in ?!contains ?!empty');
      const tokens = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'CONDITION_OP', value: '?!=' });
      expect(tokens[1]).toMatchObject({ type: 'CONDITION_OP', value: '?!in' });
      expect(tokens[2]).toMatchObject({ type: 'CONDITION_OP', value: '?!contains' });
      expect(tokens[3]).toMatchObject({ type: 'CONDITION_OP', value: '?!empty' });
    });

    it('should tokenize word-based operators', () => {
      const scanner = new SurveyScanner('?in ?contains ?empty');
      const tokens = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'CONDITION_OP', value: '?in' });
      expect(tokens[1]).toMatchObject({ type: 'CONDITION_OP', value: '?contains' });
      expect(tokens[2]).toMatchObject({ type: 'CONDITION_OP', value: '?empty' });
    });

    it('should tokenize matches operator', () => {
      const scanner = new SurveyScanner('?~');
      const tokens = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'CONDITION_OP', value: '?~' });
    });

    it('should distinguish ? as NODE_QUESTION when not followed by operator', () => {
      const scanner = new SurveyScanner('? node_id');
      const tokens = scanner.scan();

      expect(tokens[0].type).toBe('NODE_QUESTION');
      expect(tokens[1].type).toBe('IDENTIFIER');
    });
  });

  describe('question type codes', () => {
    it('should recognize all question type codes', () => {
      const codes = ['Tx', 'Ta', 'Rt', 'Ch', 'Mc', 'Ms', 'Np', 'Rk', 'Lk', 'Mx'];
      for (const code of codes) {
        const scanner = new SurveyScanner(code);
        const tokens = scanner.scan();
        expect(tokens[0].type).toBe('QUESTION_TYPE');
        expect(tokens[0].value).toBe(code);
      }
    });
  });
});

// ============================================================================
// §2 Parser Tests
// ============================================================================

describe('Parser', () => {
  describe('header parsing', () => {
    it('should parse survey header', () => {
      const source = `my-survey "Survey Title" "Description"
---
> start "Welcome"`;
      const scanner = new SurveyScanner(source);
      const parser = new SurveyParser(scanner.scan());
      const ast = parser.parse();

      expect(ast.id).toBe('my-survey');
      expect(ast.title).toBe('Survey Title');
      expect(ast.description).toBe('Description');
    });
  });

  describe('node parsing', () => {
    it('should parse start node', () => {
      const source = '> start "Welcome" "Please begin" -> q1';
      const scanner = new SurveyScanner(source);
      const parser = new SurveyParser(scanner.scan());
      const ast = parser.parse();

      expect(ast.nodes).toHaveLength(1);
      expect(ast.nodes[0].type).toBe('start');
      expect(ast.nodes[0].id).toBe('start');
      expect(ast.nodes[0].title).toBe('Welcome');
      expect(ast.nodes[0].message).toBe('Please begin');
      expect(ast.nodes[0].transitions).toHaveLength(1);
      expect(ast.nodes[0].transitions[0].target).toBe('q1');
    });

    it('should parse question node with type and required marker', () => {
      const source = '? q1 Tx* "What is your name?" -> q2';
      const scanner = new SurveyScanner(source);
      const parser = new SurveyParser(scanner.scan());
      const ast = parser.parse();

      expect(ast.nodes[0].type).toBe('question');
      expect(ast.nodes[0].questionType).toBe('text');
      expect(ast.nodes[0].required).toBe(true);
      expect(ast.nodes[0].question).toBe('What is your name?');
    });

    it('should parse end node', () => {
      const source = '< end "Thank You" "Goodbye"';
      const scanner = new SurveyScanner(source);
      const parser = new SurveyParser(scanner.scan());
      const ast = parser.parse();

      expect(ast.nodes[0].type).toBe('end');
      expect(ast.nodes[0].title).toBe('Thank You');
      expect(ast.nodes[0].message).toBe('Goodbye');
    });
  });

  describe('options parsing', () => {
    it('should parse simple string options', () => {
      const source = '? q1 Ch* "Pick one" ["Yes", "No"]';
      const scanner = new SurveyScanner(source);
      const parser = new SurveyParser(scanner.scan());
      const ast = parser.parse();

      expect(ast.nodes[0].options).toHaveLength(2);
      expect(ast.nodes[0].options![0].label).toBe('Yes');
      expect(ast.nodes[0].options![1].label).toBe('No');
    });

    it('should parse id:"label"=value format', () => {
      const source = '? q1 Ch* "Select" [opt_a:"Option A"=a, opt_b:"Option B"=b]';
      const scanner = new SurveyScanner(source);
      const parser = new SurveyParser(scanner.scan());
      const ast = parser.parse();

      expect(ast.nodes[0].options).toHaveLength(2);
      expect(ast.nodes[0].options![0]).toMatchObject({
        id: 'opt_a',
        label: 'Option A',
        value: 'a',
      });
      expect(ast.nodes[0].options![1]).toMatchObject({
        id: 'opt_b',
        label: 'Option B',
        value: 'b',
      });
    });

    it('should parse value="label" format', () => {
      const source = '? q1 Ch* "Select" [yes="Yes", no="No"]';
      const scanner = new SurveyScanner(source);
      const parser = new SurveyParser(scanner.scan());
      const ast = parser.parse();

      expect(ast.nodes[0].options![0]).toMatchObject({
        value: 'yes',
        label: 'Yes',
      });
    });
  });

  describe('config parsing', () => {
    it('should parse simple config values', () => {
      const source = '? q1 Rt* "Rate" {min: 1, max: 5}';
      const scanner = new SurveyScanner(source);
      const parser = new SurveyParser(scanner.scan());
      const ast = parser.parse();

      expect(ast.nodes[0].config).toEqual({ min: 1, max: 5 });
    });

    it('should parse nested objects in arrays (rankingItems)', () => {
      const source = '? q1 Rk* "Rank these" {rankingItems: [{id: "r1", label: "Speed", value: "speed"}, {id: "r2", label: "Price", value: "price"}]}';
      const scanner = new SurveyScanner(source);
      const parser = new SurveyParser(scanner.scan());
      const ast = parser.parse();

      expect(ast.nodes[0].config?.rankingItems).toEqual([
        { id: 'r1', label: 'Speed', value: 'speed' },
        { id: 'r2', label: 'Price', value: 'price' },
      ]);
    });

    it('should parse nested arrays', () => {
      const source = '? q1 Tx* "Q" {tags: ["a", "b", "c"]}';
      const scanner = new SurveyScanner(source);
      const parser = new SurveyParser(scanner.scan());
      const ast = parser.parse();

      expect(ast.nodes[0].config?.tags).toEqual(['a', 'b', 'c']);
    });
  });

  describe('transition parsing', () => {
    it('should parse unconditional transition', () => {
      const source = '? q1 Tx* "Name?" -> q2';
      const scanner = new SurveyScanner(source);
      const parser = new SurveyParser(scanner.scan());
      const ast = parser.parse();

      expect(ast.nodes[0].transitions).toHaveLength(1);
      expect(ast.nodes[0].transitions[0].target).toBe('q2');
      expect(ast.nodes[0].transitions[0].condition).toBeUndefined();
    });

    it('should parse conditional transitions', () => {
      const source = `? q1 Ch* "Select" [opt_a:"A", opt_b:"B"]
  -> path_a ?= a
  -> path_b ?= b`;
      const scanner = new SurveyScanner(source);
      const parser = new SurveyParser(scanner.scan());
      const ast = parser.parse();

      expect(ast.nodes[0].transitions).toHaveLength(2);
      expect(ast.nodes[0].transitions[0]).toMatchObject({
        target: 'path_a',
        condition: { operator: 'equals', value: 'a' },
      });
      expect(ast.nodes[0].transitions[1]).toMatchObject({
        target: 'path_b',
        condition: { operator: 'equals', value: 'b' },
      });
    });

    it('should parse less operator', () => {
      const source = '? q1 Rt* "Rate" -> low ?< 3 -> high ?>= 3';
      const scanner = new SurveyScanner(source);
      const parser = new SurveyParser(scanner.scan());
      const ast = parser.parse();

      expect(ast.nodes[0].transitions[0].condition).toMatchObject({
        operator: 'less',
        value: 3,
      });
      expect(ast.nodes[0].transitions[1].condition).toMatchObject({
        operator: 'greaterOrEqual',
        value: 3,
      });
    });
  });
});

// ============================================================================
// §3 Emitter Tests
// ============================================================================

describe('Emitter', () => {
  describe('config serialization', () => {
    it('should serialize simple config', () => {
      const emitter = new SurveyEmitter({ format: 'liquidsurvey' });
      const ast = {
        id: 'test',
        nodes: [{
          type: 'question' as const,
          id: 'q1',
          questionType: 'rating',
          question: 'Rate',
          required: true,
          config: { min: 1, max: 5 },
          transitions: [],
          line: 1,
        }],
        comments: [],
      };

      const output = emitter.emit(ast) as string;
      expect(output).toContain('{min: 1, max: 5}');
    });

    it('should serialize arrays of objects', () => {
      const emitter = new SurveyEmitter({ format: 'liquidsurvey' });
      const ast = {
        id: 'test',
        nodes: [{
          type: 'question' as const,
          id: 'q1',
          questionType: 'ranking',
          question: 'Rank',
          required: true,
          config: {
            rankingItems: [
              { id: 'r1', label: 'Speed', value: 'speed' },
              { id: 'r2', label: 'Price', value: 'price' },
            ],
          },
          transitions: [],
          line: 1,
        }],
        comments: [],
      };

      const output = emitter.emit(ast) as string;
      expect(output).toContain('rankingItems: [{id: "r1", label: "Speed", value: "speed"}, {id: "r2", label: "Price", value: "price"}]');
    });

    it('should serialize nested config objects', () => {
      const emitter = new SurveyEmitter({ format: 'liquidsurvey' });
      const ast = {
        id: 'test',
        nodes: [{
          type: 'question' as const,
          id: 'q1',
          questionType: 'likert',
          question: 'Agree?',
          required: true,
          config: {
            likertLabels: { start: 'Disagree', end: 'Agree' },
          },
          transitions: [],
          line: 1,
        }],
        comments: [],
      };

      const output = emitter.emit(ast) as string;
      expect(output).toContain('likertLabels: {start: "Disagree", end: "Agree"}');
    });
  });

  describe('options serialization', () => {
    it('should serialize id:label=value format', () => {
      const emitter = new SurveyEmitter({ format: 'liquidsurvey' });
      const ast = {
        id: 'test',
        nodes: [{
          type: 'question' as const,
          id: 'q1',
          questionType: 'choice',
          question: 'Pick',
          required: true,
          options: [
            { id: 'opt_yes', label: 'Yes', value: 'yes' },
            { id: 'opt_no', label: 'No', value: 'no' },
          ],
          transitions: [],
          line: 1,
        }],
        comments: [],
      };

      const output = emitter.emit(ast) as string;
      expect(output).toContain('[opt_yes:"Yes"=yes, opt_no:"No"=no]');
    });
  });

  describe('condition operators', () => {
    it('should emit less operator as ?<', () => {
      const emitter = new SurveyEmitter({ format: 'liquidsurvey' });
      const ast = {
        id: 'test',
        nodes: [{
          type: 'question' as const,
          id: 'q1',
          questionType: 'rating',
          question: 'Rate',
          required: true,
          transitions: [
            { target: 'low', condition: { operator: 'less', value: 3 } },
          ],
          line: 1,
        }],
        comments: [],
      };

      const output = emitter.emit(ast) as string;
      expect(output).toContain('-> low ?< 3');
    });

    it('should emit greater operator as ?>', () => {
      const emitter = new SurveyEmitter({ format: 'liquidsurvey' });
      const ast = {
        id: 'test',
        nodes: [{
          type: 'question' as const,
          id: 'q1',
          questionType: 'rating',
          question: 'Rate',
          required: true,
          transitions: [
            { target: 'high', condition: { operator: 'greater', value: 7 } },
          ],
          line: 1,
        }],
        comments: [],
      };

      const output = emitter.emit(ast) as string;
      expect(output).toContain('-> high ?> 7');
    });
  });
});

// ============================================================================
// §4 Roundtrip Tests
// ============================================================================

describe('Roundtrip', () => {
  it('should maintain identity for simple survey', () => {
    const survey: GraphSurvey = {
      id: 'simple-survey',
      title: 'Simple Survey',
      description: 'Test survey',
      startNodeId: 'start',
      nodes: {
        start: {
          id: 'start',
          type: 'start',
          content: { title: 'Welcome', message: 'Hello' },
          next: [{ nodeId: 'q1' }],
        },
        q1: {
          id: 'q1',
          type: 'question',
          content: { question: 'Name?', type: 'text', required: true },
          next: [{ nodeId: 'end' }],
        },
        end: {
          id: 'end',
          type: 'end',
          content: { title: 'Done', message: 'Thanks' },
          next: [],
        },
      },
    };

    const result = roundtrip(survey as any);
    expect(result.isEquivalent).toBe(true);
    expect(result.differences).toHaveLength(0);
  });

  it('should maintain identity for choice with options', () => {
    const survey: GraphSurvey = {
      id: 'choice-survey',
      title: 'Choice Survey',
      startNodeId: 'start',
      nodes: {
        start: {
          id: 'start',
          type: 'start',
          content: { title: 'Start', message: 'Begin' },
          next: [{ nodeId: 'q1' }],
        },
        q1: {
          id: 'q1',
          type: 'question',
          content: {
            question: 'Pick one',
            type: 'choice',
            required: true,
            options: [
              { id: 'opt_a', label: 'Option A', value: 'a' },
              { id: 'opt_b', label: 'Option B', value: 'b' },
            ],
          },
          next: [{ nodeId: 'end' }],
        },
        end: {
          id: 'end',
          type: 'end',
          content: { title: 'End', message: 'Done' },
          next: [],
        },
      },
    };

    const result = roundtrip(survey as any);
    expect(result.isEquivalent).toBe(true);
  });

  it('should maintain identity for ranking with rankingItems', () => {
    const survey: GraphSurvey = {
      id: 'ranking-survey',
      title: 'Ranking Survey',
      startNodeId: 'start',
      nodes: {
        start: {
          id: 'start',
          type: 'start',
          content: { title: 'Rank', message: 'Order these' },
          next: [{ nodeId: 'q1' }],
        },
        q1: {
          id: 'q1',
          type: 'question',
          content: {
            question: 'Rank by importance',
            type: 'ranking',
            required: true,
            rankingItems: [
              { id: 'r1', label: 'Speed', value: 'speed' },
              { id: 'r2', label: 'Price', value: 'price' },
              { id: 'r3', label: 'Quality', value: 'quality' },
            ],
          },
          next: [{ nodeId: 'end' }],
        },
        end: {
          id: 'end',
          type: 'end',
          content: { title: 'Done', message: 'Thanks' },
          next: [],
        },
      },
    };

    const result = roundtrip(survey as any);
    expect(result.isEquivalent).toBe(true);
  });

  it('should maintain identity for conditional branching', () => {
    const survey: GraphSurvey = {
      id: 'branching-survey',
      title: 'Branching Survey',
      startNodeId: 'start',
      nodes: {
        start: {
          id: 'start',
          type: 'start',
          content: { title: 'Start' },
          next: [{ nodeId: 'q1' }],
        },
        q1: {
          id: 'q1',
          type: 'question',
          content: {
            question: 'Rate 1-5',
            type: 'rating',
            required: true,
            min: 1,
            max: 5,
          },
          next: [
            { nodeId: 'good', condition: { operator: 'greaterOrEqual', value: 4 } },
            { nodeId: 'bad', condition: { operator: 'less', value: 4 } },
          ],
        },
        good: {
          id: 'good',
          type: 'end',
          content: { title: 'Great!' },
          next: [],
        },
        bad: {
          id: 'bad',
          type: 'end',
          content: { title: 'Sorry' },
          next: [],
        },
      },
    };

    const result = roundtrip(survey as any);
    expect(result.isEquivalent).toBe(true);
  });

  it('should maintain identity for values starting with numbers', () => {
    const survey: GraphSurvey = {
      id: 'numeric-value-survey',
      title: 'Numeric Values',
      startNodeId: 'start',
      nodes: {
        start: {
          id: 'start',
          type: 'start',
          content: { title: 'Start' },
          next: [{ nodeId: 'q1' }],
        },
        q1: {
          id: 'q1',
          type: 'question',
          content: {
            question: 'How long employed?',
            type: 'choice',
            required: true,
            options: [
              { id: 'opt_1_to_3', label: '1-3 years', value: '1_to_3' },
              { id: 'opt_3_to_5', label: '3-5 years', value: '3_to_5' },
              { id: 'opt_5_plus', label: '5+ years', value: '5_plus' },
            ],
          },
          next: [{ nodeId: 'end' }],
        },
        end: {
          id: 'end',
          type: 'end',
          content: { title: 'Done' },
          next: [],
        },
      },
    };

    const result = roundtrip(survey as any);
    expect(result.isEquivalent).toBe(true);
  });
});

// ============================================================================
// §5 Integration Tests
// ============================================================================

describe('Integration', () => {
  it('should compile and parse back correctly', () => {
    const survey: GraphSurvey = {
      id: 'integration-test',
      title: 'Integration Test',
      description: 'Full pipeline test',
      startNodeId: 'start',
      nodes: {
        start: {
          id: 'start',
          type: 'start',
          content: { title: 'Welcome', message: 'Let us begin' },
          next: [{ nodeId: 'q1' }],
        },
        q1: {
          id: 'q1',
          type: 'question',
          content: {
            question: 'Your email?',
            type: 'email',
            required: true,
            emailValidation: 'strict',
          },
          next: [{ nodeId: 'end' }],
        },
        end: {
          id: 'end',
          type: 'end',
          content: { title: 'Done', message: 'Thank you' },
          next: [],
        },
      },
    };

    // Compile to DSL
    const dsl = compile(survey as any);
    expect(dsl).toContain('integration-test');
    expect(dsl).toContain('Em*'); // Email required
    expect(dsl).toContain('emailValidation: "strict"');

    // Parse back
    const parsed = parse(dsl);
    expect(parsed.id).toBe('integration-test');
    expect(parsed.title).toBe('Integration Test');
    expect(Object.keys(parsed.nodes)).toHaveLength(3);
  });
});

// ============================================================================
// PART II: LiquidCode (UI) Tests
// ============================================================================

// ============================================================================
// §6 UI Scanner Tests
// ============================================================================

describe('UI Scanner', () => {
  describe('type tokens', () => {
    it('should tokenize single-digit type indices', () => {
      const scanner = new UIScanner('0 1 2 3');
      const { tokens } = scanner.scan();

      expect(tokens[0].type).toBe('UI_TYPE_INDEX');
      expect(tokens[0].value).toBe('0');
      expect(tokens[1].type).toBe('UI_TYPE_INDEX');
      expect(tokens[1].value).toBe('1');
    });

    it('should tokenize type codes', () => {
      const scanner = new UIScanner('Kp Br Bt In');
      const { tokens } = scanner.scan();

      expect(tokens[0].type).toBe('UI_TYPE_CODE');
      expect(tokens[0].value).toBe('Kp');
      expect(tokens[1].type).toBe('UI_TYPE_CODE');
      expect(tokens[1].value).toBe('Br');
      expect(tokens[2].type).toBe('UI_TYPE_CODE');
      expect(tokens[2].value).toBe('Bt');
      expect(tokens[3].type).toBe('UI_TYPE_CODE');
      expect(tokens[3].value).toBe('In');
    });
  });

  describe('binding tokens', () => {
    it('should tokenize field bindings', () => {
      const scanner = new UIScanner(':field :another_field');
      const { tokens } = scanner.scan();

      expect(tokens[0].type).toBe('FIELD');
      expect(tokens[0].value).toBe(':field');
      expect(tokens[1].type).toBe('FIELD');
      expect(tokens[1].value).toBe(':another_field');
    });

    it('should tokenize iterator binding', () => {
      const scanner = new UIScanner(':. :.name');
      const { tokens } = scanner.scan();

      expect(tokens[0].type).toBe('ITERATOR');
      expect(tokens[0].value).toBe(':.');
      expect(tokens[1].type).toBe('ITERATOR');
      expect(tokens[1].value).toBe(':.name');
    });

    it('should tokenize index reference', () => {
      const scanner = new UIScanner(':#');
      const { tokens } = scanner.scan();

      expect(tokens[0].type).toBe('INDEX_REF');
      expect(tokens[0].value).toBe(':#');
    });

    it('should tokenize expression binding', () => {
      const scanner = new UIScanner('=revenue/orders');
      const { tokens } = scanner.scan();

      expect(tokens[0].type).toBe('EXPR');
      expect(tokens[0].value).toBe('=revenue/orders');
    });

    it('should tokenize literal strings', () => {
      const scanner = new UIScanner('"Hello World"');
      const { tokens } = scanner.scan();

      expect(tokens[0].type).toBe('STRING');
      expect(tokens[0].value).toBe('Hello World');
    });
  });

  describe('modifier tokens', () => {
    it('should tokenize signal declaration', () => {
      const scanner = new UIScanner('@dr @filter');
      const { tokens } = scanner.scan();

      expect(tokens[0].type).toBe('SIGNAL_DECLARE');
      expect(tokens[0].value).toBe('@dr');
      expect(tokens[1].type).toBe('SIGNAL_DECLARE');
      expect(tokens[1].value).toBe('@filter');
    });

    it('should tokenize signal emit', () => {
      const scanner = new UIScanner('>action >tab=0');
      const { tokens } = scanner.scan();

      expect(tokens[0].type).toBe('SIGNAL_EMIT');
      expect(tokens[0].value).toBe('>action');
      expect(tokens[1].type).toBe('SIGNAL_EMIT');
      expect(tokens[1].value).toBe('>tab=0');
    });

    it('should tokenize signal receive', () => {
      const scanner = new UIScanner('<dr <filter');
      const { tokens } = scanner.scan();

      expect(tokens[0].type).toBe('SIGNAL_RECEIVE');
      expect(tokens[0].value).toBe('<dr');
      expect(tokens[1].type).toBe('SIGNAL_RECEIVE');
      expect(tokens[1].value).toBe('<filter');
    });

    it('should tokenize bidirectional signal', () => {
      const scanner = new UIScanner('<>sel');
      const { tokens } = scanner.scan();

      expect(tokens[0].type).toBe('SIGNAL_BOTH');
      expect(tokens[0].value).toBe('<>sel');
    });

    it('should tokenize priority modifier', () => {
      const scanner = new UIScanner('!h !p !s !3');
      const { tokens } = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'PRIORITY', value: '!h' });
      expect(tokens[1]).toMatchObject({ type: 'PRIORITY', value: '!p' });
      expect(tokens[2]).toMatchObject({ type: 'PRIORITY', value: '!s' });
      expect(tokens[3]).toMatchObject({ type: 'PRIORITY', value: '!3' });
    });

    it('should tokenize flex modifier', () => {
      const scanner = new UIScanner('^f ^s ^g');
      const { tokens } = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'FLEX', value: '^f' });
      expect(tokens[1]).toMatchObject({ type: 'FLEX', value: '^s' });
      expect(tokens[2]).toMatchObject({ type: 'FLEX', value: '^g' });
    });

    it('should tokenize span modifier', () => {
      const scanner = new UIScanner('*3 *f *h');
      const { tokens } = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'SPAN', value: '*3' });
      expect(tokens[1]).toMatchObject({ type: 'SPAN', value: '*f' });
      expect(tokens[2]).toMatchObject({ type: 'SPAN', value: '*h' });
    });

    it('should tokenize color modifier', () => {
      const scanner = new UIScanner('#red #blue');
      const { tokens } = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'COLOR', value: '#red' });
      expect(tokens[1]).toMatchObject({ type: 'COLOR', value: '#blue' });
    });

    it('should tokenize size modifier', () => {
      const scanner = new UIScanner('%lg %sm');
      const { tokens } = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'SIZE', value: '%lg' });
      expect(tokens[1]).toMatchObject({ type: 'SIZE', value: '%sm' });
    });

    it('should tokenize layer trigger', () => {
      const scanner = new UIScanner('>/1 >/2');
      const { tokens } = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'SIGNAL_EMIT', value: '>/1' });
      expect(tokens[1]).toMatchObject({ type: 'SIGNAL_EMIT', value: '>/2' });
    });

    it('should tokenize stream modifiers', () => {
      const scanner = new UIScanner('~5s ~1m ~ws://api.example.com ~sse://events');
      const { tokens } = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'STREAM', value: '~5s' });
      expect(tokens[1]).toMatchObject({ type: 'STREAM', value: '~1m' });
      expect(tokens[2]).toMatchObject({ type: 'STREAM', value: '~ws://api.example.com' });
      expect(tokens[3]).toMatchObject({ type: 'STREAM', value: '~sse://events' });
    });

    it('should tokenize fidelity modifiers', () => {
      const scanner = new UIScanner('$lo $hi $auto $skeleton $defer');
      const { tokens } = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'FIDELITY', value: '$lo' });
      expect(tokens[1]).toMatchObject({ type: 'FIDELITY', value: '$hi' });
      expect(tokens[2]).toMatchObject({ type: 'FIDELITY', value: '$auto' });
      expect(tokens[3]).toMatchObject({ type: 'FIDELITY', value: '$skeleton' });
      expect(tokens[4]).toMatchObject({ type: 'FIDELITY', value: '$defer' });
    });
  });

  describe('structure tokens', () => {
    it('should tokenize layer definition', () => {
      const scanner = new UIScanner('/1 /2');
      const { tokens } = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'LAYER', value: '/1' });
      expect(tokens[1]).toMatchObject({ type: 'LAYER', value: '/2' });
    });

    it('should tokenize layer close', () => {
      const scanner = new UIScanner('/<');
      const { tokens } = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'LAYER_CLOSE', value: '/<' });
    });

    it('should tokenize brackets and comma', () => {
      const scanner = new UIScanner('[a, b, c]');
      const { tokens } = scanner.scan();

      expect(tokens[0].type).toBe('LBRACKET');
      expect(tokens[4].type).toBe('COMMA');
      expect(tokens[6].type).toBe('RBRACKET');
    });

    it('should tokenize Survey keyword', () => {
      const scanner = new UIScanner('Survey {');
      const { tokens } = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'SURVEY_START', value: 'Survey' });
      expect(tokens[1]).toMatchObject({ type: 'LBRACE', value: '{' });
    });
  });

  describe('complex expressions', () => {
    it('should tokenize a KPI dashboard', () => {
      const scanner = new UIScanner('1 :revenue, 1 :orders, 1 :customers, 1 :aov');
      const { tokens } = scanner.scan();

      // Four KPIs (1) with field bindings
      const typeTokens = tokens.filter(t => t.type === 'UI_TYPE_INDEX');
      expect(typeTokens).toHaveLength(4);

      const fieldTokens = tokens.filter(t => t.type === 'FIELD');
      expect(fieldTokens).toHaveLength(4);
    });
  });

  describe('input validation', () => {
    it('should strip BOM (Byte Order Mark)', () => {
      const withBom = '\uFEFFKp :a';
      const scanner = new UIScanner(withBom);
      const result = scanner.scan(); const { tokens } = result;

      expect(result.tokens[0].type).toBe('UI_TYPE_CODE');
      expect(result.tokens[0].value).toBe('Kp');
    });

    it('should normalize CRLF line endings to LF', () => {
      const crlf = 'Kp :a\r\nKp :b';
      const scanner = new UIScanner(crlf);
      const result = scanner.scan(); const { tokens } = result;

      const newlines = result.tokens.filter(t => t.type === 'NEWLINE');
      expect(newlines).toHaveLength(1);
      expect(result.tokens[2].type).toBe('NEWLINE');
    });

    it('should normalize CR line endings to LF', () => {
      const cr = 'Kp :a\rKp :b';
      const scanner = new UIScanner(cr);
      const result = scanner.scan(); const { tokens } = result;

      const newlines = result.tokens.filter(t => t.type === 'NEWLINE');
      expect(newlines).toHaveLength(1);
    });

    it('should strip null bytes', () => {
      const withNull = 'Kp\x00 :a';
      const scanner = new UIScanner(withNull);
      const result = scanner.scan(); const { tokens } = result;

      expect(result.tokens[0].type).toBe('UI_TYPE_CODE');
      expect(result.tokens[0].value).toBe('Kp');
      expect(result.tokens[1].type).toBe('FIELD');
      expect(result.tokens[1].value).toBe(':a');
    });

    it('should strip other control characters', () => {
      const withControls = 'Kp\x01\x02\x03 :a';
      const scanner = new UIScanner(withControls);
      const result = scanner.scan(); const { tokens } = result;

      expect(result.tokens[0].type).toBe('UI_TYPE_CODE');
      expect(result.tokens[0].value).toBe('Kp');
      expect(result.tokens[1].type).toBe('FIELD');
      expect(result.tokens[1].value).toBe(':a');
    });

    it('should preserve tab characters', () => {
      const withTab = 'Kp\t:a';
      const scanner = new UIScanner(withTab);
      const result = scanner.scan(); const { tokens } = result;

      // Tab should be treated as whitespace, not stripped
      expect(result.tokens[0].type).toBe('UI_TYPE_CODE');
      expect(result.tokens[0].value).toBe('Kp');
      expect(result.tokens[1].type).toBe('FIELD');
    });

    it('should detect orphaned high surrogate', () => {
      const badUtf8 = 'Kp \uD800 :a';  // Orphaned high surrogate

      expect(() => new UIScanner(badUtf8)).toThrow(/Invalid UTF-8.*orphaned.*high surrogate/);
    });

    it('should detect orphaned low surrogate', () => {
      const badUtf8 = 'Kp \uDC00 :a';  // Orphaned low surrogate

      expect(() => new UIScanner(badUtf8)).toThrow(/Invalid UTF-8.*orphaned.*low surrogate/);
    });

    it('should allow valid surrogate pairs', () => {
      // Valid emoji (surrogate pair)
      const validUtf8 = 'Kp "Hello 😀" :a';
      const scanner = new UIScanner(validUtf8);
      const result = scanner.scan(); const { tokens } = result;

      expect(result.errors).toHaveLength(0);
      const stringToken = result.tokens.find(t => t.type === 'STRING');
      expect(stringToken?.value).toBe('Hello 😀');
    });

    it('should handle multiple validation issues', () => {
      // BOM + CRLF + control chars
      const messy = '\uFEFFKp\x00 :a\r\nBr\x01 :b';
      const scanner = new UIScanner(messy);
      const result = scanner.scan(); const { tokens } = result;

      expect(result.tokens[0].type).toBe('UI_TYPE_CODE');
      expect(result.tokens[0].value).toBe('Kp');
      expect(result.tokens[2].type).toBe('NEWLINE');
      expect(result.tokens[3].type).toBe('UI_TYPE_CODE');
      expect(result.tokens[3].value).toBe('Br');
    });
  });
});

// ============================================================================

describe('UI Parser', () => {
  describe('signal parsing', () => {
    it('should parse signal declarations', () => {
      const scanner = new UIScanner('@dr @filter');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      expect(ast.signals).toHaveLength(2);
      expect(ast.signals[0].name).toBe('dr');
      expect(ast.signals[1].name).toBe('filter');
    });
  });

  describe('block parsing', () => {
    it('should parse indexed type', () => {
      const scanner = new UIScanner('1 :revenue');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      expect(ast.mainBlocks).toHaveLength(1);
      expect(ast.mainBlocks[0].type).toBe('kpi');
      expect(ast.mainBlocks[0].typeIndex).toBe(1);
    });

    it('should parse type code', () => {
      const scanner = new UIScanner('Bt "Click Me"');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      expect(ast.mainBlocks).toHaveLength(1);
      expect(ast.mainBlocks[0].type).toBe('button');
      expect(ast.mainBlocks[0].typeCode).toBe('Bt');
    });

    it('should parse field binding', () => {
      const scanner = new UIScanner('5 :orders');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      expect(ast.mainBlocks[0].bindings).toHaveLength(1);
      expect(ast.mainBlocks[0].bindings[0]).toMatchObject({
        kind: 'field',
        value: 'orders',
      });
    });

    it('should parse multiple field bindings (chart axes)', () => {
      const scanner = new UIScanner('3 :date :amount');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      expect(ast.mainBlocks[0].bindings).toHaveLength(2);
      expect(ast.mainBlocks[0].bindings[0].value).toBe('date');
      expect(ast.mainBlocks[0].bindings[1].value).toBe('amount');
    });

    it('should parse literal binding', () => {
      const scanner = new UIScanner('Bt "Submit"');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      expect(ast.mainBlocks[0].bindings[0]).toMatchObject({
        kind: 'literal',
        value: 'Submit',
      });
    });

    it('should parse expression binding', () => {
      const scanner = new UIScanner('1 =revenue/orders');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      expect(ast.mainBlocks[0].bindings[0]).toMatchObject({
        kind: 'expr',
        value: 'revenue/orders',
      });
    });
  });

  describe('modifier parsing', () => {
    it('should parse priority modifier', () => {
      const scanner = new UIScanner('1 :kpi !h');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      const priorityMod = ast.mainBlocks[0].modifiers.find(m => m.kind === 'priority');
      expect(priorityMod).toBeDefined();
      expect(priorityMod!.value).toBe(100); // 'h' = hero = 100
    });

    it('should parse emit signal modifier', () => {
      const scanner = new UIScanner('Bt "Click" >action');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      const emitMod = ast.mainBlocks[0].modifiers.find(m => m.kind === 'emit');
      expect(emitMod).toBeDefined();
      expect(emitMod!.target).toBe('action');
    });

    it('should parse emit signal with value', () => {
      const scanner = new UIScanner('Bt "Tab1" >tab=0');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      const emitMod = ast.mainBlocks[0].modifiers.find(m => m.kind === 'emit');
      expect(emitMod!.target).toBe('tab');
      expect(emitMod!.value).toBe('0');
    });

    it('should parse receive signal modifier', () => {
      const scanner = new UIScanner('5 :orders <dr');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      const recvMod = ast.mainBlocks[0].modifiers.find(m => m.kind === 'receive');
      expect(recvMod).toBeDefined();
      expect(recvMod!.target).toBe('dr');
    });

    it('should parse layer trigger', () => {
      const scanner = new UIScanner('Bt "Open" >/1');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      const emitMod = ast.mainBlocks[0].modifiers.find(m => m.kind === 'emit');
      expect(emitMod!.layerId).toBe(1);
    });

    it('should parse action modifier', () => {
      const scanner = new UIScanner('Bt "Save" !submit');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      const actionMod = ast.mainBlocks[0].modifiers.find(m => m.kind === 'action');
      expect(actionMod).toBeDefined();
      expect(actionMod!.value).toBe('submit');
    });

    it('should parse stream interval modifier', () => {
      const scanner = new UIScanner('1 :price ~5s');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      const streamMod = ast.mainBlocks[0].modifiers.find(m => m.kind === 'stream');
      expect(streamMod).toBeDefined();
      expect(streamMod!.streamType).toBe('interval');
      expect(streamMod!.interval).toBe(5000);
    });

    it('should parse stream WebSocket modifier', () => {
      const scanner = new UIScanner('1 :data ~ws://api.example.com/stream');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      const streamMod = ast.mainBlocks[0].modifiers.find(m => m.kind === 'stream');
      expect(streamMod).toBeDefined();
      expect(streamMod!.streamType).toBe('ws');
      expect(streamMod!.streamUrl).toBe('ws://api.example.com/stream');
    });

    it('should parse stream SSE modifier', () => {
      const scanner = new UIScanner('1 :events ~sse://events');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      const streamMod = ast.mainBlocks[0].modifiers.find(m => m.kind === 'stream');
      expect(streamMod).toBeDefined();
      expect(streamMod!.streamType).toBe('sse');
    });

    it('should parse fidelity lo modifier', () => {
      const scanner = new UIScanner('0 $lo [1 :kpi]');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      const fidelityMod = ast.mainBlocks[0].modifiers.find(m => m.kind === 'fidelity');
      expect(fidelityMod).toBeDefined();
      expect(fidelityMod!.fidelityLevel).toBe('lo');
    });

    it('should parse fidelity auto modifier', () => {
      const scanner = new UIScanner('Ch :chart $auto');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      const fidelityMod = ast.mainBlocks[0].modifiers.find(m => m.kind === 'fidelity');
      expect(fidelityMod).toBeDefined();
      expect(fidelityMod!.fidelityLevel).toBe('auto');
    });

    it('should parse minute interval correctly', () => {
      const scanner = new UIScanner('1 :data ~1m');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      const streamMod = ast.mainBlocks[0].modifiers.find(m => m.kind === 'stream');
      expect(streamMod!.interval).toBe(60000);
    });
  });

  describe('children parsing', () => {
    it('should parse children array', () => {
      const scanner = new UIScanner('0 [Bt "A", Bt "B"]');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      expect(ast.mainBlocks[0].children).toHaveLength(2);
      expect(ast.mainBlocks[0].children![0].type).toBe('button');
      expect(ast.mainBlocks[0].children![1].type).toBe('button');
    });

    it('should parse nested children', () => {
      const scanner = new UIScanner('0 [0 [Bt "Inner"]]');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      expect(ast.mainBlocks[0].children).toHaveLength(1);
      expect(ast.mainBlocks[0].children![0].children).toHaveLength(1);
      expect(ast.mainBlocks[0].children![0].children![0].type).toBe('button');
    });
  });

  describe('layer parsing', () => {
    it('should parse layer definition', () => {
      const scanner = new UIScanner('/1 9 "Modal" [Bt "Close"]');
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      expect(ast.layers).toHaveLength(1);
      expect(ast.layers[0].id).toBe(1);
      expect(ast.layers[0].root.type).toBe('modal');
    });
  });

  describe('complex dashboard parsing', () => {
    it('should parse multi-KPI dashboard', () => {
      const source = `
        @dr
        1 :revenue, 1 :orders, 1 :customers
        3 :date :sales <dr
      `;
      const scanner = new UIScanner(source);
      const { tokens } = scanner.scan();
      const parser = new UIParser(tokens);
      const ast = parser.parse();

      expect(ast.signals).toHaveLength(1);
      expect(ast.signals[0].name).toBe('dr');
      expect(ast.mainBlocks.length).toBeGreaterThanOrEqual(3);
    });
  });
});

// ============================================================================
// §8 UI Emitter Tests
// ============================================================================

describe('UI Emitter', () => {
  describe('LiquidSchema output', () => {
    it('should emit signals', () => {
      const source = '@dr @filter';
      const schema = parseUI(source);

      expect(schema.signals).toHaveLength(2);
      expect(schema.signals[0].name).toBe('dr');
      expect(schema.signals[1].name).toBe('filter');
    });

    it('should emit layers', () => {
      const source = '1 :kpi';
      const schema = parseUI(source);

      expect(schema.layers).toHaveLength(1);
      expect(schema.layers[0].id).toBe(0);
      expect(schema.layers[0].visible).toBe(true);
    });

    it('should emit block with binding', () => {
      const source = '1 :revenue';
      const schema = parseUI(source);

      const block = schema.layers[0].root;
      expect(block.type).toBe('kpi');
      expect(block.binding).toMatchObject({
        kind: 'field',
        value: 'revenue',
      });
    });

    it('should emit block with label', () => {
      const source = 'Bt "Submit"';
      const schema = parseUI(source);

      const block = schema.layers[0].root;
      expect(block.type).toBe('button');
      expect(block.label).toBe('Submit');
    });

    it('should emit block with layout modifiers', () => {
      const source = '1 :kpi !h ^g *3';
      const schema = parseUI(source);

      const block = schema.layers[0].root;
      expect(block.layout).toMatchObject({
        priority: 100,
        flex: 'grow',
        span: 3,
      });
    });

    it('should emit block with signal modifiers', () => {
      const source = 'Bt "Click" >action';
      const schema = parseUI(source);

      const block = schema.layers[0].root;
      expect(block.signals?.emit).toMatchObject({
        name: 'action',
      });
    });

    it('should emit children', () => {
      const source = '0 [Bt "A", Bt "B", Bt "C"]';
      const schema = parseUI(source);

      const block = schema.layers[0].root;
      expect(block.children).toHaveLength(3);
    });
  });

  describe('LiquidCode DSL output', () => {
    it('should compile schema to DSL', () => {
      const schema: LiquidSchema = {
        version: '1.0',
        signals: [{ name: 'dr' }],
        layers: [{
          id: 0,
          visible: true,
          root: {
            uid: 'b1',
            type: 'kpi',
            binding: { kind: 'field', value: 'revenue' },
          },
        }],
      };

      const dsl = compileUI(schema);
      expect(dsl).toContain('@dr');
      expect(dsl).toContain(':revenue');
    });
  });
});

// ============================================================================
// §9 UI Roundtrip Tests
// ============================================================================

describe('UI Roundtrip', () => {
  it('should maintain identity for simple KPI', () => {
    const schema: LiquidSchema = {
      version: '1.0',
      signals: [],
      layers: [{
        id: 0,
        visible: true,
        root: {
          uid: 'b1',
          type: 'kpi',
          binding: { kind: 'field', value: 'revenue' },
        },
      }],
    };

    const result = roundtripUI(schema);
    expect(result.isEquivalent).toBe(true);
    expect(result.differences).toHaveLength(0);
  });

  it('should maintain identity for dashboard with signals', () => {
    const schema: LiquidSchema = {
      version: '1.0',
      signals: [{ name: 'dr' }],
      layers: [{
        id: 0,
        visible: true,
        root: {
          uid: 'root',
          type: 'container',
          children: [
            { uid: 'b1', type: 'kpi', binding: { kind: 'field', value: 'revenue' } },
            { uid: 'b2', type: 'line', binding: { kind: 'field', value: 'sales' }, signals: { receive: 'dr' } },
          ],
        },
      }],
    };

    const result = roundtripUI(schema);
    expect(result.isEquivalent).toBe(true);
  });

  it('should maintain identity for button with action', () => {
    const schema: LiquidSchema = {
      version: '1.0',
      signals: [],
      layers: [{
        id: 0,
        visible: true,
        root: {
          uid: 'b1',
          type: 'button',
          label: 'Submit',
          action: 'submit',
        },
      }],
    };

    const result = roundtripUI(schema);
    expect(result.isEquivalent).toBe(true);
  });
});

// ============================================================================
// §9.5 LLM-Optimal Syntax Tests
// ============================================================================

describe('LLM-Optimal Syntax', () => {
  describe('Auto-labels', () => {
    it('should generate label from camelCase field', () => {
      const schema = parseUI('Kp :totalRevenue');
      expect(schema.layers[0].root.label).toBe('Total Revenue');
    });

    it('should generate label from snake_case field', () => {
      const schema = parseUI('Kp :order_count');
      expect(schema.layers[0].root.label).toBe('Order Count');
    });

    it('should generate label from nested field path', () => {
      const schema = parseUI('Kp :summary.activeUsers');
      expect(schema.layers[0].root.label).toBe('Active Users');
    });

    it('should prefer explicit label over auto-label', () => {
      const schema = parseUI('Kp :revenue "Total $"');
      expect(schema.layers[0].root.label).toBe('Total $');
    });
  });

  describe('Layout inference', () => {
    it('should infer row layout from comma-separated blocks', () => {
      const schema = parseUI('Kp :a, Kp :b, Kp :c');
      expect(schema.layers[0].root.layout?.flex).toBe('row');
    });

    it('should infer column layout from newline-separated blocks', () => {
      const schema = parseUI('Kp :a\nKp :b\nKp :c');
      expect(schema.layers[0].root.layout?.flex).toBe('column');
    });

    it('should infer column layout from mixed separators', () => {
      const schema = parseUI('Kp :a, Kp :b\nKp :c');
      expect(schema.layers[0].root.layout?.flex).toBe('column');
    });
  });

  describe('Chart multi-binding', () => {
    it('should extract x/y from line chart bindings', () => {
      const schema = parseUI('Ln :date :revenue');
      const binding = schema.layers[0].root.binding;
      expect(binding?.x).toBe('date');
      expect(binding?.y).toBe('revenue');
    });

    it('should extract x/y from bar chart bindings', () => {
      const schema = parseUI('Br :category :count');
      const binding = schema.layers[0].root.binding;
      expect(binding?.x).toBe('category');
      expect(binding?.y).toBe('count');
    });

    it('should not add x/y for non-chart types', () => {
      const schema = parseUI('Kp :value :extra');
      const binding = schema.layers[0].root.binding;
      expect(binding?.x).toBeUndefined();
      expect(binding?.y).toBeUndefined();
    });
  });

  describe('Table columns', () => {
    it('should parse column definitions in brackets', () => {
      const schema = parseUI('Tb :users [:name :age :email]');
      expect(schema.layers[0].root.columns).toEqual(['name', 'age', 'email']);
    });

    it('should handle comma-separated columns', () => {
      const schema = parseUI('Tb :data [:a, :b, :c]');
      expect(schema.layers[0].root.columns).toEqual(['a', 'b', 'c']);
    });

    it('should preserve table binding with columns', () => {
      const schema = parseUI('Tb :transactions [:date :amount]');
      expect(schema.layers[0].root.binding?.value).toBe('transactions');
      expect(schema.layers[0].root.columns).toEqual(['date', 'amount']);
    });
  });

  describe('Semantic type codes', () => {
    it('should parse Kp as kpi', () => {
      const schema = parseUI('Kp :value');
      expect(schema.layers[0].root.type).toBe('kpi');
    });

    it('should parse Ln as line chart', () => {
      const schema = parseUI('Ln :data');
      expect(schema.layers[0].root.type).toBe('line');
    });

    it('should parse Br as bar chart', () => {
      const schema = parseUI('Br :data');
      expect(schema.layers[0].root.type).toBe('bar');
    });

    it('should parse Tb as table', () => {
      const schema = parseUI('Tb :data');
      expect(schema.layers[0].root.type).toBe('table');
    });

    it('should parse Fm as form', () => {
      const schema = parseUI('Fm [In :name]');
      expect(schema.layers[0].root.type).toBe('form');
    });
  });

  describe('Complete dashboard example', () => {
    it('should parse LLM-optimal dashboard syntax', () => {
      const dashboard = `Kp :revenue, Kp :orders, Kp :customers
Ln :month :sales
Tb :transactions [:date :amount :status]`;

      const schema = parseUI(dashboard);
      const root = schema.layers[0].root;

      // Layout should be column (newlines between rows)
      expect(root.layout?.flex).toBe('column');

      // Should have 5 children
      expect(root.children).toHaveLength(5);

      // KPIs should have auto-labels
      expect(root.children![0].label).toBe('Revenue');
      expect(root.children![1].label).toBe('Orders');
      expect(root.children![2].label).toBe('Customers');

      // Chart should have x/y bindings
      expect(root.children![3].binding?.x).toBe('month');
      expect(root.children![3].binding?.y).toBe('sales');

      // Table should have columns
      expect(root.children![4].columns).toEqual(['date', 'amount', 'status']);
    });
  });

  describe('Repetition shorthand', () => {
    it('should expand KPIs with multiple field bindings', () => {
      const schema = parseUI('Kp :revenue :orders :customers :growth');
      expect(schema.layers[0].root.children).toHaveLength(4);
      expect(schema.layers[0].root.children![0].type).toBe('kpi');
      expect(schema.layers[0].root.children![0].binding?.value).toBe('revenue');
      expect(schema.layers[0].root.children![1].binding?.value).toBe('orders');
      expect(schema.layers[0].root.children![2].binding?.value).toBe('customers');
      expect(schema.layers[0].root.children![3].binding?.value).toBe('growth');
    });

    it('should NOT expand charts (x/y binding)', () => {
      const schema = parseUI('Ln :month :revenue');
      // Should be single chart, not multiple
      expect(schema.layers[0].root.type).toBe('line');
      expect(schema.layers[0].root.binding?.x).toBe('month');
      expect(schema.layers[0].root.binding?.y).toBe('revenue');
    });

    it('should NOT expand tables (columns are separate)', () => {
      const schema = parseUI('Tb :data [:a :b :c]');
      expect(schema.layers[0].root.type).toBe('table');
      expect(schema.layers[0].root.columns).toEqual(['a', 'b', 'c']);
    });

    it('should expand inputs in forms', () => {
      const schema = parseUI('Fm [In :name :email :phone]');
      expect(schema.layers[0].root.children).toHaveLength(3);
      expect(schema.layers[0].root.children![0].type).toBe('input');
      expect(schema.layers[0].root.children![1].type).toBe('input');
      expect(schema.layers[0].root.children![2].type).toBe('input');
    });

    it('should expand buttons with multiple labels', () => {
      // Multiple literal bindings should create multiple buttons
      const schema = parseUI('Bt :submit :cancel :reset');
      expect(schema.layers[0].root.children).toHaveLength(3);
    });

    it('should copy modifiers to all expanded blocks', () => {
      const schema = parseUI('Kp :a :b :c #green');
      schema.layers[0].root.children?.forEach(child => {
        expect(child.style?.color).toBe('green');
      });
    });

    it('should generate auto-labels for each expanded block', () => {
      const schema = parseUI('Kp :totalRevenue :orderCount :activeUsers');
      expect(schema.layers[0].root.children![0].label).toBe('Total Revenue');
      expect(schema.layers[0].root.children![1].label).toBe('Order Count');
      expect(schema.layers[0].root.children![2].label).toBe('Active Users');
    });

    it('should handle compact dashboard syntax', () => {
      const dashboard = `Kp :revenue :orders :customers :growth
Ln :month :sales
Tb :transactions [:date :amount :status]`;

      const schema = parseUI(dashboard);
      const root = schema.layers[0].root;

      // Should have 6 children: 4 KPIs + 1 chart + 1 table
      expect(root.children).toHaveLength(6);

      // First 4 are KPIs
      expect(root.children![0].type).toBe('kpi');
      expect(root.children![3].type).toBe('kpi');

      // 5th is chart
      expect(root.children![4].type).toBe('line');
      expect(root.children![4].binding?.x).toBe('month');

      // 6th is table
      expect(root.children![5].type).toBe('table');
      expect(root.children![5].columns).toEqual(['date', 'amount', 'status']);
    });
  });
});

// ============================================================================
// §10 Format Detection Tests
// ============================================================================

describe('Format Detection', () => {
  it('should detect LiquidSurvey format', () => {
    expect(detectFormat('> start "Welcome"')).toBe('liquidsurvey');
    expect(detectFormat('? q1 Tx* "Name?"')).toBe('liquidsurvey');
    expect(detectFormat('survey-id "Title"\n---\n> start')).toBe('liquidsurvey');
  });

  it('should detect LiquidCode format', () => {
    expect(detectFormat('@dr')).toBe('liquidcode');
    expect(detectFormat('1 :revenue')).toBe('liquidcode');
    expect(detectFormat('Bt "Click"')).toBe('liquidcode');
    expect(detectFormat('/1 9 "Modal"')).toBe('liquidcode');
  });

  it('should auto-parse based on format', () => {
    const surveyResult = parseAny('> start "Welcome" -> end\n< end "Done"');
    expect('nodes' in surveyResult).toBe(true);
    expect('startNodeId' in surveyResult).toBe(true);

    const uiResult = parseAny('1 :revenue');
    expect('layers' in uiResult).toBe(true);
    expect('version' in uiResult).toBe(true);
  });
});

// ============================================================================
// §11 Production Readiness Edge Cases
// ============================================================================

describe('Production Readiness', () => {
  describe('Error Handling', () => {
    it('should throw on unterminated string', () => {
      expect(() => parseUI('Bt "Hello')).toThrow();
    });

    it('should handle empty input', () => {
      const schema = parseUI('');
      expect(schema.layers.length).toBe(0);
      expect(schema.signals.length).toBe(0);
    });

    it('should handle whitespace-only input', () => {
      const schema = parseUI('   \n\t  ');
      expect(schema.layers.length).toBe(0);
    });

    it('should handle comment-only input', () => {
      const schema = parseUI('// comment\n// another');
      expect(schema.layers.length).toBe(0);
    });
  });

  describe('String Escapes', () => {
    it('should unescape quotes', () => {
      const schema = parseUI('Bt "Say \\"Hello\\""');
      expect(schema.layers[0].root.label).toBe('Say "Hello"');
    });

    it('should unescape newlines', () => {
      const schema = parseUI('Tx "Line1\\nLine2"');
      expect(schema.layers[0].root.label).toBe('Line1\nLine2');
    });

    it('should unescape tabs', () => {
      const schema = parseUI('Tx "Col1\\tCol2"');
      expect(schema.layers[0].root.label).toBe('Col1\tCol2');
    });

    it('should unescape backslashes', () => {
      const schema = parseUI('Tx "C:\\\\path"');
      expect(schema.layers[0].root.label).toBe('C:\\path');
    });
  });

  describe('Unknown Type Codes', () => {
    it('should parse 2-char unknown type codes', () => {
      const schema = parseUI('Xx :data');
      expect(schema.layers[0].root.type).toBe('xx');
    });

    it('should parse 3-char unknown type codes', () => {
      const schema = parseUI('Abc :data');
      expect(schema.layers[0].root.type).toBe('abc');
    });
  });

  describe('Complex Bindings', () => {
    it('should handle deeply nested field paths', () => {
      const schema = parseUI('Kp :a.b.c.d.e');
      expect(schema.layers[0].root.binding?.value).toBe('a.b.c.d.e');
    });

    it('should handle expressions with all operators', () => {
      const schema = parseUI('Kp =a+b*c/d-e%f');
      expect(schema.layers[0].root.binding?.value).toBe('a+b*c/d-e%f');
    });
  });

  describe('Conditional Blocks', () => {
    it('should parse single conditional block', () => {
      const schema = parseUI('?@tab=1 [Kp :x]');
      expect(schema.layers[0].root.condition?.signal).toBe('tab');
      expect(schema.layers[0].root.condition?.signalValue).toBe('1');
    });

    it('should parse multiple conditional blocks', () => {
      const schema = parseUI('?@tab=1 [Kp :a, Kp :b]');
      expect(schema.layers[0].root.children?.[0].condition?.signal).toBe('tab');
      expect(schema.layers[0].root.children?.[1].condition?.signal).toBe('tab');
    });
  });

  describe('Deep Nesting', () => {
    it('should handle 5 levels of nesting', () => {
      const schema = parseUI('0 [0 [0 [0 [0 [Kp :x]]]]]');
      const deepKpi = schema.layers[0].root
        .children?.[0]
        .children?.[0]
        .children?.[0]
        .children?.[0]
        .children?.[0];
      expect(deepKpi?.type).toBe('kpi');
    });
  });

  // ==========================================================================
  // Escape Sequence Edge Cases
  // ==========================================================================

  describe('Escape sequence edge cases', () => {
    it('should handle escaped backslash before quote (string ending with backslash)', () => {
      // "a\\" should be text 'a\' (a followed by literal backslash)
      const schema = parseUI('Tx "a\\\\"');
      expect(schema.layers[0]?.root.binding?.value).toBe('a\\');
    });

    it('should handle multiple escaped backslashes before quote', () => {
      // "a\\\\" should be text 'a\\' (a followed by two literal backslashes)
      const schema = parseUI('Tx "a\\\\\\\\"');
      expect(schema.layers[0]?.root.binding?.value).toBe('a\\\\');
    });

    it('should handle backslash-quote in middle of string', () => {
      // "a\"b" should be text 'a"b'
      const schema = parseUI('Tx "a\\"b"');
      expect(schema.layers[0]?.root.binding?.value).toBe('a"b');
    });

    it('should handle backslash-backslash-quote-more-text', () => {
      // "a\\" followed by more stuff should be: text 'a\' then parse next token
      const schema = parseUI('Tx "a\\\\" Bt "Click"');
      expect(schema.layers[0]?.root.type).toBe('container');
      expect(schema.layers[0]?.root.children?.[0]?.binding?.value).toBe('a\\');
      expect(schema.layers[0]?.root.children?.[1]?.type).toBe('button');
    });

    it('should roundtrip strings with newlines correctly', () => {
      const original = parseUI('Tx "Line1\\nLine2"');
      expect(original.layers[0]?.root.binding?.value).toBe('Line1\nLine2');

      const { reconstructed, isEquivalent } = roundtripUI(original);
      expect(reconstructed.layers[0]?.root.binding?.value).toBe('Line1\nLine2');
      expect(isEquivalent).toBe(true);
    });

    it('should roundtrip strings with tabs correctly', () => {
      const original = parseUI('Tx "Col1\\tCol2"');
      expect(original.layers[0]?.root.binding?.value).toBe('Col1\tCol2');

      const { reconstructed, isEquivalent } = roundtripUI(original);
      expect(reconstructed.layers[0]?.root.binding?.value).toBe('Col1\tCol2');
      expect(isEquivalent).toBe(true);
    });

    it('should roundtrip strings with backslashes correctly', () => {
      const original = parseUI('Tx "path\\\\to\\\\file"');
      expect(original.layers[0]?.root.binding?.value).toBe('path\\to\\file');

      const { reconstructed, isEquivalent } = roundtripUI(original);
      expect(reconstructed.layers[0]?.root.binding?.value).toBe('path\\to\\file');
      expect(isEquivalent).toBe(true);
    });

    it('should roundtrip strings with quotes correctly', () => {
      const original = parseUI('Tx "He said \\"Hello\\""');
      expect(original.layers[0]?.root.binding?.value).toBe('He said "Hello"');

      const { reconstructed, isEquivalent } = roundtripUI(original);
      expect(reconstructed.layers[0]?.root.binding?.value).toBe('He said "Hello"');
      expect(isEquivalent).toBe(true);
    });

    it('should handle complex mixed escape sequences', () => {
      // "a\\b\"c\nd" should be: a\b"c<newline>d
      const schema = parseUI('Tx "a\\\\b\\"c\\nd"');
      expect(schema.layers[0]?.root.binding?.value).toBe('a\\b"c\nd');
    });
  });

  // ==========================================================================
  // Robustness & Edge Cases
  // ==========================================================================

  describe('Robustness tests', () => {
    describe('Empty and whitespace inputs', () => {
      it('should handle empty string', () => {
        const schema = parseUI('');
        expect(schema.layers).toHaveLength(0);
        expect(schema.signals).toHaveLength(0);
      });

      it('should handle whitespace only', () => {
        const schema = parseUI('   \n\t\n   ');
        expect(schema.layers).toHaveLength(0);
      });

      it('should handle comments only', () => {
        const schema = parseUI('// This is a comment\n// Another comment');
        expect(schema.layers).toHaveLength(0);
      });

      it('should handle empty children brackets', () => {
        const schema = parseUI('Cn []');
        expect(schema.layers[0]?.root.type).toBe('container');
        // Empty brackets result in no children property (not empty array)
        expect(schema.layers[0]?.root.children).toBeUndefined();
      });

      it('should handle empty table columns', () => {
        const schema = parseUI('Tb []');
        expect(schema.layers[0]?.root.type).toBe('table');
        // Empty brackets result in no columns property (not empty array)
        expect(schema.layers[0]?.root.columns).toBeUndefined();
      });
    });

    describe('Unicode handling', () => {
      it('should handle unicode in strings', () => {
        const schema = parseUI('Tx "Hello 世界 🌍"');
        expect(schema.layers[0]?.root.binding?.value).toBe('Hello 世界 🌍');
      });

      it('should roundtrip unicode strings', () => {
        const original = parseUI('Tx "Ñoño 日本語 émoji 🎉"');
        const { reconstructed, isEquivalent } = roundtripUI(original);
        expect(reconstructed.layers[0]?.root.binding?.value).toBe('Ñoño 日本語 émoji 🎉');
        expect(isEquivalent).toBe(true);
      });

      it('should handle unicode in field names', () => {
        // Field names with accented characters
        const schema = parseUI('Kp :résumé');
        expect(schema.layers[0]?.root.binding?.value).toBe('résumé');
      });
    });

    describe('Deep nesting', () => {
      it('should handle deeply nested containers (10 levels)', () => {
        const deep = 'Cn [Cn [Cn [Cn [Cn [Cn [Cn [Cn [Cn [Cn [Tx "deep"]]]]]]]]]]';
        const schema = parseUI(deep);

        // Navigate to the deepest level
        let current = schema.layers[0]?.root;
        for (let i = 0; i < 10; i++) {
          expect(current?.type).toBe('container');
          current = current?.children?.[0];
        }
        expect(current?.type).toBe('text');
        expect(current?.binding?.value).toBe('deep');
      });

      it('should handle very long strings', () => {
        const longText = 'A'.repeat(10000);
        const schema = parseUI(`Tx "${longText}"`);
        expect(schema.layers[0]?.root.binding?.value).toBe(longText);
      });

      it('should handle many siblings', () => {
        const siblings = Array(100).fill('Kp :value').join(', ');
        const schema = parseUI(`Cn [${siblings}]`);
        expect(schema.layers[0]?.root.children).toHaveLength(100);
      });
    });

    describe('Malformed input handling', () => {
      it('should throw on unterminated string', () => {
        expect(() => parseUI('Tx "unterminated')).toThrow('Unterminated string');
      });

      it('should handle unclosed brackets gracefully', () => {
        // Parser should not hang or crash
        const schema = parseUI('Cn [Tx "test"');
        expect(schema.layers).toBeDefined();
      });

      it('should handle extra closing brackets gracefully', () => {
        const schema = parseUI('Cn [Tx "test"]]');
        expect(schema.layers).toBeDefined();
      });

      it('should handle invalid token sequences gracefully', () => {
        // Random tokens that don't form valid DSL
        const schema = parseUI('!!! ### %%% @@@');
        expect(schema.layers).toHaveLength(0);
      });

      it('should handle mixing valid and invalid', () => {
        const schema = parseUI('Tx "valid" ??? invalid Bt "also valid"');
        expect(schema.layers[0]?.root.type).toBe('container');
        // Should still parse the valid parts
        const children = schema.layers[0]?.root.children;
        expect(children?.some(c => c.type === 'text')).toBe(true);
        expect(children?.some(c => c.type === 'button')).toBe(true);
      });
    });

    describe('Property-based roundtrip tests', () => {
      it('should roundtrip all basic types', () => {
        // Use correct type codes from constants
        const types = ['Tx', 'Kp', 'Bt', 'Cn', 'Br', 'Ls', 'Tb', 'Ln', 'Fm', 'Pi'];
        for (const type of types) {
          const source = `${type} "test"`;
          const schema = parseUI(source);
          const { isEquivalent, differences } = roundtripUI(schema);
          if (!isEquivalent) {
            console.log(`Roundtrip fail for ${type}:`, differences);
          }
          expect(isEquivalent).toBe(true);
        }
      });

      it('should roundtrip all modifiers', () => {
        const modifiers = [
          '!h', '!p', '!s',           // priority
          '^r', '^c', '^g',           // flex
          '*2', '*f', '*h',           // span
          '#red', '#blue',            // color
          '%lg', '%sm',               // size
          '~5s', '~1m',               // stream intervals
          '$lo', '$hi', '$auto',      // fidelity
        ];
        for (const mod of modifiers) {
          const source = `Tx "test" ${mod}`;
          const schema = parseUI(source);
          const { isEquivalent } = roundtripUI(schema);
          expect(isEquivalent).toBe(true);
        }
      });

      it('should roundtrip stream modifiers', () => {
        const cases = [
          { source: 'Kp :price ~5s', expected: 'interval' },
          { source: 'Kp :data ~1m', expected: 'interval' },
          { source: 'Kp :live ~ws://api.test.com', expected: 'ws' },
        ];
        for (const { source, expected } of cases) {
          const schema = parseUI(source);
          expect(schema.layers[0]?.root.stream?.type).toBe(expected);
          const { isEquivalent } = roundtripUI(schema);
          expect(isEquivalent).toBe(true);
        }
      });

      it('should roundtrip fidelity modifiers', () => {
        const cases = [
          { source: '0 $lo [Kp :kpi]', expected: 'lo' },
          { source: 'Br :chart $hi', expected: 'hi' },
          { source: 'Cn $auto [Tx "content"]', expected: 'auto' },
          { source: '0 $skeleton [Kp :loading]', expected: 'skeleton' },
        ];
        for (const { source, expected } of cases) {
          const schema = parseUI(source);
          expect(schema.layers[0]?.root.fidelity).toBe(expected);
          const { isEquivalent } = roundtripUI(schema);
          expect(isEquivalent).toBe(true);
        }
      });

      it('should roundtrip signal combinations', () => {
        const cases = [
          '@tab Bt "Tab 1" >tab=1',
          '@state Tx "Status" <state',
          '@toggle Bt "Toggle" <>toggle',
        ];
        for (const source of cases) {
          const schema = parseUI(source);
          const { isEquivalent } = roundtripUI(schema);
          expect(isEquivalent).toBe(true);
        }
      });

      it('should roundtrip complex real-world examples', () => {
        const examples = [
          // Dashboard layout
          'Cn ^r [Kp :revenue !h, Kp :orders !p, Kp :customers !s]',
          // Tabbed interface
          '@tab Cn [Bt "Overview" >tab=1, Bt "Details" >tab=2] ?@tab=1 [Tx "Overview content"] ?@tab=2 [Tx "Details content"]',
          // Table with columns
          'Tb :data [:name, :email, :role]',
          // Bar chart with axes (Br not Ch)
          'Br :metrics.x :metrics.y',
        ];
        for (const source of examples) {
          const schema = parseUI(source);
          const { isEquivalent, differences } = roundtripUI(schema);
          if (!isEquivalent) {
            console.log(`Roundtrip diff for: ${source}`);
            console.log(differences);
          }
          expect(isEquivalent).toBe(true);
        }
      });
    });

    describe('Boundary conditions', () => {
      it('should handle single character field names', () => {
        const schema = parseUI('Kp :x');
        expect(schema.layers[0]?.root.binding?.value).toBe('x');
      });

      it('should handle numeric field names', () => {
        const schema = parseUI('Kp :field123');
        expect(schema.layers[0]?.root.binding?.value).toBe('field123');
      });

      it('should handle deeply nested field paths', () => {
        const schema = parseUI('Kp :a.b.c.d.e.f.g');
        expect(schema.layers[0]?.root.binding?.value).toBe('a.b.c.d.e.f.g');
      });

      it('should handle multiple signals declaration', () => {
        const schema = parseUI('@sig1 @sig2 @sig3 @sig4 @sig5 Tx "test"');
        expect(schema.signals).toHaveLength(5);
      });

      it('should handle multiple layers', () => {
        const schema = parseUI('Tx "main" /1 Tx "layer1" /2 Tx "layer2" /3 Tx "layer3"');
        expect(schema.layers).toHaveLength(4); // layer 0 (main) + 3 more
      });

      it('should handle layer zero explicitly', () => {
        const schema = parseUI('/0 Tx "explicit layer 0"');
        expect(schema.layers[0]?.id).toBe(0);
        expect(schema.layers[0]?.root.binding?.value).toBe('explicit layer 0');
      });
    });

    describe.skip('resource limits', () => {
      it('should reject strings exceeding maximum length', () => {
        const longString = 'Kp "' + 'a'.repeat(60000) + '"';
        expect(() => parseUI(longString)).toThrow(/String exceeds maximum length/);
      });

      it('should reject excessive nesting depth', () => {
        const deepInput = '['.repeat(150) + 'Kp :a' + ']'.repeat(150);
        expect(() => parseUI(deepInput)).toThrow(/nesting depth/);
      });

      it('should reject too many tokens', () => {
        const manyTokens = Array(200000).fill('Kp').join(' ');
        expect(() => parseUI(manyTokens)).toThrow(/Too many tokens/);
      });

      it('should reject too many children per block', () => {
        const manyChildren = 'Cn [' + Array(1500).fill('Kp :a').join(', ') + ']';
        expect(() => parseUI(manyChildren)).toThrow(/Too many children/);
      });

      it('should accept input within limits', () => {
        const validInput = 'Kp "' + 'a'.repeat(1000) + '"';
        expect(() => parseUI(validInput)).not.toThrow();
      });

      it('should accept moderate nesting', () => {
        const moderateNesting = '['.repeat(50) + 'Kp :a' + ']'.repeat(50);
        expect(() => parseUI(moderateNesting)).not.toThrow();
      });
    });

    // ==========================================================================
    // Error Recovery Tests
    // ==========================================================================

    describe.skip('Error Recovery (Lenient Mode)', () => {
      it('should collect errors for unterminated string and return partial AST', () => {
        const result = parseUI('Kp :a "unterminated', { lenient: true }) as import('../src/compiler/ui-compiler').ParseUIResult;

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]?.message).toContain('Unterminated string');
        expect(result.isComplete).toBe(false);

        // Should still have the Kp block before the error
        expect(result.schema.layers.length).toBeGreaterThan(0);
        const root = result.schema.layers[0]?.root;
        expect(root?.children?.some(c => c.type === 'kpi')).toBe(true);
      });

      it('should collect multiple errors', () => {
        const result = parseUI('Kp "bad Bt "also bad', { lenient: true }) as import('../src/compiler/ui-compiler').ParseUIResult;

        expect(result.errors.length).toBeGreaterThanOrEqual(1);
        expect(result.isComplete).toBe(false);
      });

      it('should recover after unterminated string and continue parsing', () => {
        const result = parseUI('Kp "unterminated\nBt "Click"', { lenient: true }) as import('../src/compiler/ui-compiler').ParseUIResult;

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.isComplete).toBe(false);

        // Should have parsed the button after the error
        const root = result.schema.layers[0]?.root;
        expect(root?.children?.some(c => c.type === 'button')).toBe(true);
      });

      it('should handle multiple errors in complex input', () => {
        const result = parseUI('Kp :a "unterminated, Bt "another bad, Ln :valid :data', { lenient: true }) as import('../src/compiler/ui-compiler').ParseUIResult;

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.isComplete).toBe(false);

        // Should still parse valid parts
        const root = result.schema.layers[0]?.root;
        const hasValidLine = root?.children?.some(c => c.type === 'line' && c.binding?.x === 'valid');
        expect(hasValidLine).toBe(true);
      });

      it('should work in strict mode by default (throw on error)', () => {
        expect(() => parseUI('Kp "unterminated')).toThrow('Unterminated string');
      });

      it('should work in strict mode with explicit option', () => {
        expect(() => parseUI('Kp "unterminated', { lenient: false })).toThrow('Unterminated string');
      });

      it('should return schema directly in strict mode with valid input', () => {
        const result = parseUI('Kp :revenue');

        // In strict mode with valid input, should return LiquidSchema directly
        expect('version' in result).toBe(true);
        expect('layers' in result).toBe(true);
        expect('errors' in result).toBe(false);  // Not a ParseUIResult
      });

      it('should handle error at end of input gracefully', () => {
        const result = parseUI('Kp :value "end', { lenient: true }) as import('../src/compiler/ui-compiler').ParseUIResult;

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.schema.layers.length).toBeGreaterThan(0);
      });

      it('should recover from scanner errors (unterminated string)', () => {
        const result = parseUI('Tx "hello\nTx "world"', { lenient: true }) as import('../src/compiler/ui-compiler').ParseUIResult;

        // Should have unterminated string error
        expect(result.errors.some(e => e.message.includes('Unterminated string'))).toBe(true);

        // Should continue and parse the second text block
        const root = result.schema.layers[0]?.root;
        const textBlocks = root?.children?.filter(c => c.type === 'text') ?? [];
        expect(textBlocks.length).toBeGreaterThan(0);
      });

      it('should handle empty input gracefully in lenient mode', () => {
        const result = parseUI('', { lenient: true }) as import('../src/compiler/ui-compiler').ParseUIResult;

        expect(result.errors.length).toBe(0);
        expect(result.isComplete).toBe(true);
        expect(result.schema.layers.length).toBe(0);
      });

      it('should synchronize to next block after error', () => {
        const result = parseUI('Kp "bad string\n, Kp :orders\nBt "Click"', { lenient: true }) as import('../src/compiler/ui-compiler').ParseUIResult;

        expect(result.errors.length).toBeGreaterThan(0);

        // Should parse blocks after the error
        const root = result.schema.layers[0]?.root;
        expect(root?.children?.some(c => c.type === 'kpi' && c.binding?.value === 'orders')).toBe(true);
        expect(root?.children?.some(c => c.type === 'button')).toBe(true);
      });
    });
  });
});
