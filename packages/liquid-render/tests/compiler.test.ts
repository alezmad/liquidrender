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
      const tokens = scanner.scan();

      expect(tokens[0].type).toBe('UI_TYPE_INDEX');
      expect(tokens[0].value).toBe('0');
      expect(tokens[1].type).toBe('UI_TYPE_INDEX');
      expect(tokens[1].value).toBe('1');
    });

    it('should tokenize type codes', () => {
      const scanner = new UIScanner('Kp Br Bt In');
      const tokens = scanner.scan();

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
      const tokens = scanner.scan();

      expect(tokens[0].type).toBe('FIELD');
      expect(tokens[0].value).toBe(':field');
      expect(tokens[1].type).toBe('FIELD');
      expect(tokens[1].value).toBe(':another_field');
    });

    it('should tokenize iterator binding', () => {
      const scanner = new UIScanner(':. :.name');
      const tokens = scanner.scan();

      expect(tokens[0].type).toBe('ITERATOR');
      expect(tokens[0].value).toBe(':.');
      expect(tokens[1].type).toBe('ITERATOR');
      expect(tokens[1].value).toBe(':.name');
    });

    it('should tokenize index reference', () => {
      const scanner = new UIScanner(':#');
      const tokens = scanner.scan();

      expect(tokens[0].type).toBe('INDEX_REF');
      expect(tokens[0].value).toBe(':#');
    });

    it('should tokenize expression binding', () => {
      const scanner = new UIScanner('=revenue/orders');
      const tokens = scanner.scan();

      expect(tokens[0].type).toBe('EXPR');
      expect(tokens[0].value).toBe('=revenue/orders');
    });

    it('should tokenize literal strings', () => {
      const scanner = new UIScanner('"Hello World"');
      const tokens = scanner.scan();

      expect(tokens[0].type).toBe('STRING');
      expect(tokens[0].value).toBe('Hello World');
    });
  });

  describe('modifier tokens', () => {
    it('should tokenize signal declaration', () => {
      const scanner = new UIScanner('@dr @filter');
      const tokens = scanner.scan();

      expect(tokens[0].type).toBe('SIGNAL_DECLARE');
      expect(tokens[0].value).toBe('@dr');
      expect(tokens[1].type).toBe('SIGNAL_DECLARE');
      expect(tokens[1].value).toBe('@filter');
    });

    it('should tokenize signal emit', () => {
      const scanner = new UIScanner('>action >tab=0');
      const tokens = scanner.scan();

      expect(tokens[0].type).toBe('SIGNAL_EMIT');
      expect(tokens[0].value).toBe('>action');
      expect(tokens[1].type).toBe('SIGNAL_EMIT');
      expect(tokens[1].value).toBe('>tab=0');
    });

    it('should tokenize signal receive', () => {
      const scanner = new UIScanner('<dr <filter');
      const tokens = scanner.scan();

      expect(tokens[0].type).toBe('SIGNAL_RECEIVE');
      expect(tokens[0].value).toBe('<dr');
      expect(tokens[1].type).toBe('SIGNAL_RECEIVE');
      expect(tokens[1].value).toBe('<filter');
    });

    it('should tokenize bidirectional signal', () => {
      const scanner = new UIScanner('<>sel');
      const tokens = scanner.scan();

      expect(tokens[0].type).toBe('SIGNAL_BOTH');
      expect(tokens[0].value).toBe('<>sel');
    });

    it('should tokenize priority modifier', () => {
      const scanner = new UIScanner('!h !p !s !3');
      const tokens = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'PRIORITY', value: '!h' });
      expect(tokens[1]).toMatchObject({ type: 'PRIORITY', value: '!p' });
      expect(tokens[2]).toMatchObject({ type: 'PRIORITY', value: '!s' });
      expect(tokens[3]).toMatchObject({ type: 'PRIORITY', value: '!3' });
    });

    it('should tokenize flex modifier', () => {
      const scanner = new UIScanner('^f ^s ^g');
      const tokens = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'FLEX', value: '^f' });
      expect(tokens[1]).toMatchObject({ type: 'FLEX', value: '^s' });
      expect(tokens[2]).toMatchObject({ type: 'FLEX', value: '^g' });
    });

    it('should tokenize span modifier', () => {
      const scanner = new UIScanner('*3 *f *h');
      const tokens = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'SPAN', value: '*3' });
      expect(tokens[1]).toMatchObject({ type: 'SPAN', value: '*f' });
      expect(tokens[2]).toMatchObject({ type: 'SPAN', value: '*h' });
    });

    it('should tokenize color modifier', () => {
      const scanner = new UIScanner('#red #blue');
      const tokens = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'COLOR', value: '#red' });
      expect(tokens[1]).toMatchObject({ type: 'COLOR', value: '#blue' });
    });

    it('should tokenize size modifier', () => {
      const scanner = new UIScanner('%lg %sm');
      const tokens = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'SIZE', value: '%lg' });
      expect(tokens[1]).toMatchObject({ type: 'SIZE', value: '%sm' });
    });

    it('should tokenize layer trigger', () => {
      const scanner = new UIScanner('>/1 >/2');
      const tokens = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'SIGNAL_EMIT', value: '>/1' });
      expect(tokens[1]).toMatchObject({ type: 'SIGNAL_EMIT', value: '>/2' });
    });
  });

  describe('structure tokens', () => {
    it('should tokenize layer definition', () => {
      const scanner = new UIScanner('/1 /2');
      const tokens = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'LAYER', value: '/1' });
      expect(tokens[1]).toMatchObject({ type: 'LAYER', value: '/2' });
    });

    it('should tokenize layer close', () => {
      const scanner = new UIScanner('/<');
      const tokens = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'LAYER_CLOSE', value: '/<' });
    });

    it('should tokenize brackets and comma', () => {
      const scanner = new UIScanner('[a, b, c]');
      const tokens = scanner.scan();

      expect(tokens[0].type).toBe('LBRACKET');
      expect(tokens[4].type).toBe('COMMA');
      expect(tokens[6].type).toBe('RBRACKET');
    });

    it('should tokenize Survey keyword', () => {
      const scanner = new UIScanner('Survey {');
      const tokens = scanner.scan();

      expect(tokens[0]).toMatchObject({ type: 'SURVEY_START', value: 'Survey' });
      expect(tokens[1]).toMatchObject({ type: 'LBRACE', value: '{' });
    });
  });

  describe('complex expressions', () => {
    it('should tokenize a KPI dashboard', () => {
      const scanner = new UIScanner('1 :revenue, 1 :orders, 1 :customers, 1 :aov');
      const tokens = scanner.scan();

      // Four KPIs (1) with field bindings
      const typeTokens = tokens.filter(t => t.type === 'UI_TYPE_INDEX');
      expect(typeTokens).toHaveLength(4);

      const fieldTokens = tokens.filter(t => t.type === 'FIELD');
      expect(fieldTokens).toHaveLength(4);
    });
  });
});

