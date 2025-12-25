import { describe, it, expect } from 'vitest';
import { parseUI, roundtripUI } from '../src/compiler/compiler';

describe('Accordion Component', () => {
  describe('Basic Accordion Parsing', () => {
    it('should parse accordion with title and children', () => {
      const input = 'Ac "Details" [Tx :description]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.type).toBe('accordion');
      expect(block.label).toBe('Details');
      expect(block.children).toHaveLength(1);
    });

    it('should parse accordion with binding title', () => {
      const input = 'Ac :faq.title [Tx :faq.answer]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.type).toBe('accordion');
      expect(block.binding?.value).toBe('faq.title');
    });

    it('should parse accordion with multiple children', () => {
      const input = 'Ac "Info" [Tx :line1, Tx :line2, Tx :line3]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.children).toHaveLength(3);
    });
  });

  describe('Accordion Roundtrip', () => {
    it('should roundtrip accordion with title', () => {
      const input = 'Ac "Details" [Tx :content]';
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });

    it('should roundtrip accordion with binding', () => {
      const input = 'Ac :section.title [Tx :section.body]';
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });
  });

  describe('Multiple Accordions', () => {
    it('should parse accordion group', () => {
      const input = `{
  Ac "Section 1" [Tx "Content 1"]
  Ac "Section 2" [Tx "Content 2"]
}`;
      const schema = parseUI(input);

      const container = schema.layers[0]?.root;
      expect(container.children).toHaveLength(2);
      expect(container.children![0].type).toBe('accordion');
      expect(container.children![1].type).toBe('accordion');
    });
  });
});
