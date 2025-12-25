// Progress Component Tests
import { describe, it, expect } from 'vitest';
import { parseUI, roundtripUI } from '../src/compiler/compiler';

describe('Progress Component', () => {
  describe('Basic Parsing', () => {
    it('should parse simple progress with label', () => {
      const input = `Pg :upload.progress "Uploading"`;
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.type).toBe('progress');
      expect(block.label).toBe('Uploading');
      expect(block.binding?.kind).toBe('field');
      expect(block.binding?.value).toBe('upload.progress');
    });

    it('should parse progress with explicit value', () => {
      const input = `Pg :task "Progress" 75`;
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.type).toBe('progress');
      expect(block.label).toBe('Progress');
      expect(block.binding?.kind).toBe('field');
      expect(block.binding?.value).toBe('task');
    });

    it('should parse progress without label', () => {
      const input = `Pg :completion`;
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.type).toBe('progress');
      expect(block.binding?.kind).toBe('field');
      expect(block.binding?.value).toBe('completion');
    });
  });

  describe('Roundtrip Tests', () => {
    it('should roundtrip simple progress', () => {
      const input = `Pg :upload.progress "Uploading"`;
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });

    it('should roundtrip progress with value', () => {
      const input = `Pg :task "Progress" 75`;
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });

    it('should roundtrip progress without label', () => {
      const input = `Pg :completion`;
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });
  });

  describe('Color Modifiers', () => {
    it('should parse progress with color modifier', () => {
      const input = `Pg :upload "Upload" #blue`;
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.type).toBe('progress');
      expect(block.style?.color).toBe('blue');
    });

    it('should roundtrip progress with color modifier', () => {
      const input = `Pg :upload "Upload" #blue`;
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });
  });

  describe('Multiple Progress Bars', () => {
    it('should parse multiple progress bars', () => {
      const input = `{
  Pg :upload "Upload" #blue
  Pg :download "Download" #green
  Pg :processing "Processing"
}`;
      const schema = parseUI(input);

      const container = schema.layers[0]?.root;
      expect(container).toBeDefined();
      expect(container.type).toBe('container');
      expect(container.children).toHaveLength(3);
      expect(container.children![0].type).toBe('progress');
      expect(container.children![1].type).toBe('progress');
      expect(container.children![2].type).toBe('progress');
    });

    it('should roundtrip multiple progress bars', () => {
      const input = `{
  Pg :upload "Upload" #blue
  Pg :download "Download" #green
  Pg :processing "Processing"
}`;
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });
  });
});
