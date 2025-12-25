/**
 * Custom Component Integration Tests
 *
 * Tests the custom component system including:
 * - Parser handling of Custom blocks
 * - Emitter roundtrip for Custom blocks
 * - componentId extraction
 * - Props handling
 */

import { describe, it, expect } from 'vitest';
import { parseUI, roundtripUI, compileUI } from '../src/compiler/compiler';
import type { LiquidSchema } from '../src/compiler/ui-emitter';
import { liquidSchemaToAST, UIEmitter } from '../src/compiler/ui-emitter';

describe('Custom Component System', () => {
  describe('Parser', () => {
    it('should parse Custom block with componentId', () => {
      const dsl = 'Custom "sparkline" :metrics.trend';
      const schema = parseUI(dsl);

      expect(schema.layers).toHaveLength(1);
      const block = schema.layers[0].root;

      expect(block.type).toBe('custom');
      expect(block.componentId).toBe('sparkline');
      expect(block.binding).toBeDefined();
      expect(block.binding?.value).toBe('metrics.trend');
    });

    it('should parse Custom block with color modifier', () => {
      const dsl = 'Custom "sparkline" :data #green';
      const schema = parseUI(dsl);

      const block = schema.layers[0].root;
      expect(block.type).toBe('custom');
      expect(block.componentId).toBe('sparkline');
      expect(block.style?.color).toBe('green');
    });

    it('should parse Custom block with label', () => {
      const dsl = 'Custom "map-view" "Location Map" :locations';
      const schema = parseUI(dsl);

      const block = schema.layers[0].root;
      expect(block.type).toBe('custom');
      expect(block.componentId).toBe('map-view');
      expect(block.label).toBe('Location Map');
    });

    it('should parse nested Custom blocks', () => {
      const dsl = `Cn [
        Custom "sparkline" :trend1
        Custom "sparkline" :trend2
      ]`;
      const schema = parseUI(dsl);

      const container = schema.layers[0].root;
      expect(container.type).toBe('container');
      expect(container.children).toHaveLength(2);

      expect(container.children![0].type).toBe('custom');
      expect(container.children![0].componentId).toBe('sparkline');
      expect(container.children![1].type).toBe('custom');
      expect(container.children![1].componentId).toBe('sparkline');
    });
  });

  describe('Emitter Roundtrip', () => {
    it('should roundtrip Custom block', () => {
      const dsl = 'Custom "sparkline" :metrics.trend';
      const schema = parseUI(dsl);
      const { reconstructed, isEquivalent } = roundtripUI(schema);

      expect(reconstructed.layers[0].root.type).toBe('custom');
      expect(reconstructed.layers[0].root.componentId).toBe('sparkline');
      expect(isEquivalent).toBe(true);
    });

    it('should roundtrip Custom block with modifiers', () => {
      const dsl = 'Custom "chart-widget" :data #blue !p';
      const schema = parseUI(dsl);
      const { reconstructed, isEquivalent } = roundtripUI(schema);

      const block = reconstructed.layers[0].root;
      expect(block.type).toBe('custom');
      expect(block.componentId).toBe('chart-widget');
      expect(block.style?.color).toBe('blue');
      expect(block.layout?.priority).toBe(75); // !p = primary = 75
      expect(isEquivalent).toBe(true);
    });

    it('should emit componentId in DSL output', () => {
      const dsl = 'Custom "my-widget" :binding';
      const schema = parseUI(dsl);
      const { dsl: output } = roundtripUI(schema);

      expect(output).toContain('Custom');
      expect(output).toContain('"my-widget"');
    });
  });

  describe('Edge Cases', () => {
    it('should handle Custom without binding', () => {
      const dsl = 'Custom "static-widget"';
      const schema = parseUI(dsl);

      const block = schema.layers[0].root;
      expect(block.type).toBe('custom');
      expect(block.componentId).toBe('static-widget');
      expect(block.binding).toBeUndefined();
    });

    it('should handle componentId with hyphens', () => {
      const dsl = 'Custom "my-complex-widget-v2" :data';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.componentId).toBe('my-complex-widget-v2');
    });

    it('should handle componentId with underscores', () => {
      const dsl = 'Custom "data_visualization_panel" :metrics';
      const schema = parseUI(dsl);

      expect(schema.layers[0].root.componentId).toBe('data_visualization_panel');
    });

    it('should handle Custom in conditional blocks', () => {
      const dsl = '?@tab=1 [Custom "chart" :data]';
      const schema = parseUI(dsl);

      // Conditional is applied directly to Custom block
      const block = schema.layers[0].root;
      expect(block.type).toBe('custom');
      expect(block.componentId).toBe('chart');
      expect(block.condition?.signal).toBe('tab');
      expect(block.condition?.signalValue).toBe('1');
    });
  });

  describe('Props Roundtrip', () => {
    it('should preserve props in schema to AST to schema roundtrip', () => {
      // Create a schema with custom component that has props
      const schema: LiquidSchema = {
        version: '1.0',
        signals: [],
        layers: [{
          id: 1,
          visible: true,
          root: {
            uid: 'c1',
            type: 'custom',
            componentId: 'my-chart',
            binding: { kind: 'field', value: 'chartData' },
            props: { theme: 'dark', animate: true }
          }
        }]
      };

      // Convert schema to AST using liquidSchemaToAST
      const ast = liquidSchemaToAST(schema);

      // The AST should preserve the props
      const astBlock = ast.layers[0]?.root;
      expect(astBlock).toBeDefined();
      expect((astBlock as any).props).toEqual({ theme: 'dark', animate: true });

      // Emit back to schema
      const emitter = new UIEmitter({ format: 'liquidschema' });
      const reconstructed = emitter.emit(ast) as LiquidSchema;

      // Verify props are preserved
      const block = reconstructed.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block?.type).toBe('custom');
      expect(block?.componentId).toBe('my-chart');
      expect(block?.props).toEqual({ theme: 'dark', animate: true });
    });

    it('should preserve nested custom component props', () => {
      const schema: LiquidSchema = {
        version: '1.0',
        signals: [],
        layers: [{
          id: 1,
          visible: true,
          root: {
            uid: 'container1',
            type: 'container',
            children: [
              {
                uid: 'c1',
                type: 'custom',
                componentId: 'sparkline',
                binding: { kind: 'field', value: 'data1' },
                props: { color: 'blue', showGrid: false }
              },
              {
                uid: 'c2',
                type: 'custom',
                componentId: 'gauge',
                binding: { kind: 'field', value: 'data2' },
                props: { min: 0, max: 100, segments: 5 }
              }
            ]
          }
        }]
      };

      // Convert schema to AST
      const ast = liquidSchemaToAST(schema);

      // Emit back to schema
      const emitter = new UIEmitter({ format: 'liquidschema' });
      const reconstructed = emitter.emit(ast) as LiquidSchema;

      // Verify children props are preserved
      const children = reconstructed.layers[0]?.root?.children;
      expect(children).toHaveLength(2);
      expect(children?.[0]?.props).toEqual({ color: 'blue', showGrid: false });
      expect(children?.[1]?.props).toEqual({ min: 0, max: 100, segments: 5 });
    });

    it('should preserve props with complex values', () => {
      const schema: LiquidSchema = {
        version: '1.0',
        signals: [],
        layers: [{
          id: 1,
          visible: true,
          root: {
            uid: 'c1',
            type: 'custom',
            componentId: 'data-viz',
            binding: { kind: 'field', value: 'metrics' },
            props: {
              config: { nested: { deep: 'value' } },
              items: [1, 2, 3],
              nullValue: null,
              enabled: true
            }
          }
        }]
      };

      // Convert schema to AST and back
      const ast = liquidSchemaToAST(schema);
      const emitter = new UIEmitter({ format: 'liquidschema' });
      const reconstructed = emitter.emit(ast) as LiquidSchema;

      // Verify complex props are preserved
      const block = reconstructed.layers[0]?.root;
      expect(block?.props).toEqual({
        config: { nested: { deep: 'value' } },
        items: [1, 2, 3],
        nullValue: null,
        enabled: true
      });
    });
  });
});
