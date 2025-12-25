// Select Component Tests
import { describe, it, expect } from 'vitest';
import { parseUI, roundtripUI } from '../src/compiler/compiler';

describe('Select Component', () => {
  describe('Basic Select Parsing', () => {
    it('should parse basic select with options', () => {
      const input = `Se :user.role "Role" [opt "user" "User", opt "admin" "Admin"]`;
      const schema = parseUI(input);

      expect(schema.layers).toHaveLength(1);

      const root = schema.layers[0].root;
      expect(root.type).toBe('select');
      expect(root.label).toBe('Role');
      expect(root.binding?.kind).toBe('field');
      expect(root.binding?.value).toBe('user.role');
      expect(root.children).toHaveLength(2);

      // Check options - binding is literal, label is the first string
      expect(root.children![0].type).toBe('option');
      expect(root.children![0].binding?.kind).toBe('literal');
      expect(root.children![0].binding?.value).toBe('user');

      expect(root.children![1].type).toBe('option');
      expect(root.children![1].binding?.kind).toBe('literal');
      expect(root.children![1].binding?.value).toBe('admin');
    });

    it('should parse select with multiple options', () => {
      const input = `Se :status "Status" [opt "draft" "Draft", opt "review" "In Review", opt "published" "Published"]`;
      const schema = parseUI(input);

      const root = schema.layers[0].root;
      expect(root.type).toBe('select');
      expect(root.children).toHaveLength(3);
    });

    it('should parse select without explicit label', () => {
      const input = `Se :role [opt "a" "Admin", opt "u" "User"]`;
      const schema = parseUI(input);

      const root = schema.layers[0].root;
      expect(root.type).toBe('select');
      // Parser auto-generates label from binding field
      expect(root.label).toBe('Role');
      expect(root.binding?.value).toBe('role');
    });
  });

  describe('Select with Signals', () => {
    it('should parse select with emit signal', () => {
      const input = `sig selected
Se :role "Role" >selected [opt "a" "Admin", opt "u" "User"]`;
      const schema = parseUI(input);

      const root = schema.layers[0].root;
      expect(root.type).toBe('select');
      expect(root.signals?.emit?.name).toBe('selected');
    });
  });

  describe('Select Roundtrip', () => {
    it('should roundtrip basic select', () => {
      const input = `Se :user.role "Role" [opt "user" "User", opt "admin" "Admin"]`;
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });
  });

  describe('Select Edge Cases', () => {
    it('should handle select with no options (empty children)', () => {
      const input = `Se :role "Role" []`;
      const schema = parseUI(input);

      const root = schema.layers[0].root;
      expect(root.type).toBe('select');
      // Empty children array is omitted from output
      expect(root.children ?? []).toHaveLength(0);
    });

    it('should handle select with nested field binding', () => {
      const input = `Se :user.preferences.theme "Theme" [opt "light" "Light", opt "dark" "Dark"]`;
      const schema = parseUI(input);

      const root = schema.layers[0].root;
      expect(root.type).toBe('select');
      expect(root.binding?.value).toBe('user.preferences.theme');
    });
  });
});
