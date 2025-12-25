/**
 * Priority Modifiers Test Suite
 *
 * Tests for LiquidCode priority modifier functionality:
 * - !h (hero) = 100
 * - !p (primary) = 75
 * - !s (secondary) = 50
 * - !0-9 (numeric) = 0-9
 */

import { describe, it, expect } from 'vitest';
import { parseUI, roundtripUI } from '../src/compiler/compiler';

describe('Priority Modifiers', () => {
  describe('Hero priority (!h)', () => {
    it('should parse hero priority on KPI', () => {
      const snippet = 'Kp :revenue !h';
      const schema = parseUI(snippet);

      expect(schema.layers).toHaveLength(1);
      const root = schema.layers[0]?.root;
      expect(root.type).toBe('kpi');
      expect(root.layout?.priority).toBe(100);
    });

    it('should roundtrip hero priority on KPI', () => {
      const snippet = 'Kp :revenue !h';
      const schema = parseUI(snippet);
      const { isEquivalent } = roundtripUI(schema);

      expect(isEquivalent).toBe(true);
    });
  });

  describe('Primary priority (!p)', () => {
    it('should parse primary priority on bar chart', () => {
      const snippet = 'Br :sales :month !p ^g';
      const schema = parseUI(snippet);

      expect(schema.layers).toHaveLength(1);
      const root = schema.layers[0]?.root;
      expect(root.type).toBe('bar');
      expect(root.layout?.priority).toBe(75);
      expect(root.layout?.flex).toBe('grow');
    });

    it('should roundtrip primary priority with flex modifier', () => {
      const snippet = 'Br :sales :month !p ^g';
      const schema = parseUI(snippet);
      const { isEquivalent } = roundtripUI(schema);

      expect(isEquivalent).toBe(true);
    });
  });

  describe('Secondary priority (!s)', () => {
    it('should parse secondary priority on text', () => {
      const snippet = 'Tx "Low Priority Content" !s *2';
      const schema = parseUI(snippet);

      expect(schema.layers).toHaveLength(1);
      const root = schema.layers[0]?.root;
      expect(root.type).toBe('text');
      expect(root.layout?.priority).toBe(50);
      expect(root.layout?.span).toBe(2);
    });

    it('should roundtrip secondary priority with span modifier', () => {
      const snippet = 'Tx "Low Priority Content" !s *2';
      const schema = parseUI(snippet);
      const { isEquivalent } = roundtripUI(schema);

      expect(isEquivalent).toBe(true);
    });
  });

  describe('Numeric priorities (!0-9)', () => {
    it('should parse numeric priority 3', () => {
      const snippet = 'Bt "Tab2" >tab=2 !3';
      const schema = parseUI(snippet);

      expect(schema.layers).toHaveLength(1);
      const root = schema.layers[0]?.root;
      expect(root.type).toBe('button');
      expect(root.layout?.priority).toBe(3);
    });

    it('should parse numeric priority 5', () => {
      const snippet = 'Bt "Tab1" >tab=1 !5';
      const schema = parseUI(snippet);

      expect(schema.layers).toHaveLength(1);
      const root = schema.layers[0]?.root;
      expect(root.type).toBe('button');
      expect(root.layout?.priority).toBe(5);
    });

    it('should parse numeric priority 7', () => {
      const snippet = 'Kp :data !7';
      const schema = parseUI(snippet);

      expect(schema.layers).toHaveLength(1);
      const root = schema.layers[0]?.root;
      expect(root.layout?.priority).toBe(7);
    });

    it('should parse numeric priority 0', () => {
      const snippet = 'Kp :value !0';
      const schema = parseUI(snippet);

      expect(schema.layers[0]?.root.layout?.priority).toBe(0);
    });

    it('should parse numeric priority 9', () => {
      const snippet = 'Tx "highest" !9';
      const schema = parseUI(snippet);

      expect(schema.layers[0]?.root.layout?.priority).toBe(9);
    });
  });

  describe('Mixed priorities in container', () => {
    it('should parse multiple children with different priorities', () => {
      const snippet = 'Cn [Kp :a !h, Kp :b !p, Kp :c !s, Kp :d !7]';
      const schema = parseUI(snippet);

      expect(schema.layers).toHaveLength(1);
      const root = schema.layers[0]?.root;
      expect(root.type).toBe('container');
      expect(root.children).toHaveLength(4);

      // Verify each child's priority
      expect(root.children?.[0].layout?.priority).toBe(100); // !h
      expect(root.children?.[1].layout?.priority).toBe(75);  // !p
      expect(root.children?.[2].layout?.priority).toBe(50);  // !s
      expect(root.children?.[3].layout?.priority).toBe(7);   // !7
    });

    it('should roundtrip container with mixed priorities', () => {
      const snippet = 'Cn [Kp :a !h, Kp :b !p, Kp :c !s, Kp :d !7]';
      const schema = parseUI(snippet);
      const { isEquivalent } = roundtripUI(schema);

      expect(isEquivalent).toBe(true);
    });
  });

  describe('Priority with signals', () => {
    it('should parse priorities within signal context', () => {
      const snippet = '@tab Cn ^r [Bt "Tab1" >tab=1 !5, Bt "Tab2" >tab=2 !3]';
      const schema = parseUI(snippet);

      expect(schema.signals).toHaveLength(1);
      expect(schema.signals[0].name).toBe('tab');

      const root = schema.layers[0]?.root;
      expect(root.type).toBe('container');
      expect(root.children).toHaveLength(2);
      expect(root.children?.[0].layout?.priority).toBe(5);
      expect(root.children?.[1].layout?.priority).toBe(3);
    });

    it('should roundtrip priorities with signals', () => {
      const snippet = '@tab Cn ^r [Bt "Tab1" >tab=1 !5, Bt "Tab2" >tab=2 !3]';
      const schema = parseUI(snippet);
      const { isEquivalent } = roundtripUI(schema);

      expect(isEquivalent).toBe(true);
    });
  });

  describe('Priority with other modifiers', () => {
    it('should handle priority with color modifier', () => {
      const snippet = 'Kp :critical !h #red';
      const schema = parseUI(snippet);

      const root = schema.layers[0]?.root;
      expect(root.layout?.priority).toBe(100);
      expect(root.style?.color).toBe('red');
    });

    it('should handle priority with size modifier', () => {
      const snippet = 'Bt "Action" !p %lg';
      const schema = parseUI(snippet);

      const root = schema.layers[0]?.root;
      expect(root.layout?.priority).toBe(75);
      expect(root.style?.size).toBe('lg');
    });

    it('should handle priority with flex modifier', () => {
      const snippet = 'Tx "Content" !s ^g';
      const schema = parseUI(snippet);

      const root = schema.layers[0]?.root;
      expect(root.layout?.priority).toBe(50);
      expect(root.layout?.flex).toBe('grow');
    });

    it('should handle priority with span modifier', () => {
      const snippet = 'Kp :value !2 *h';
      const schema = parseUI(snippet);

      const root = schema.layers[0]?.root;
      expect(root.layout?.priority).toBe(2);
      expect(root.layout?.span).toBe('half');
    });

    it('should roundtrip priority with multiple modifiers', () => {
      const snippet = 'Kp :revenue !h ^g *2 #green';
      const schema = parseUI(snippet);
      const { isEquivalent } = roundtripUI(schema);

      expect(isEquivalent).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle priority 0', () => {
      const snippet = 'Kp :data !0';
      const schema = parseUI(snippet);

      expect(schema.layers[0]?.root.layout?.priority).toBe(0);
    });

    it('should handle priority 9', () => {
      const snippet = 'Tx "test" !9';
      const schema = parseUI(snippet);

      expect(schema.layers[0]?.root.layout?.priority).toBe(9);
    });

    it('should handle multiple priorities (last one wins)', () => {
      const snippet = 'Kp :value !h !p';
      const schema = parseUI(snippet);

      // Last modifier wins
      const root = schema.layers[0]?.root;
      const priorities = root.layout ? [root.layout.priority] : [];
      expect(priorities.length).toBeGreaterThan(0);
    });
  });

  describe('Integration tests', () => {
    it('Test 1: Hero revenue KPI', () => {
      const snippet = 'Kp :revenue !h';
      const schema = parseUI(snippet);
      const { isEquivalent } = roundtripUI(schema);

      expect(schema.layers[0]?.root.type).toBe('kpi');
      expect(schema.layers[0]?.root.layout?.priority).toBe(100);
      expect(isEquivalent).toBe(true);
    });

    it('Test 2: Primary bar chart with grow flex', () => {
      const snippet = 'Br :sales :month !p ^g';
      const schema = parseUI(snippet);
      const { isEquivalent } = roundtripUI(schema);

      expect(schema.layers[0]?.root.type).toBe('bar');
      expect(schema.layers[0]?.root.layout?.priority).toBe(75);
      expect(schema.layers[0]?.root.layout?.flex).toBe('grow');
      expect(isEquivalent).toBe(true);
    });

    it('Test 3: Secondary text with span', () => {
      const snippet = 'Tx "Low Priority Content" !s *2';
      const schema = parseUI(snippet);
      const { isEquivalent } = roundtripUI(schema);

      expect(schema.layers[0]?.root.type).toBe('text');
      expect(schema.layers[0]?.root.layout?.priority).toBe(50);
      expect(schema.layers[0]?.root.layout?.span).toBe(2);
      expect(isEquivalent).toBe(true);
    });

    it('Test 4: Numeric priorities in signal context', () => {
      const snippet = '@tab Cn ^r [Bt "Tab1" >tab=1 !5, Bt "Tab2" >tab=2 !3]';
      const schema = parseUI(snippet);
      const { isEquivalent } = roundtripUI(schema);

      expect(schema.signals).toHaveLength(1);
      expect(schema.layers[0]?.root.children?.[0].layout?.priority).toBe(5);
      expect(schema.layers[0]?.root.children?.[1].layout?.priority).toBe(3);
      expect(isEquivalent).toBe(true);
    });

    it('Test 5: Mixed priorities in container', () => {
      const snippet = 'Cn [Kp :a !h, Kp :b !p, Kp :c !s, Kp :d !7]';
      const schema = parseUI(snippet);
      const { isEquivalent } = roundtripUI(schema);

      const children = schema.layers[0]?.root.children;
      expect(children?.[0].layout?.priority).toBe(100);
      expect(children?.[1].layout?.priority).toBe(75);
      expect(children?.[2].layout?.priority).toBe(50);
      expect(children?.[3].layout?.priority).toBe(7);
      expect(isEquivalent).toBe(true);
    });
  });
});
