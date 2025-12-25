import { describe, it, expect } from 'vitest';
import { parseUI, compileUI } from '../src/compiler/compiler';

describe('Nav Component - Final', () => {
  describe('Basic Parsing', () => {
    it('should parse nav with label', () => {
      const dsl = 'Nv "Dashboard"';
      const result = parseUI(dsl);

      expect(result.layers[0].root.type).toBe('nav');
      expect(result.layers[0].root.label).toBe('Dashboard');
    });

    it('should parse nav with children', () => {
      const dsl = `Nv "Reports" [
        Nv "Monthly",
        Nv "Annual"
      ]`;
      const result = parseUI(dsl);

      expect(result.layers[0].root.type).toBe('nav');
      expect(result.layers[0].root.children).toHaveLength(2);
      expect(result.layers[0].root.children?.[0].label).toBe('Monthly');
    });

    it('should parse nested nav structure', () => {
      const dsl = `Nv "Admin" [
        Nv "Users",
        Nv "Settings" [
          Nv "General",
          Nv "Security"
        ]
      ]`;
      const result = parseUI(dsl);

      const root = result.layers[0].root;
      expect(root.type).toBe('nav');
      expect(root.children).toHaveLength(2);
      expect(root.children?.[1].children).toHaveLength(2);
    });
  });

  describe('Modifiers', () => {
    it('should parse nav with color', () => {
      const dsl = 'Nv "Active" #blue';
      const result = parseUI(dsl);

      expect(result.layers[0].root.style?.color).toBe('blue');
    });

    it('should parse nav with size', () => {
      const dsl = 'Nv "Large" %lg';
      const result = parseUI(dsl);

      expect(result.layers[0].root.style?.size).toBe('lg');
    });
  });

  describe('Signal Handling', () => {
    it('should parse nav with emit signal', () => {
      const dsl = '@view\nNv "Home" >view=home';
      const result = parseUI(dsl);

      expect(result.signals.map(s => s.name)).toContain('view');
      expect(result.layers[0].root.signals?.emit?.name).toBe('view');
      expect(result.layers[0].root.signals?.emit?.value).toBe('home');
    });
  });

  describe('Roundtrip', () => {
    it('should roundtrip basic nav', () => {
      const original = 'Nv "Dashboard"';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      expect(reparsed.layers[0].root.type).toBe('nav');
      expect(reparsed.layers[0].root.label).toBe('Dashboard');
    });

    it('should roundtrip nav with children', () => {
      const original = `Nv "Reports" [
        Nv "Monthly",
        Nv "Annual"
      ]`;
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      expect(reparsed.layers[0].root.children).toHaveLength(2);
    });
  });

  describe('Compiler Output', () => {
    it('should compile nav to DSL', () => {
      const schema = parseUI('Nv "Dashboard"');
      const compiled = compileUI(schema);

      expect(compiled).toContain('nav');
      expect(compiled).toContain('Dashboard');
    });
  });
});
