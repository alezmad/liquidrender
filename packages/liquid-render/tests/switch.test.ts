// Switch Component Tests
import { describe, it, expect } from 'vitest';
import { parseUI } from '../src/compiler/compiler';

describe('Switch Component', () => {
  describe('Basic Switch Parsing', () => {
    it('should parse a simple switch with label', () => {
      const input = `Sw :settings.darkMode "Dark Mode"`;
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.type).toBe('switch');
      expect(block.label).toBe('Dark Mode');
      expect(block.binding?.kind).toBe('field');
      expect(block.binding?.value).toBe('settings.darkMode');
    });

    it('should parse switch without label', () => {
      const input = `Sw :enabled`;
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.type).toBe('switch');
      expect(block.binding?.kind).toBe('field');
      expect(block.binding?.value).toBe('enabled');
    });

    it('should parse switch with signal emission', () => {
      const input = `
sig view
Sw :settings.notifications "Notifications" >view=settings
      `;
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.type).toBe('switch');
      expect(block.label).toBe('Notifications');
      expect(block.signals?.emit?.name).toBe('view');
      expect(block.signals?.emit?.value).toBe('settings');
    });
  });

  describe('Switch in Containers', () => {
    it('should parse multiple switches in a container', () => {
      const input = `
{
  Sw :settings.darkMode "Dark Mode"
  Sw :settings.notifications "Notifications"
  Sw :settings.autoSave "Auto-save"
}
      `;
      const schema = parseUI(input);

      const container = schema.layers[0]?.root;
      expect(container).toBeDefined();
      expect(container.type).toBe('container');
      expect(container.children).toHaveLength(3);
      expect(container.children![0].type).toBe('switch');
      expect(container.children![1].type).toBe('switch');
      expect(container.children![2].type).toBe('switch');
    });
  });

  describe('Switch Edge Cases', () => {
    it('should handle switch with nested field binding', () => {
      const input = `Sw :user.preferences.theme.dark "Dark Theme"`;
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.type).toBe('switch');
      expect(block.binding?.value).toBe('user.preferences.theme.dark');
    });

    it('should handle switch with literal binding', () => {
      const input = `Sw "true" "Always On"`;
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.type).toBe('switch');
      expect(block.binding?.kind).toBe('literal');
      expect(block.binding?.value).toBe('true');
    });
  });

  describe('Switch with Layers', () => {
    it('should parse switch with signal-based visibility', () => {
      const input = `
sig view
Sw :settings.advanced "Advanced Settings" <view=advanced
      `;
      const schema = parseUI(input);

      const block = schema.layers[0]?.root;
      expect(block).toBeDefined();
      expect(block.type).toBe('switch');
      // Signal receive is stored in signals.receive, not condition
      expect(block.signals?.receive).toBe('view');
    });
  });
});
