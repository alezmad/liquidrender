import { describe, it, expect } from 'vitest';
import { parseUI, roundtripUI } from '../src/compiler/compiler';

describe('Popover Component', () => {
  describe('Basic Popover Parsing', () => {
    it('should parse popover with trigger and content', () => {
      const input = 'Pp [Bt "Info", Tx "More details"]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.type).toBe('popover');
      expect(block.children).toHaveLength(2);
    });

    it('should parse popover trigger element', () => {
      const input = 'Pp [Ic "help", Tx "Help text here"]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.children![0].type).toBe('icon');
    });

    it('should parse popover with multiple content elements', () => {
      const input = 'Pp [Bt "Menu", Tx "Item 1", Tx "Item 2", Tx "Item 3"]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      // First child is trigger, rest are content
      expect(block.children!.length).toBeGreaterThan(1);
    });

    it('should parse popover with icon trigger', () => {
      const input = 'Pp [Ic "info-circle", Tx "Info content"]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.type).toBe('popover');
      expect(block.children![0].type).toBe('icon');
      expect(block.children![0].label).toBe('info-circle');
    });

    it('should parse popover with complex content', () => {
      const input = 'Pp [Bt "Actions", Ct row [Bt "Edit", Bt "Delete"]]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.type).toBe('popover');
      expect(block.children).toHaveLength(2);
      expect(block.children![1].type).toBe('ct');
    });
  });

  describe('Popover Roundtrip', () => {
    it('should roundtrip basic popover', () => {
      const input = 'Pp [Bt "Info", Tx "Details"]';
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });

    it('should roundtrip popover with icon trigger', () => {
      const input = 'Pp [Ic "help", Tx "Help text"]';
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });

    it('should roundtrip popover with multiple content items', () => {
      const input = 'Pp [Bt "Menu", Tx "Item 1", Tx "Item 2"]';
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });
  });

  describe('Popover Edge Cases', () => {
    it('should handle popover with only trigger', () => {
      const input = 'Pp [Bt "Empty"]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.type).toBe('popover');
      expect(block.children).toHaveLength(1);
    });

    it('should parse nested popovers', () => {
      const input = 'Pp [Bt "Outer", Pp [Bt "Inner", Tx "Nested content"]]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.type).toBe('popover');
      expect(block.children![1].type).toBe('popover');
    });

    it('should handle popover with text trigger', () => {
      const input = 'Pp [Tx "Click me", Tx "Popup content"]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.type).toBe('popover');
      expect(block.children![0].type).toBe('text');
    });
  });
});
