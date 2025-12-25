import { describe, it, expect } from 'vitest';
import { parseUI, roundtripUI } from '../src/compiler/compiler';

describe('Avatar Component', () => {
  describe('Basic Avatar Parsing', () => {
    it('should parse avatar with binding', () => {
      const input = 'Av :user.avatar';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.type).toBe('avatar');
      expect(block.binding?.kind).toBe('field');
      expect(block.binding?.value).toBe('user.avatar');
    });

    it('should parse avatar with initials', () => {
      const input = 'Av "JD"';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.type).toBe('avatar');
      expect(block.label).toBe('JD');
    });

    it('should parse avatar with nested binding', () => {
      const input = 'Av :profile.picture.url';
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.binding?.value).toBe('profile.picture.url');
    });
  });

  describe('Avatar Roundtrip', () => {
    it('should roundtrip avatar with binding', () => {
      const input = 'Av :user.avatar';
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });

    it('should roundtrip avatar with initials', () => {
      const input = 'Av "JD"';
      const schema = parseUI(input);
      const result = roundtripUI(schema);
      expect(result.isEquivalent).toBe(true);
    });
  });

  describe('Multiple Avatars', () => {
    it('should parse avatars in container', () => {
      const input = `{
  Av :user1.avatar
  Av :user2.avatar
  Av "AB"
}`;
      const schema = parseUI(input);

      const container = schema.layers[0]?.root;
      expect(container.children).toHaveLength(3);
      expect(container.children![0].type).toBe('avatar');
      expect(container.children![1].type).toBe('avatar');
      expect(container.children![2].type).toBe('avatar');
    });
  });
});
