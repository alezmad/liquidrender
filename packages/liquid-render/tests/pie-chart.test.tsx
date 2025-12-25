import { describe, it, expect } from 'vitest';
import { parseUI, compileUI } from '../src/compiler/compiler';

describe('PieChart Component', () => {
  describe('Basic PieChart Syntax', () => {
    it('should parse simple pie chart', () => {
      const input = 'Pi :data';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.type).toBe('pie');
      expect(chart.binding?.value).toBe('data');
    });

    it('should parse pie chart with title', () => {
      const input = 'Pi :marketData "Market Share"';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.type).toBe('pie');
      expect(chart.label).toBe('Market Share');
      expect(chart.binding?.value).toBe('marketData');
    });
  });

  describe('PieChart Sizes', () => {
    it('should parse small chart', () => {
      const input = 'Pi :data %sm';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.style?.size).toBe('sm');
    });

    it('should parse large chart', () => {
      const input = 'Pi :data %lg';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.style?.size).toBe('lg');
    });
  });

  describe('Real-World Examples', () => {
    it('should parse budget distribution chart', () => {
      const input = 'Pi :budgetData "Budget Allocation" %lg';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.type).toBe('pie');
      expect(chart.label).toBe('Budget Allocation');
      expect(chart.style?.size).toBe('lg');
    });

    it('should parse survey results chart', () => {
      const input = 'Pi :surveyResults "Response Distribution"';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.label).toBe('Response Distribution');
    });

    it('should parse small inline progress', () => {
      const input = 'Pi :progress %sm';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.style?.size).toBe('sm');
    });
  });

  describe('Roundtrip', () => {
    it('should roundtrip simple pie chart', () => {
      const original = 'Pi :data';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      expect(reparsed.layers[0].root.type).toBe('pie');
      expect(reparsed.layers[0].root.binding?.value).toBe('data');
    });

    it('should roundtrip pie chart with title', () => {
      const original = 'Pi :data "Distribution"';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      expect(reparsed.layers[0].root.label).toBe('Distribution');
    });

    it('should roundtrip pie chart with size', () => {
      const original = 'Pi :data %lg';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      const chart = reparsed.layers[0].root;
      expect(chart.style?.size).toBe('lg');
    });
  });

  describe('Edge Cases', () => {
    it('should handle pie chart without binding', () => {
      const input = 'Pi "Static" %sm';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.type).toBe('pie');
      expect(chart.label).toBe('Static');
    });
  });
});
