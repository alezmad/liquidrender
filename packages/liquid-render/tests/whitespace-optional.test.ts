/**
 * Whitespace-Optional Modifiers Tests
 * Verifies that modifiers can be concatenated without whitespace
 */

import { describe, it, expect } from 'vitest';
import { UIScanner } from '../src/compiler/ui-scanner';
import { parseUI } from '../src/compiler/compiler';

describe('Whitespace-Optional Modifiers', () => {
  describe('Scanner tokenization', () => {
    it('should split type + field without space', () => {
      const scanner = new UIScanner('Kp:revenue');
      const result = scanner.scan();
      const tokens = result.tokens;

      // Should be: UI_TYPE_CODE(Kp), FIELD(:revenue), EOF
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toMatchObject({ type: 'UI_TYPE_CODE', value: 'Kp' });
      expect(tokens[1]).toMatchObject({ type: 'FIELD', value: ':revenue' });
      expect(tokens[2]).toMatchObject({ type: 'EOF' });
    });

    it('should split multiple modifiers concatenated', () => {
      const scanner = new UIScanner('Kp:revenue#green!h');
      const result = scanner.scan();
      const tokens = result.tokens;

      // Should be: UI_TYPE_CODE(Kp), FIELD(:revenue), COLOR(#green), PRIORITY(!h), EOF
      expect(tokens).toHaveLength(5);
      expect(tokens[0]).toMatchObject({ type: 'UI_TYPE_CODE', value: 'Kp' });
      expect(tokens[1]).toMatchObject({ type: 'FIELD', value: ':revenue' });
      expect(tokens[2]).toMatchObject({ type: 'COLOR', value: '#green' });
      expect(tokens[3]).toMatchObject({ type: 'PRIORITY', value: '!h' });
      expect(tokens[4]).toMatchObject({ type: 'EOF' });
    });

    it('should split type + multiple modifiers without spaces', () => {
      const scanner = new UIScanner('Bt:submit!submit>submit');
      const result = scanner.scan();
      const tokens = result.tokens;

      // Should be: UI_TYPE_CODE(Bt), FIELD(:submit), PRIORITY(!submit), SIGNAL_EMIT(>submit), EOF
      expect(tokens).toHaveLength(5);
      expect(tokens[0]).toMatchObject({ type: 'UI_TYPE_CODE', value: 'Bt' });
      expect(tokens[1]).toMatchObject({ type: 'FIELD', value: ':submit' });
      expect(tokens[2]).toMatchObject({ type: 'PRIORITY', value: '!submit' });
      expect(tokens[3]).toMatchObject({ type: 'SIGNAL_EMIT', value: '>submit' });
      expect(tokens[4]).toMatchObject({ type: 'EOF' });
    });

    it('should handle all prefix characters as delimiters', () => {
      const scanner = new UIScanner('Kp:x#y!z@a>b<c~5s$lo%lg^g*3');
      const result = scanner.scan();
      const tokens = result.tokens;

      expect(tokens[0]).toMatchObject({ type: 'UI_TYPE_CODE', value: 'Kp' });
      expect(tokens[1]).toMatchObject({ type: 'FIELD', value: ':x' });
      expect(tokens[2]).toMatchObject({ type: 'COLOR', value: '#y' });
      expect(tokens[3]).toMatchObject({ type: 'PRIORITY', value: '!z' });
      expect(tokens[4]).toMatchObject({ type: 'SIGNAL_DECLARE', value: '@a' });
      expect(tokens[5]).toMatchObject({ type: 'SIGNAL_EMIT', value: '>b' });
      expect(tokens[6]).toMatchObject({ type: 'SIGNAL_RECEIVE', value: '<c' });
      expect(tokens[7]).toMatchObject({ type: 'STREAM', value: '~5s' });
      expect(tokens[8]).toMatchObject({ type: 'FIDELITY', value: '$lo' });
      expect(tokens[9]).toMatchObject({ type: 'SIZE', value: '%lg' });
      expect(tokens[10]).toMatchObject({ type: 'FLEX', value: '^g' });
      expect(tokens[11]).toMatchObject({ type: 'SPAN', value: '*3' });
    });
  });

  describe('Parser integration', () => {
    it('should parse type + field without space', () => {
      const schema = parseUI('Kp:revenue');
      expect(schema.layers[0].root.type).toBe('kpi');
      expect(schema.layers[0].root.binding?.value).toBe('revenue');
    });

    it('should parse multiple modifiers without spaces', () => {
      const schema = parseUI('Kp:revenue#green!h');
      const root = schema.layers[0].root;

      expect(root.type).toBe('kpi');
      expect(root.binding?.value).toBe('revenue');
      expect(root.style?.color).toBe('green');
      expect(root.layout?.priority).toBe(100); // !h = hero = 100
    });

    it('should parse complex concatenation', () => {
      const schema = parseUI('Bt:submit!submit>action');
      const root = schema.layers[0].root;

      expect(root.type).toBe('button');
      expect(root.binding?.value).toBe('submit');
      expect(root.action).toBe('submit');
      expect(root.signals?.emit?.name).toBe('action');
    });

    it('should parse mixed spaced and concatenated', () => {
      const schema = parseUI('Kp:revenue #green !h, Kp:orders#blue!p');
      const children = schema.layers[0].root.children;

      expect(children).toHaveLength(2);

      // First KPI - spaced modifiers
      expect(children![0].binding?.value).toBe('revenue');
      expect(children![0].style?.color).toBe('green');
      expect(children![0].layout?.priority).toBe(100);

      // Second KPI - concatenated modifiers
      expect(children![1].binding?.value).toBe('orders');
      expect(children![1].style?.color).toBe('blue');
      expect(children![1].layout?.priority).toBe(75); // !p = primary = 75
    });
  });

  describe('Equivalence between spaced and concatenated', () => {
    it('should produce identical schema for spaced vs concatenated', () => {
      const spaced = parseUI('Kp :revenue #green !h');
      const concatenated = parseUI('Kp:revenue#green!h');

      // Normalize UIDs for comparison
      const normalizeUid = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(normalizeUid);
        }
        if (obj && typeof obj === 'object') {
          const normalized = { ...obj };
          if ('uid' in normalized) {
            delete normalized.uid;
          }
          for (const key in normalized) {
            normalized[key] = normalizeUid(normalized[key]);
          }
          return normalized;
        }
        return obj;
      };

      expect(normalizeUid(spaced)).toEqual(normalizeUid(concatenated));
    });

    it('should produce identical schema for button actions', () => {
      const spaced = parseUI('Bt "Submit" !submit >action');
      const concatenated = parseUI('Bt "Submit"!submit>action');

      const normalizeUid = (obj: any): any => {
        if (Array.isArray(obj)) return obj.map(normalizeUid);
        if (obj && typeof obj === 'object') {
          const normalized = { ...obj };
          if ('uid' in normalized) delete normalized.uid;
          for (const key in normalized) {
            normalized[key] = normalizeUid(normalized[key]);
          }
          return normalized;
        }
        return obj;
      };

      expect(normalizeUid(spaced)).toEqual(normalizeUid(concatenated));
    });
  });

  describe('Edge cases', () => {
    it('should handle expression binding concatenated', () => {
      const scanner = new UIScanner('Kp=revenue/orders#green');
      const result = scanner.scan();
      const tokens = result.tokens;

      expect(tokens[0]).toMatchObject({ type: 'UI_TYPE_CODE', value: 'Kp' });
      expect(tokens[1]).toMatchObject({ type: 'EXPR', value: '=revenue/orders' });
      expect(tokens[2]).toMatchObject({ type: 'COLOR', value: '#green' });
    });

    it('should handle string literal concatenated', () => {
      const scanner = new UIScanner('Bt"Submit"!submit');
      const result = scanner.scan();
      const tokens = result.tokens;

      expect(tokens[0]).toMatchObject({ type: 'UI_TYPE_CODE', value: 'Bt' });
      expect(tokens[1]).toMatchObject({ type: 'STRING', value: 'Submit' });
      expect(tokens[2]).toMatchObject({ type: 'PRIORITY', value: '!submit' });
    });

    it('should handle type index concatenated', () => {
      const scanner = new UIScanner('1:revenue#green');
      const result = scanner.scan();
      const tokens = result.tokens;

      expect(tokens[0]).toMatchObject({ type: 'UI_TYPE_INDEX', value: '1' });
      expect(tokens[1]).toMatchObject({ type: 'FIELD', value: ':revenue' });
      expect(tokens[2]).toMatchObject({ type: 'COLOR', value: '#green' });
    });

    it('should handle conditional concatenated', () => {
      const scanner = new UIScanner('?@tab=1[Kp:x]');
      const result = scanner.scan();
      const tokens = result.tokens;

      expect(tokens[0]).toMatchObject({ type: 'CONDITION', value: '?@tab=1' });
      expect(tokens[1]).toMatchObject({ type: 'LBRACKET', value: '[' });
      expect(tokens[2]).toMatchObject({ type: 'UI_TYPE_CODE', value: 'Kp' });
      expect(tokens[3]).toMatchObject({ type: 'FIELD', value: ':x' });
      expect(tokens[4]).toMatchObject({ type: 'RBRACKET', value: ']' });
    });

    it('should handle layer trigger concatenated', () => {
      const scanner = new UIScanner('Bt"Open">/1');
      const result = scanner.scan();
      const tokens = result.tokens;

      expect(tokens[0]).toMatchObject({ type: 'UI_TYPE_CODE', value: 'Bt' });
      expect(tokens[1]).toMatchObject({ type: 'STRING', value: 'Open' });
      expect(tokens[2]).toMatchObject({ type: 'SIGNAL_EMIT', value: '>/1' });
    });
  });
});
