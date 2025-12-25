// Tag Component Tests
import { describe, it, expect } from 'vitest';
import { parseUI, compileUI } from '../src/compiler/compiler';

describe('Tag Component', () => {
  describe('Basic Tag Parsing', () => {
    it('should parse simple tag with text', () => {
      const input = 'Tg "Active"';
      const schema = parseUI(input);
      const root = schema.layers[0].root;

      expect(root.type).toBe('tag');
      expect(root.label).toBe('Active');
    });

    it('should parse tag with binding', () => {
      const input = 'Tg :status';
      const schema = parseUI(input);
      const root = schema.layers[0].root;

      expect(root.type).toBe('tag');
      expect(root.binding?.value).toBe('status');
    });

    it('should parse tag with color modifier', () => {
      const input = 'Tg "Success" #green';
      const schema = parseUI(input);
      const root = schema.layers[0].root;

      expect(root.type).toBe('tag');
      expect(root.label).toBe('Success');
      expect(root.style?.color).toBe('green');
    });

    it('should parse tag with binding and color', () => {
      const input = 'Tg :status #yellow';
      const schema = parseUI(input);
      const root = schema.layers[0].root;

      expect(root.type).toBe('tag');
      expect(root.binding?.value).toBe('status');
      expect(root.style?.color).toBe('yellow');
    });
  });

  describe('Tag Colors', () => {
    it('should parse green/success tag', () => {
      const input = 'Tg "Approved" #green';
      const schema = parseUI(input);
      expect(schema.layers[0].root.style?.color).toBe('green');
    });

    it('should parse yellow/warning tag', () => {
      const input = 'Tg "Pending" #yellow';
      const schema = parseUI(input);
      expect(schema.layers[0].root.style?.color).toBe('yellow');
    });

    it('should parse red/danger tag', () => {
      const input = 'Tg "Failed" #red';
      const schema = parseUI(input);
      expect(schema.layers[0].root.style?.color).toBe('red');
    });

    it('should parse blue/primary tag', () => {
      const input = 'Tg "Info" #blue';
      const schema = parseUI(input);
      expect(schema.layers[0].root.style?.color).toBe('blue');
    });
  });

  describe('Tag Roundtrip', () => {
    it('should roundtrip simple tag', () => {
      const input = 'Tg "Active"';
      const schema = parseUI(input);
      const dsl = compileUI(schema);
      expect(dsl.trim()).toBe(input.trim());
    });

    it('should roundtrip tag with binding', () => {
      const input = 'Tg :status';
      const schema = parseUI(input);
      const dsl = compileUI(schema);
      expect(dsl.trim()).toBe(input.trim());
    });

    it('should roundtrip tag with color', () => {
      const input = 'Tg "Success" #green';
      const schema = parseUI(input);
      const dsl = compileUI(schema);
      expect(dsl.trim()).toBe(input.trim());
    });

    it('should roundtrip tag with binding and color', () => {
      const input = 'Tg :status #yellow';
      const schema = parseUI(input);
      const dsl = compileUI(schema);
      expect(dsl.trim()).toBe(input.trim());
    });
  });

  describe('Complex Tag Scenarios', () => {
    it('should parse multiple tags in a container', () => {
      const input = 'Cn { Tg "Active" #green Tg "Premium" #blue }';
      const schema = parseUI(input);
      const root = schema.layers[0].root;

      expect(root.type).toBe('container');
      expect(root.children).toBeDefined();

      // Filter out any non-tag elements
      const tagChildren = root.children?.filter((c: any) => c.type === 'tag');
      expect(tagChildren).toHaveLength(2);
    });

    it('should parse tags with various semantic colors', () => {
      const inputs = [
        ['Tg "Success" #success', 'success'],
        ['Tg "Warning" #warning', 'warning'],
        ['Tg "Error" #error', 'error'],
        ['Tg "Info" #info', 'info'],
      ];

      inputs.forEach(([input, expectedColor]) => {
        const schema = parseUI(input);
        expect(schema.layers[0].root.type).toBe('tag');
        expect(schema.layers[0].root.style?.color).toBe(expectedColor);
      });
    });

    it('should roundtrip tags in container', () => {
      const input = 'Cn { Tg "Active" #green Tg "Premium" #blue }';
      const schema = parseUI(input);
      const dsl = compileUI(schema);

      // Should parse back correctly
      const schema2 = parseUI(dsl);
      expect(schema2.layers[0].root.type).toBe('container');

      // Filter out any non-tag elements
      const tagChildren = schema2.layers[0].root.children?.filter((c: any) => c.type === 'tag');
      expect(tagChildren).toHaveLength(2);
    });
  });
});
