import { describe, it, expect } from 'vitest';
import { parseUI, compileUI } from '../src/compiler/compiler';

describe('Input Component', () => {
  describe('Basic Input Syntax', () => {
    it('should parse input with binding and label', () => {
      const input = 'In :name "Name"';
      const schema = parseUI(input);
      const inputEl = schema.layers[0].root;

      expect(inputEl.type).toBe('input');
      expect(inputEl.label).toBe('Name');
      expect(inputEl.binding?.value).toBe('name');
    });

    it('should parse input with binding only', () => {
      const input = 'In :email';
      const schema = parseUI(input);
      const inputEl = schema.layers[0].root;

      expect(inputEl.type).toBe('input');
      expect(inputEl.binding?.value).toBe('email');
      // Should auto-generate label
      expect(inputEl.label).toBe('Email');
    });

    it('should parse input with label only', () => {
      const input = 'In "Search"';
      const schema = parseUI(input);
      const inputEl = schema.layers[0].root;

      expect(inputEl.type).toBe('input');
      expect(inputEl.label).toBe('Search');
    });
  });

  describe('Input Sizes', () => {
    it('should parse small input', () => {
      const input = 'In :name "Name" %sm';
      const schema = parseUI(input);
      const inputEl = schema.layers[0].root;

      expect(inputEl.style?.size).toBe('sm');
    });

    it('should parse large input', () => {
      const input = 'In :name "Name" %lg';
      const schema = parseUI(input);
      const inputEl = schema.layers[0].root;

      expect(inputEl.style?.size).toBe('lg');
    });
  });

  describe('Input with Icons', () => {
    it('should parse input with icon child', () => {
      const input = 'In :query "Search" [Ic "search"]';
      const schema = parseUI(input);
      const inputEl = schema.layers[0].root;

      expect(inputEl.children).toHaveLength(1);
      expect(inputEl.children![0].type).toBe('icon');
    });
  });

  describe('Input with Signals', () => {
    it('should parse input with signal emit', () => {
      const input = 'In :search "Search" >searchChanged';
      const schema = parseUI(input);
      const inputEl = schema.layers[0].root;

      expect(inputEl.signals?.emit?.name).toBe('searchChanged');
    });

    it('should parse input with bidirectional signal', () => {
      const input = 'In :query "Search" <>search';
      const schema = parseUI(input);
      const inputEl = schema.layers[0].root;

      expect(inputEl.signals?.both).toBe('search');
    });
  });

  describe('Roundtrip', () => {
    it('should roundtrip simple input', () => {
      const original = 'In :name "Name"';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      expect(reparsed.layers[0].root.type).toBe('input');
      expect(reparsed.layers[0].root.binding?.value).toBe('name');
    });

    it('should roundtrip input with size', () => {
      const original = 'In :name "Name" %lg';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      expect(reparsed.layers[0].root.style?.size).toBe('lg');
    });
  });

  describe('Edge Cases', () => {
    it('should handle nested field path', () => {
      const input = 'In :user.email "Email"';
      const schema = parseUI(input);
      const inputEl = schema.layers[0].root;

      expect(inputEl.binding?.value).toBe('user.email');
    });

    it('should handle special characters in label', () => {
      const input = 'In :name "What\'s your name?"';
      const schema = parseUI(input);
      const inputEl = schema.layers[0].root;

      expect(inputEl.label).toBe("What's your name?");
    });

    it('should handle camelCase field auto-label', () => {
      const input = 'In :firstName';
      const schema = parseUI(input);
      const inputEl = schema.layers[0].root;

      expect(inputEl.label).toBe('First Name');
    });
  });
});
