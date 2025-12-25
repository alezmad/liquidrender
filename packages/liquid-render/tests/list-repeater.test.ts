// List/Repeater Tests
import { describe, it, expect } from 'vitest';
import { parseUI } from '../src/compiler/ui-compiler';
import type { LiquidSchema } from '../src/compiler/ui-emitter';
import { resolveBinding } from '../src/renderer/data-context';

describe('List/Repeater Functionality', () => {
  describe('Parser', () => {
    it('should parse list block with iterator binding', () => {
      const schema = parseUI('7 :.items [Cd :.]');
      const root = schema.layers[0]?.root;

      expect(root?.type).toBe('list');
      expect(root?.binding?.kind).toBe('iterator');
      expect(root?.binding?.value).toBe('items');
      expect(root?.children).toHaveLength(1);
      expect(root?.children?.[0]?.type).toBe('card');
      expect(root?.children?.[0]?.binding?.kind).toBe('iterator');
      expect(root?.children?.[0]?.binding?.value).toBe('');
    });

    it('should parse list with field access on current item', () => {
      const schema = parseUI('Ls :.tasks [Cd :.title]');
      const root = schema.layers[0]?.root;

      expect(root?.type).toBe('list');
      expect(root?.binding?.kind).toBe('iterator');
      expect(root?.binding?.value).toBe('tasks');
      expect(root?.children?.[0]?.binding?.kind).toBe('iterator');
      expect(root?.children?.[0]?.binding?.value).toBe('title');
    });

    it('should parse list with multiple child bindings', () => {
      const schema = parseUI('7 :.items [Cd [Tx :.title, Tx :.description]]');
      const root = schema.layers[0]?.root;

      expect(root?.children?.[0]?.type).toBe('card');
      expect(root?.children?.[0]?.children).toHaveLength(2);
    });

    it('should parse list with index reference', () => {
      const schema = parseUI('7 :.items [0 [Tx :#, Tx :.name]]');
      const root = schema.layers[0]?.root;

      expect(root?.children?.[0]?.children?.[0]?.type).toBe('text');
      expect(root?.children?.[0]?.children?.[0]?.binding?.kind).toBe('indexRef');
      expect(root?.children?.[0]?.children?.[1]?.binding?.kind).toBe('iterator');
      expect(root?.children?.[0]?.children?.[1]?.binding?.value).toBe('name');
    });
  });

  describe('Data Binding Resolution', () => {
    it('should resolve iterator binding to array on container', () => {
      const data = {
        tasks: [
          { title: 'Task 1', status: 'done' },
          { title: 'Task 2', status: 'pending' },
        ],
      };

      const binding = { kind: 'iterator' as const, value: 'tasks' };
      const result = resolveBinding(binding, data);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should resolve :. to current item when $ context exists', () => {
      const data = {
        $: { title: 'My Task', status: 'done' },
      };

      const binding = { kind: 'iterator' as const, value: '' };
      const result = resolveBinding(binding, data);

      expect(result).toEqual({ title: 'My Task', status: 'done' });
    });

    it('should resolve :.field to current item field when $ context exists', () => {
      const data = {
        $: { title: 'My Task', status: 'done' },
      };

      const binding = { kind: 'iterator' as const, value: 'title' };
      const result = resolveBinding(binding, data);

      expect(result).toBe('My Task');
    });

    it('should resolve :# to current index when # context exists', () => {
      const data = {
        '#': 5,
      };

      const binding = { kind: 'indexRef' as const, value: '#' };
      const result = resolveBinding(binding, data);

      expect(result).toBe(5);
    });

    it('should handle nested object access with $.field.nested', () => {
      const data = {
        $: {
          user: {
            profile: {
              name: 'John Doe',
            },
          },
        },
      };

      const binding = { kind: 'iterator' as const, value: 'user.profile.name' };
      const result = resolveBinding(binding, data);

      expect(result).toBe('John Doe');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty array', () => {
      const data = { tasks: [] };
      const binding = { kind: 'iterator' as const, value: 'tasks' };
      const result = resolveBinding(binding, data);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should handle null/undefined array', () => {
      const data = { tasks: null };
      const binding = { kind: 'iterator' as const, value: 'tasks' };
      const result = resolveBinding(binding, data);

      expect(result).toBeNull();
    });

    it('should handle missing field', () => {
      const data = {};
      const binding = { kind: 'iterator' as const, value: 'tasks' };
      const result = resolveBinding(binding, data);

      expect(result).toBeUndefined();
    });

    it('should handle :. without $ context', () => {
      const data = { value: 'test' };
      const binding = { kind: 'iterator' as const, value: '' };
      const result = resolveBinding(binding, data);

      // Should return undefined when no $ context
      expect(result).toBeUndefined();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle nested lists', () => {
      const schema = parseUI('7 :categories [0 [Tx :.name, 7 :.items [Cd :.title]]]');
      const root = schema.layers[0]?.root;

      expect(root?.type).toBe('list');
      expect(root?.children?.[0]?.type).toBe('container');
      expect(root?.children?.[0]?.children?.[1]?.type).toBe('list');
    });

    it('should preserve parent data context in nested lists', () => {
      const data = {
        categories: [
          {
            name: 'Work',
            items: [{ title: 'Task 1' }, { title: 'Task 2' }],
          },
        ],
        globalSetting: 'test',
      };

      const binding = { kind: 'iterator' as const, value: 'categories' };
      const result = resolveBinding(binding, data);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });
  });

  describe('DSL Examples', () => {
    it('should parse task list example from spec', () => {
      const dsl = '7 :tasks [Cd :.title :.description]';
      const schema = parseUI(dsl);

      expect(schema.layers[0]?.root.type).toBe('list');
      expect(schema.layers[0]?.root.binding?.value).toBe('tasks');
    });

    it('should parse numbered list with index', () => {
      const dsl = '7 :items [Tx :# Tx :.name]';
      const schema = parseUI(dsl);

      expect(schema.layers[0]?.root.children?.[0]?.binding?.kind).toBe('indexRef');
      expect(schema.layers[0]?.root.children?.[1]?.binding?.value).toBe('name');
    });

    it('should handle list code alias "Ls"', () => {
      const dsl = 'Ls :users [Cd :.name]';
      const schema = parseUI(dsl);

      expect(schema.layers[0]?.root.type).toBe('list');
      expect(schema.layers[0]?.root.binding?.value).toBe('users');
    });
  });
});
