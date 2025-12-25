import { describe, it, expect } from 'vitest';
import { parseUI, roundtripUI } from '../src/compiler/compiler';

describe('Drawer Component', () => {
  describe('Basic Drawer Parsing', () => {
    it('should parse drawer with title and content', () => {
      const input = 'Dw "Menu" [Tx "Menu content"]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.type).toBe('drawer');
      expect(block.label).toBe('Menu');
    });

    it('should parse drawer with signal receive', () => {
      const input = `sig menuOpen
Dw "Menu" <menuOpen [Tx "Content"]`;
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.type).toBe('drawer');
      expect(block.signals?.receive).toBe('menuOpen');
    });

    it('should parse drawer with multiple children', () => {
      const input = 'Dw "Settings" [Tx "Line 1", Tx "Line 2", Bt "Save"]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.children!.length).toBeGreaterThanOrEqual(3);
    });

    it('should parse drawer without children', () => {
      const input = 'Dw "Menu"';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.type).toBe('drawer');
      expect(block.label).toBe('Menu');
    });
  });

  describe('Drawer with Button Trigger', () => {
    it('should parse drawer with button emit', () => {
      const input = `Bt "Open" >menu
Dw "Menu" <menu [Tx "Content"]`;
      const schema = parseUI(input);

      // Multiple top-level blocks are wrapped in a container
      const container = schema.layers[0]?.root;
      expect(container.type).toBe('container');
      expect(container.children).toBeDefined();
      expect(container.children!.length).toBe(2);

      // Find button with signal emit
      const button = container.children![0];
      expect(button.type).toBe('button');
      expect(button.signals?.emit?.name).toBe('menu');

      // Find drawer with signal receive
      const drawer = container.children![1];
      expect(drawer.type).toBe('drawer');
      expect(drawer.signals?.receive).toBe('menu');
    });

    it('should parse complete drawer flow', () => {
      const input = `Bt "Open Drawer" >drawer
Dw "Side Panel" <drawer [
  Tx "Panel content",
  Bt "Action"
]`;
      const schema = parseUI(input);

      // Multiple top-level blocks are wrapped in a container
      const container = schema.layers[0]?.root;
      expect(container.type).toBe('container');

      // Check button and drawer exist in children
      const button = container.children?.find(c => c.type === 'button');
      const drawer = container.children?.find(c => c.type === 'drawer');

      expect(button).toBeDefined();
      expect(button?.signals?.emit?.name).toBe('drawer');

      expect(drawer).toBeDefined();
      expect(drawer?.signals?.receive).toBe('drawer');
      expect(drawer?.children).toBeDefined();
    });
  });

  describe('Drawer Roundtrip', () => {
    it('should roundtrip drawer with title', () => {
      const input = 'Dw "Settings" [Tx "Content"]';
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });

    it('should roundtrip drawer with signal', () => {
      const input = `Dw "Panel" <drawer [Tx "Content"]`;
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });

    it('should roundtrip complex drawer with navigation', () => {
      const input = `Dw "Navigation" <nav [
  Tx "Menu Item 1",
  Tx "Menu Item 2",
  Tx "Menu Item 3"
]`;
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle drawer with nested containers', () => {
      const input = `Dw "Complex" [
  Cn [
    Tx "Section 1",
    Bt "Action"
  ],
  Cn [
    Tx "Section 2"
  ]
]`;
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.type).toBe('drawer');
      expect(block.children).toBeDefined();
      expect(block.children!.length).toBeGreaterThanOrEqual(2);
    });
  });
});
