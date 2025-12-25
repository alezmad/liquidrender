import { describe, it, expect } from 'vitest';
import { parseUI, roundtripUI } from '../src/compiler/compiler';

describe('Radio Component', () => {
  describe('Basic Radio Parsing', () => {
    it('should parse radio with options', () => {
      const input = 'Rd :user.gender "Gender" [opt "m" "Male", opt "f" "Female"]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.type).toBe('radio');
      expect(block.label).toBe('Gender');
      expect(block.binding?.value).toBe('user.gender');
      expect(block.children).toHaveLength(2);
    });

    it('should parse radio options correctly', () => {
      const input = 'Rd :status "Status" [opt "active" "Active", opt "inactive" "Inactive", opt "pending" "Pending"]';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.children).toHaveLength(3);
      expect(block.children![0].type).toBe('option');
      expect(block.children![0].binding?.kind).toBe('literal');
    });
  });

  describe('Radio with Signals', () => {
    it('should parse radio with emit signal', () => {
      const input = `sig changed
Rd :role "Role" >changed [opt "admin" "Admin", opt "user" "User"]`;
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block.signals?.emit?.name).toBe('changed');
    });
  });

  describe('Radio Roundtrip', () => {
    it('should roundtrip radio with options', () => {
      const input = 'Rd :gender "Gender" [opt "m" "Male", opt "f" "Female"]';
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });
  });
});
