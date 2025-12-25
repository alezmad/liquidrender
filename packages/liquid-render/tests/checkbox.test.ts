// Checkbox Component Tests
import { describe, it, expect } from 'vitest';
import { parseUI, roundtripUI } from '../src/compiler/compiler';

describe('Checkbox Component', () => {
  describe('Basic Checkbox Parsing', () => {
    it('should parse simple checkbox with label', () => {
      const input = 'Ck :user.agreed "I agree to terms"';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.type).toBe('checkbox');
      expect(block.label).toBe('I agree to terms');
      expect(block.binding?.kind).toBe('field');
      expect(block.binding?.value).toBe('user.agreed');
    });

    it('should parse checkbox without label', () => {
      const input = 'Ck :enabled';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.type).toBe('checkbox');
      expect(block.binding?.kind).toBe('field');
      expect(block.binding?.value).toBe('enabled');
    });

    it('should parse checkbox with signal emission', () => {
      const input = `sig submitted
Ck :accepted >submitted "Accept terms"`;
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.type).toBe('checkbox');
      expect(block.signals?.emit?.name).toBe('submitted');
      expect(block.label).toBe('Accept terms');
    });
  });

  describe('Checkbox Roundtrip', () => {
    it('should roundtrip simple checkbox', () => {
      const input = 'Ck :user.agreed "I agree to terms"';
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });

    it('should roundtrip checkbox without label', () => {
      const input = 'Ck :enabled';
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });

    it('should roundtrip checkbox with signal', () => {
      const input = `sig submitted
Ck :accepted >submitted "Accept terms"`;
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });
  });

  describe('Multiple Checkboxes', () => {
    it('should parse multiple checkboxes', () => {
      const input = `{
  Ck :terms "Agree to terms"
  Ck :privacy "Agree to privacy policy"
  Ck :newsletter "Subscribe to newsletter"
}`;
      const schema = parseUI(input);

      const container = schema.layers[0]?.root;
      expect(container).toBeDefined();
      expect(container.type).toBe('container');
      expect(container.children).toHaveLength(3);
      expect(container.children![0].type).toBe('checkbox');
      expect(container.children![1].type).toBe('checkbox');
      expect(container.children![2].type).toBe('checkbox');
    });

    it('should roundtrip multiple checkboxes', () => {
      const input = `{
  Ck :terms "Agree to terms"
  Ck :privacy "Agree to privacy policy"
  Ck :newsletter "Subscribe to newsletter"
}`;
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });
  });

  describe('Checkbox in Container', () => {
    it('should parse checkbox inside container', () => {
      // Use explicit container syntax with bracket notation
      const input = '0 [Ck :accepted "I accept"]';
      const schema = parseUI(input);

      const container = schema.layers[0]?.root;
      expect(container).toBeDefined();
      expect(container.type).toBe('container');
      expect(container.children).toHaveLength(1);
      expect(container.children![0].type).toBe('checkbox');
    });

    it('should roundtrip checkbox in container', () => {
      const input = '0 [Ck :accepted "I accept"]';
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });
  });
});
