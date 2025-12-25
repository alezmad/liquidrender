import { describe, it, expect } from 'vitest';
import { parseUI, compileUI } from '../src/compiler/compiler';

describe('Button Component', () => {
  describe('Basic Button Syntax', () => {
    it('should parse simple button', () => {
      const input = 'Bt "Click me"';
      const schema = parseUI(input);
      const button = schema.layers[0].root;

      expect(button.type).toBe('button');
      expect(button.label).toBe('Click me');
    });

    it('should parse button with signal emit', () => {
      const input = 'Bt "Submit" >submit';
      const schema = parseUI(input);
      const button = schema.layers[0].root;

      expect(button.type).toBe('button');
      expect(button.label).toBe('Submit');
      expect(button.signals?.emit?.name).toBe('submit');
    });

    it('should parse button with action modifier', () => {
      const input = 'Bt "Save" !submit';
      const schema = parseUI(input);
      const button = schema.layers[0].root;

      expect(button.type).toBe('button');
      expect(button.action).toBe('submit');
    });

    it('should parse button with binding', () => {
      const input = 'Bt :buttonLabel';
      const schema = parseUI(input);
      const button = schema.layers[0].root;

      expect(button.type).toBe('button');
      expect(button.binding?.value).toBe('buttonLabel');
    });
  });

  describe('Button Colors', () => {
    it('should parse primary button', () => {
      const input = 'Bt "Primary" #primary';
      const schema = parseUI(input);
      const button = schema.layers[0].root;

      expect(button.type).toBe('button');
      expect(button.style?.color).toBe('primary');
    });

    it('should parse destructive button', () => {
      const input = 'Bt "Delete" #red';
      const schema = parseUI(input);
      const button = schema.layers[0].root;

      expect(button.style?.color).toBe('red');
    });

    it('should parse blue button', () => {
      const input = 'Bt "Info" #blue';
      const schema = parseUI(input);
      const button = schema.layers[0].root;

      expect(button.style?.color).toBe('blue');
    });
  });

  describe('Button with Children', () => {
    it('should parse button with icon', () => {
      const input = 'Bt "Save" [Ic "save"]';
      const schema = parseUI(input);
      const button = schema.layers[0].root;

      expect(button.type).toBe('button');
      expect(button.children).toHaveLength(1);
      expect(button.children![0].type).toBe('icon');
    });

    it('should parse button with badge', () => {
      const input = 'Bt "Cart" [Bg :count]';
      const schema = parseUI(input);
      const button = schema.layers[0].root;

      expect(button.children).toHaveLength(1);
      expect(button.children![0].type).toBe('badge');
    });
  });

  describe('Button Sizes', () => {
    it('should parse small button', () => {
      const input = 'Bt "Small" %sm';
      const schema = parseUI(input);
      const button = schema.layers[0].root;

      expect(button.style?.size).toBe('sm');
    });

    it('should parse large button', () => {
      const input = 'Bt "Large" %lg';
      const schema = parseUI(input);
      const button = schema.layers[0].root;

      expect(button.style?.size).toBe('lg');
    });
  });

  describe('Button with Signal Value', () => {
    it('should parse button emitting signal with value', () => {
      const input = 'Bt "Tab 1" >tab=1';
      const schema = parseUI(input);
      const button = schema.layers[0].root;

      expect(button.signals?.emit?.name).toBe('tab');
      expect(button.signals?.emit?.value).toBe('1');
    });

    it('should parse tab buttons', () => {
      const input = '@tab Cn [Bt "Overview" >tab=1, Bt "Details" >tab=2]';
      const schema = parseUI(input);

      expect(schema.signals).toContainEqual({ name: 'tab' });
      const container = schema.layers[0].root;
      expect(container.children).toHaveLength(2);
      expect(container.children![0].signals?.emit?.value).toBe('1');
      expect(container.children![1].signals?.emit?.value).toBe('2');
    });
  });

  describe('Roundtrip', () => {
    it('should roundtrip button with action', () => {
      const original = 'Bt "Submit" !submit';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      expect(reparsed.layers[0].root.type).toBe('button');
      expect(reparsed.layers[0].root.action).toBe('submit');
    });

    it('should roundtrip button with style', () => {
      const original = 'Bt "Delete" #red';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      expect(reparsed.layers[0].root.style?.color).toBe('red');
    });

    it('should roundtrip button with signal', () => {
      const original = 'Bt "Click" >action';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      expect(reparsed.layers[0].root.signals?.emit?.name).toBe('action');
    });
  });
});
