import { describe, it, expect } from 'vitest';
import { parseUI, roundtripUI } from '../src/compiler/compiler';

describe('Tooltip Component', () => {
  describe('Basic Tooltip Parsing', () => {
    it('should parse tooltip with text and trigger', () => {
      const input = 'Tl "Help information" [Ic "info"]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.type).toBe('tooltip');
      expect(block.label).toBe('Help information');
      expect(block.children).toHaveLength(1);
      expect(block.children![0].type).toBe('icon');
    });

    it('should parse tooltip with binding', () => {
      const input = 'Tl :helpText [Bt "?"]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.type).toBe('tooltip');
      expect(block.binding?.value).toBe('helpText');
      expect(block.children).toHaveLength(1);
      expect(block.children![0].type).toBe('button');
    });

    it('should parse tooltip trigger element', () => {
      const input = 'Tl "Click for help" [Ic "help"]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.children![0].type).toBe('icon');
      expect(block.children![0].label).toBe('help');
    });
  });

  describe('Tooltip Roundtrip', () => {
    it('should roundtrip tooltip with text', () => {
      const input = 'Tl "Tooltip text" [Ic "info"]';
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });

    it('should roundtrip tooltip with binding', () => {
      const input = 'Tl :tooltip [Bt "Help"]';
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });
  });

  describe('Multiple Tooltips', () => {
    it('should parse tooltips in container', () => {
      const input = `{
  Tl "Info 1" [Ic "info"]
  Tl "Help text" [Ic "help"]
}`;
      const schema = parseUI(input);

      const container = schema.layers[0]?.root;
      expect(container.children).toHaveLength(2);
      expect(container.children![0].type).toBe('tooltip');
      expect(container.children![1].type).toBe('tooltip');
    });
  });
});