// ============================================================================
// §7 UI Parser Tests
// ============================================================================

describe('UI Parser', () => {
  describe('signal parsing', () => {
    it('should parse signal declarations', () => {
      const scanner = new UIScanner('@dr @filter');
      const parser = new UIParser(scanner.scan());
      const ast = parser.parse();

      expect(ast.signals).toHaveLength(2);
      expect(ast.signals[0].name).toBe('dr');
      expect(ast.signals[1].name).toBe('filter');
    });
  });

  describe('block parsing', () => {
    it('should parse indexed type', () => {
      const scanner = new UIScanner('1 :revenue');
      const parser = new UIParser(scanner.scan());
      const ast = parser.parse();

      expect(ast.mainBlocks).toHaveLength(1);
      expect(ast.mainBlocks[0].type).toBe('kpi');
      expect(ast.mainBlocks[0].typeIndex).toBe(1);
    });

    it('should parse type code', () => {
      const scanner = new UIScanner('Bt "Click Me"');
      const parser = new UIParser(scanner.scan());
      const ast = parser.parse();

      expect(ast.mainBlocks).toHaveLength(1);
      expect(ast.mainBlocks[0].type).toBe('button');
      expect(ast.mainBlocks[0].typeCode).toBe('Bt');
    });

    it('should parse field binding', () => {
      const scanner = new UIScanner('5 :orders');
      const parser = new UIParser(scanner.scan());
      const ast = parser.parse();

      expect(ast.mainBlocks[0].bindings).toHaveLength(1);
      expect(ast.mainBlocks[0].bindings[0]).toMatchObject({
        kind: 'field',
        value: 'orders',
      });
    });

    it('should parse multiple field bindings (chart axes)', () => {
      const scanner = new UIScanner('3 :date :amount');
      const parser = new UIParser(scanner.scan());
      const ast = parser.parse();

      expect(ast.mainBlocks[0].bindings).toHaveLength(2);
      expect(ast.mainBlocks[0].bindings[0].value).toBe('date');
      expect(ast.mainBlocks[0].bindings[1].value).toBe('amount');
    });

    it('should parse literal binding', () => {
      const scanner = new UIScanner('Bt "Submit"');
      const parser = new UIParser(scanner.scan());
      const ast = parser.parse();

      expect(ast.mainBlocks[0].bindings[0]).toMatchObject({
        kind: 'literal',
        value: 'Submit',
      });
    });

    it('should parse expression binding', () => {
      const scanner = new UIScanner('1 =revenue/orders');
      const parser = new UIParser(scanner.scan());
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
      const parser = new UIParser(scanner.scan());
      const ast = parser.parse();

      const priorityMod = ast.mainBlocks[0].modifiers.find(m => m.kind === 'priority');
      expect(priorityMod).toBeDefined();
      expect(priorityMod!.value).toBe(100); // 'h' = hero = 100
    });

    it('should parse emit signal modifier', () => {
      const scanner = new UIScanner('Bt "Click" >action');
      const parser = new UIParser(scanner.scan());
      const ast = parser.parse();

      const emitMod = ast.mainBlocks[0].modifiers.find(m => m.kind === 'emit');
      expect(emitMod).toBeDefined();
      expect(emitMod!.target).toBe('action');
    });

    it('should parse emit signal with value', () => {
      const scanner = new UIScanner('Bt "Tab1" >tab=0');
      const parser = new UIParser(scanner.scan());
      const ast = parser.parse();

      const emitMod = ast.mainBlocks[0].modifiers.find(m => m.kind === 'emit');
      expect(emitMod!.target).toBe('tab');
      expect(emitMod!.value).toBe('0');
    });

    it('should parse receive signal modifier', () => {
      const scanner = new UIScanner('5 :orders <dr');
      const parser = new UIParser(scanner.scan());
      const ast = parser.parse();

      const recvMod = ast.mainBlocks[0].modifiers.find(m => m.kind === 'receive');
      expect(recvMod).toBeDefined();
      expect(recvMod!.target).toBe('dr');
    });

    it('should parse layer trigger', () => {
      const scanner = new UIScanner('Bt "Open" >/1');
      const parser = new UIParser(scanner.scan());
      const ast = parser.parse();

      const emitMod = ast.mainBlocks[0].modifiers.find(m => m.kind === 'emit');
      expect(emitMod!.layerId).toBe(1);
    });

    it('should parse action modifier', () => {
      const scanner = new UIScanner('Bt "Save" !submit');
      const parser = new UIParser(scanner.scan());
      const ast = parser.parse();

      const actionMod = ast.mainBlocks[0].modifiers.find(m => m.kind === 'action');
      expect(actionMod).toBeDefined();
      expect(actionMod!.value).toBe('submit');
    });
  });

  describe('children parsing', () => {
    it('should parse children array', () => {
      const scanner = new UIScanner('0 [Bt "A", Bt "B"]');
      const parser = new UIParser(scanner.scan());
      const ast = parser.parse();

      expect(ast.mainBlocks[0].children).toHaveLength(2);
      expect(ast.mainBlocks[0].children![0].type).toBe('button');
      expect(ast.mainBlocks[0].children![1].type).toBe('button');
    });

    it('should parse nested children', () => {
      const scanner = new UIScanner('0 [0 [Bt "Inner"]]');
      const parser = new UIParser(scanner.scan());
      const ast = parser.parse();

      expect(ast.mainBlocks[0].children).toHaveLength(1);
      expect(ast.mainBlocks[0].children![0].children).toHaveLength(1);
      expect(ast.mainBlocks[0].children![0].children![0].type).toBe('button');
    });
  });

  describe('layer parsing', () => {
    it('should parse layer definition', () => {
      const scanner = new UIScanner('/1 9 "Modal" [Bt "Close"]');
      const parser = new UIParser(scanner.scan());
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
      const parser = new UIParser(scanner.scan());
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
