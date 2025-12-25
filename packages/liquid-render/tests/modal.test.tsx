import { describe, it, expect } from 'vitest';
import { parseUI, compileUI } from '../src/compiler/compiler';

describe('Modal Component', () => {
  describe('Basic Modal Syntax', () => {
    it('should parse simple modal', () => {
      const input = 'Md "Title"';
      const schema = parseUI(input);
      const modal = schema.layers[0].root;

      expect(modal.type).toBe('modal');
      expect(modal.label).toBe('Title');
    });

    it('should parse modal with content', () => {
      const input = 'Md "Confirm" [Tx "Are you sure?"]';
      const schema = parseUI(input);
      const modal = schema.layers[0].root;

      expect(modal.type).toBe('modal');
      expect(modal.children).toHaveLength(1);
      expect(modal.children![0].type).toBe('text');
    });

    it('should parse modal with binding', () => {
      const input = 'Md :modalTitle';
      const schema = parseUI(input);
      const modal = schema.layers[0].root;

      expect(modal.type).toBe('modal');
      expect(modal.binding?.value).toBe('modalTitle');
    });
  });

  describe('Modal with Buttons', () => {
    it('should parse modal with action buttons', () => {
      const input = 'Md "Delete Item" [Tx "Are you sure?", Bt "Cancel", Bt "Delete" #red]';
      const schema = parseUI(input);
      const modal = schema.layers[0].root;

      expect(modal.type).toBe('modal');
      expect(modal.children).toHaveLength(3);

      const deleteBtn = modal.children![2];
      expect(deleteBtn.type).toBe('button');
      expect(deleteBtn.style?.color).toBe('red');
    });

    it('should parse modal with form', () => {
      const input = 'Md "Edit Profile" [In :name "Name", In :email "Email", Bt "Save"]';
      const schema = parseUI(input);
      const modal = schema.layers[0].root;

      expect(modal.type).toBe('modal');
      expect(modal.children).toHaveLength(3);
    });
  });

  describe('Modal Sizes', () => {
    it('should parse small modal', () => {
      const input = 'Md "Alert" %sm';
      const schema = parseUI(input);
      const modal = schema.layers[0].root;

      expect(modal.style?.size).toBe('sm');
    });

    it('should parse large modal', () => {
      const input = 'Md "Large Form" %lg';
      const schema = parseUI(input);
      const modal = schema.layers[0].root;

      expect(modal.style?.size).toBe('lg');
    });
  });

  describe('Modal as Layer', () => {
    it('should parse modal in layer definition', () => {
      const input = '/1 9 "Details" [Tx "Modal content"]';
      const schema = parseUI(input);

      expect(schema.layers.length).toBeGreaterThanOrEqual(1);
      const modalLayer = schema.layers.find(l => l.id === 1);
      expect(modalLayer).toBeDefined();
      expect(modalLayer?.root.type).toBe('modal');
      expect(modalLayer?.root.label).toBe('Details');
    });

    it('should parse button triggering layer', () => {
      const input = 'Bt "Open" >/1';
      const schema = parseUI(input);
      const button = schema.layers[0].root;

      expect(button.signals?.layer).toBe(1);
    });

    it('should parse layer close button', () => {
      const input = '/1 9 "Modal" [Bt "Close" /<]';
      const schema = parseUI(input);

      const modalLayer = schema.layers.find(l => l.id === 1);
      expect(modalLayer).toBeDefined();
      const closeBtn = modalLayer?.root.children?.[0];
      expect(closeBtn?.type).toBe('button');
    });
  });

  describe('Roundtrip', () => {
    it('should roundtrip modal with title', () => {
      const original = 'Md "Confirm"';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      expect(reparsed.layers[0].root.type).toBe('modal');
      expect(reparsed.layers[0].root.label).toBe('Confirm');
    });

    it('should roundtrip modal with content', () => {
      const original = 'Md "Title" [Tx "Content"]';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      expect(reparsed.layers[0].root.children).toHaveLength(1);
    });
  });
});
