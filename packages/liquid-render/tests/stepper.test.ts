import { describe, it, expect } from 'vitest';
import { parseUI, roundtripUI } from '../src/compiler/compiler';

describe('Stepper Component', () => {
  describe('Basic Stepper Parsing', () => {
    it('should parse stepper with steps', () => {
      const input = 'St :checkout.step [step "Cart", step "Shipping", step "Payment"]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.type).toBe('stepper');
      expect(block.binding?.value).toBe('checkout.step');
      expect(block.children).toHaveLength(3);
    });

    it('should parse step labels correctly', () => {
      const input = 'St :step [step "Step One", step "Step Two"]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.children![0].type).toBe('step');
      expect(block.children![0].label).toBe('Step One');
      expect(block.children![1].label).toBe('Step Two');
    });

    it('should parse stepper with many steps', () => {
      const input = 'St :wizard [step "Welcome", step "Config", step "Install", step "Finish"]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.children).toHaveLength(4);
    });
  });

  describe('Stepper with Nested Binding', () => {
    it('should parse stepper with deep binding', () => {
      const input = 'St :flow.current.step [step "A", step "B"]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.binding?.value).toBe('flow.current.step');
    });
  });

  describe('Stepper Roundtrip', () => {
    it('should roundtrip stepper with steps', () => {
      const input = 'St :step [step "One", step "Two", step "Three"]';
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });

    it('should roundtrip checkout stepper', () => {
      const input = 'St :checkout [step "Cart", step "Ship", step "Pay", step "Done"]';
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });
  });

  describe('Multiple Steppers', () => {
    it('should parse steppers in container', () => {
      const input = `{
  St :wizard1 [step "A", step "B"]
  St :wizard2 [step "X", step "Y", step "Z"]
}`;
      const schema = parseUI(input);

      const container = schema.layers[0]?.root;
      expect(container.children).toHaveLength(2);
      expect(container.children![0].type).toBe('stepper');
      expect(container.children![1].type).toBe('stepper');
    });
  });
});
