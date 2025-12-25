import { describe, it, expect } from 'vitest';
import { parseUI, compileUI } from '../src/compiler/compiler';

describe('Form Component', () => {
  describe('Basic Form Syntax', () => {
    it('should parse simple form with inputs', () => {
      const input = 'Fm [In :name "Name", In :email "Email"]';
      const schema = parseUI(input);
      const form = schema.layers[0].root;

      expect(form.type).toBe('form');
      expect(form.children).toHaveLength(2);
    });

    it('should parse form with button', () => {
      const input = 'Fm [In :email "Email", Bt "Submit"]';
      const schema = parseUI(input);
      const form = schema.layers[0].root;

      expect(form.children).toHaveLength(2);
      expect(form.children![1].type).toBe('button');
    });

    it('should parse form with action button', () => {
      const input = 'Fm [In :email "Email", Bt "Submit" !submit]';
      const schema = parseUI(input);
      const form = schema.layers[0].root;

      const submitBtn = form.children![1];
      expect(submitBtn.action).toBe('submit');
    });
  });

  describe('Form with Various Fields', () => {
    it('should parse form with checkbox', () => {
      const input = 'Fm [Ck :remember "Remember me"]';
      const schema = parseUI(input);
      const form = schema.layers[0].root;
      const checkbox = form.children![0];

      expect(checkbox.type).toBe('checkbox');
      expect(checkbox.binding?.value).toBe('remember');
    });

    it('should parse form with select', () => {
      const input = 'Fm [Se :country "Country"]';
      const schema = parseUI(input);
      const form = schema.layers[0].root;
      const select = form.children![0];

      expect(select.type).toBe('select');
    });

    it('should parse form with radio', () => {
      const input = 'Fm [Rd :choice "Option"]';
      const schema = parseUI(input);
      const form = schema.layers[0].root;
      const radio = form.children![0];

      expect(radio.type).toBe('radio');
    });

    it('should parse form with switch', () => {
      const input = 'Fm [Sw :notifications "Enable notifications"]';
      const schema = parseUI(input);
      const form = schema.layers[0].root;
      const sw = form.children![0];

      expect(sw.type).toBe('switch');
    });
  });

  describe('Complex Forms', () => {
    it('should parse login form', () => {
      const input = 'Fm [In :email "Email", In :password "Password", Ck :remember "Remember me", Bt "Login" !submit]';
      const schema = parseUI(input);
      const form = schema.layers[0].root;

      expect(form.children).toHaveLength(4);
      expect(form.children![0].type).toBe('input');
      expect(form.children![1].type).toBe('input');
      expect(form.children![2].type).toBe('checkbox');
      expect(form.children![3].type).toBe('button');
    });

    it('should parse registration form', () => {
      const input = 'Fm [In :name "Name", In :email "Email", In :password "Password", In :confirm "Confirm", Bt "Register" #primary]';
      const schema = parseUI(input);
      const form = schema.layers[0].root;

      expect(form.children).toHaveLength(5);
      const submitBtn = form.children![4];
      expect(submitBtn.style?.color).toBe('primary');
    });
  });

  describe('Form Signal Behavior', () => {
    it('should use input signals for form changes', () => {
      // Forms don't directly support signals; use input signals instead
      const input = 'Fm [In :search "Search" >searchChanged]';
      const schema = parseUI(input);
      const form = schema.layers[0].root;
      const searchInput = form.children![0];

      expect(searchInput.signals?.emit?.name).toBe('searchChanged');
    });
  });

  describe('Roundtrip', () => {
    it('should roundtrip simple form', () => {
      const original = 'Fm [In :name "Name"]';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      expect(reparsed.layers[0].root.type).toBe('form');
    });

    it('should roundtrip form with multiple fields', () => {
      const original = 'Fm [In :a "A", In :b "B", Bt "Go"]';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      expect(reparsed.layers[0].root.children).toHaveLength(3);
    });
  });
});
