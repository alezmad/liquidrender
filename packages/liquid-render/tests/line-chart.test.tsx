import { describe, it, expect } from 'vitest';
import { parseUI, compileUI } from '../src/compiler/compiler';

describe('LineChart Component', () => {
  describe('Basic LineChart Syntax', () => {
    it('should parse simple line chart', () => {
      const input = 'Ln :data';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.type).toBe('line');
      expect(chart.binding?.value).toBe('data');
    });

    it('should parse line chart with title', () => {
      const input = 'Ln :revenueData "Revenue Over Time"';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.type).toBe('line');
      expect(chart.label).toBe('Revenue Over Time');
      expect(chart.binding?.value).toBe('revenueData');
    });
  });

  describe('LineChart Sizes', () => {
    it('should parse small chart', () => {
      const input = 'Ln :data %sm';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.style?.size).toBe('sm');
    });

    it('should parse large chart', () => {
      const input = 'Ln :data %lg';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.style?.size).toBe('lg');
    });
  });

  describe('LineChart Colors', () => {
    it('should parse chart with color', () => {
      const input = 'Ln :data #blue';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.style?.color).toBe('blue');
    });

    it('should parse chart with primary color', () => {
      const input = 'Ln :data #primary';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.style?.color).toBe('primary');
    });
  });

  describe('Real-World Examples', () => {
    it('should parse sales dashboard chart', () => {
      const input = 'Ln :salesData "Monthly Sales" #primary %lg';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.type).toBe('line');
      expect(chart.label).toBe('Monthly Sales');
      expect(chart.style?.color).toBe('primary');
      expect(chart.style?.size).toBe('lg');
    });

    it('should parse analytics chart with color', () => {
      const input = 'Ln :analyticsData "Page Views" #blue';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.type).toBe('line');
      expect(chart.style?.color).toBe('blue');
    });
  });

  describe('Roundtrip', () => {
    it('should roundtrip simple line chart', () => {
      const original = 'Ln :data';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      expect(reparsed.layers[0].root.type).toBe('line');
      expect(reparsed.layers[0].root.binding?.value).toBe('data');
    });

    it('should roundtrip line chart with title', () => {
      const original = 'Ln :data "Revenue"';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      expect(reparsed.layers[0].root.label).toBe('Revenue');
    });

    it('should roundtrip line chart with styles', () => {
      const original = 'Ln :data #blue %lg';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      const chart = reparsed.layers[0].root;
      expect(chart.style?.color).toBe('blue');
      expect(chart.style?.size).toBe('lg');
    });
  });
});
