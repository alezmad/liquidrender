import { describe, it, expect } from 'vitest';
import { parseUI, compileUI } from '../src/compiler/compiler';

describe('BarChart Component', () => {
  describe('Basic BarChart Syntax', () => {
    it('should parse simple bar chart', () => {
      const input = 'Br :data';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.type).toBe('bar');
      expect(chart.binding?.value).toBe('data');
    });

    it('should parse bar chart with title', () => {
      const input = 'Br :regionData "Sales by Region"';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.type).toBe('bar');
      expect(chart.label).toBe('Sales by Region');
      expect(chart.binding?.value).toBe('regionData');
    });
  });

  describe('BarChart Sizes', () => {
    it('should parse small chart', () => {
      const input = 'Br :data %sm';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.style?.size).toBe('sm');
    });

    it('should parse large chart', () => {
      const input = 'Br :data %lg';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.style?.size).toBe('lg');
    });
  });

  describe('BarChart Colors', () => {
    it('should parse chart with color', () => {
      const input = 'Br :data #green';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.style?.color).toBe('green');
    });

    it('should parse chart with primary color', () => {
      const input = 'Br :data #primary';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.style?.color).toBe('primary');
    });
  });

  describe('Real-World Examples', () => {
    it('should parse category comparison chart', () => {
      const input = 'Br :categoryData "Products by Category" #blue %lg';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.type).toBe('bar');
      expect(chart.label).toBe('Products by Category');
      expect(chart.style?.color).toBe('blue');
    });

    it('should parse ranking chart', () => {
      const input = 'Br :performers "Top Performers" #green';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.type).toBe('bar');
      expect(chart.style?.color).toBe('green');
    });

    it('should parse revenue breakdown', () => {
      const input = 'Br :revenueBreakdown "Revenue Breakdown"';
      const schema = parseUI(input);
      const chart = schema.layers[0].root;

      expect(chart.type).toBe('bar');
    });
  });

  describe('Roundtrip', () => {
    it('should roundtrip simple bar chart', () => {
      const original = 'Br :data';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      expect(reparsed.layers[0].root.type).toBe('bar');
      expect(reparsed.layers[0].root.binding?.value).toBe('data');
    });

    it('should roundtrip bar chart with title', () => {
      const original = 'Br :data "Sales"';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      expect(reparsed.layers[0].root.label).toBe('Sales');
    });

    it('should roundtrip bar chart with styles', () => {
      const original = 'Br :data #green %lg';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      const chart = reparsed.layers[0].root;
      expect(chart.style?.color).toBe('green');
      expect(chart.style?.size).toBe('lg');
    });
  });
});
