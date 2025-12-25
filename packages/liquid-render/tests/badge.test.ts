import { describe, it, expect } from 'vitest';
import { parseUI, compileUI } from '../src/compiler/compiler';

describe('Badge Component', () => {
  describe('Basic Badge Syntax', () => {
    it('should parse number badge', () => {
      const input = 'Bg :count';
      const schema = parseUI(input);
      const badge = schema.layers[0].root;

      expect(badge.type).toBe('badge');
      expect(badge.binding?.value).toBe('count');
    });

    it('should parse text badge', () => {
      const input = 'Bg "New"';
      const schema = parseUI(input);
      const badge = schema.layers[0].root;

      expect(badge.type).toBe('badge');
      expect(badge.label).toBe('New');
    });

    it('should parse dot-only badge', () => {
      const input = 'Bg';
      const schema = parseUI(input);
      const badge = schema.layers[0].root;

      expect(badge.type).toBe('badge');
      expect(badge.binding).toBeUndefined();
    });

    it('should parse colored badge', () => {
      const input = 'Bg :count #red';
      const schema = parseUI(input);
      const badge = schema.layers[0].root;

      expect(badge.type).toBe('badge');
      expect(badge.binding?.value).toBe('count');
      expect(badge.style?.color).toBe('red');
    });

    it('should parse badge with color alias', () => {
      const input = 'Bg :count #r';
      const schema = parseUI(input);
      const badge = schema.layers[0].root;

      expect(badge.type).toBe('badge');
      expect(badge.style?.color).toBe('red');
    });
  });

  describe('Badge Placement', () => {
    it('should parse badge as child of icon', () => {
      const input = 'Ic "bell" [Bg :notifications]';
      const schema = parseUI(input);
      const icon = schema.layers[0].root;

      expect(icon.type).toBe('icon');
      expect(icon.children).toHaveLength(1);

      const badge = icon.children![0];
      expect(badge.type).toBe('badge');
      expect(badge.binding?.value).toBe('notifications');
    });

    it('should parse badge in button', () => {
      const input = 'Bt "Cart" [Bg :cartCount]';
      const schema = parseUI(input);
      const button = schema.layers[0].root;

      expect(button.type).toBe('button');
      expect(button.children).toHaveLength(1);

      const badge = button.children![0];
      expect(badge.type).toBe('badge');
      expect(badge.binding?.value).toBe('cartCount');
    });

    it('should parse standalone badge', () => {
      const input = 'Bg "Beta" #blue';
      const schema = parseUI(input);
      const badge = schema.layers[0].root;

      expect(badge.type).toBe('badge');
      expect(badge.label).toBe('Beta');
      expect(badge.style?.color).toBe('blue');
    });
  });

  describe('Badge with Multiple Colors', () => {
    it('should parse badge with green color', () => {
      const input = 'Bg :status #green';
      const schema = parseUI(input);
      const badge = schema.layers[0].root;

      expect(badge.style?.color).toBe('green');
    });

    it('should parse badge with blue color', () => {
      const input = 'Bg "New" #blue';
      const schema = parseUI(input);
      const badge = schema.layers[0].root;

      expect(badge.style?.color).toBe('blue');
    });

    it('should parse badge with yellow color', () => {
      const input = 'Bg :pending #yellow';
      const schema = parseUI(input);
      const badge = schema.layers[0].root;

      expect(badge.style?.color).toBe('yellow');
    });
  });

  describe('Complex Badge Patterns', () => {
    it('should parse notification icon with badge', () => {
      const input = 'Ic "bell" [Bg :unreadCount #red]';
      const schema = parseUI(input);
      const icon = schema.layers[0].root;
      const badge = icon.children![0];

      expect(badge.type).toBe('badge');
      expect(badge.binding?.value).toBe('unreadCount');
      expect(badge.style?.color).toBe('red');
    });

    it('should parse badge with size modifier', () => {
      const input = 'Bg :count %sm';
      const schema = parseUI(input);
      const badge = schema.layers[0].root;

      expect(badge.type).toBe('badge');
      expect(badge.style?.size).toBe('sm');
    });

    it('should parse badge with both color and size', () => {
      const input = 'Bg :count #red %lg';
      const schema = parseUI(input);
      const badge = schema.layers[0].root;

      expect(badge.style?.color).toBe('red');
      expect(badge.style?.size).toBe('lg');
    });
  });

  describe('Badge in Real-World Contexts', () => {
    it('should parse shopping cart with badge', () => {
      const input = 'Bt "Cart" [Ic "shopping-cart", Bg :cartItems #red]';
      const schema = parseUI(input);
      const button = schema.layers[0].root;

      expect(button.type).toBe('button');
      expect(button.children).toHaveLength(2);

      const icon = button.children![0];
      const badge = button.children![1];

      expect(icon.type).toBe('icon');
      expect(badge.type).toBe('badge');
      expect(badge.binding?.value).toBe('cartItems');
    });

    it('should parse avatar with online badge', () => {
      const input = 'Av :user [Bg #green]';
      const schema = parseUI(input);
      const avatar = schema.layers[0].root;

      expect(avatar.type).toBe('avatar');
      expect(avatar.children).toHaveLength(1);

      const badge = avatar.children![0];
      expect(badge.type).toBe('badge');
      expect(badge.style?.color).toBe('green');
    });
  });

  describe('Roundtrip', () => {
    it('should roundtrip number badge', () => {
      const original = 'Bg :count';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      expect(reparsed.layers[0].root.type).toBe('badge');
      expect(reparsed.layers[0].root.binding?.value).toBe('count');
    });

    it('should roundtrip text badge', () => {
      const original = 'Bg "New"';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      expect(reparsed.layers[0].root.label).toBe('New');
    });

    it('should roundtrip colored badge', () => {
      const original = 'Bg :count #red';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      const badge = reparsed.layers[0].root;
      expect(badge.binding?.value).toBe('count');
      expect(badge.style?.color).toBe('red');
    });

    it('should roundtrip badge in icon', () => {
      const original = 'Ic "bell" [Bg :notifications]';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      const icon = reparsed.layers[0].root;
      expect(icon.type).toBe('icon');

      const badge = icon.children![0];
      expect(badge.type).toBe('badge');
      expect(badge.binding?.value).toBe('notifications');
    });

    it('should roundtrip standalone status badge', () => {
      const original = 'Bg "Beta" #blue';
      const schema = parseUI(original);
      const reconstructed = compileUI(schema);
      const reparsed = parseUI(reconstructed);

      const badge = reparsed.layers[0].root;
      expect(badge.label).toBe('Beta');
      expect(badge.style?.color).toBe('blue');
    });
  });

  describe('Edge Cases', () => {
    it('should handle badge with empty binding', () => {
      const input = 'Bg';
      const schema = parseUI(input);
      const badge = schema.layers[0].root;

      expect(badge.type).toBe('badge');
      expect(badge.binding).toBeUndefined();
    });

    it('should handle badge with whitespace in label', () => {
      const input = 'Bg "New Feature"';
      const schema = parseUI(input);
      const badge = schema.layers[0].root;

      expect(badge.label).toBe('New Feature');
    });

    it('should handle badge with special characters in label', () => {
      const input = 'Bg "99+"';
      const schema = parseUI(input);
      const badge = schema.layers[0].root;

      expect(badge.label).toBe('99+');
    });

  });

  describe('Error Handling', () => {
    it('should handle badge with invalid color', () => {
      const input = 'Bg :count #invalidcolor';
      const schema = parseUI(input);
      const badge = schema.layers[0].root;

      // Should still parse, color validation happens at render time
      expect(badge.type).toBe('badge');
      expect(badge.style?.color).toBe('invalidcolor');
    });

    it('should handle badge with multiple modifiers', () => {
      const input = 'Bg :count #red %sm';
      const schema = parseUI(input);
      const badge = schema.layers[0].root;

      expect(badge.style?.color).toBe('red');
      expect(badge.style?.size).toBe('sm');
    });
  });

  describe('Value Formatting', () => {
    it('should handle zero values (should hide)', () => {
      const input = 'Bg :count';
      const schema = parseUI(input);
      const badge = schema.layers[0].root;

      expect(badge.type).toBe('badge');
      // Rendering logic will hide when value is 0
    });

    it('should handle large numbers (99+ logic)', () => {
      const input = 'Bg :largeCount';
      const schema = parseUI(input);
      const badge = schema.layers[0].root;

      expect(badge.binding?.value).toBe('largeCount');
      // Component will format as "99+" when value > 99
    });

    it('should handle text values', () => {
      const input = 'Bg "VIP"';
      const schema = parseUI(input);
      const badge = schema.layers[0].root;

      expect(badge.label).toBe('VIP');
    });
  });

  describe('Real-World Examples', () => {
    it('should parse notification bell example', () => {
      const input = 'Ic "bell" [Bg :notifications]';
      const schema = parseUI(input);
      const icon = schema.layers[0].root;
      const badge = icon.children![0];

      expect(icon.type).toBe('icon');
      expect(icon.label).toBe('bell');
      expect(badge.type).toBe('badge');
      expect(badge.binding?.value).toBe('notifications');
    });

    it('should parse shopping cart example', () => {
      const input = 'Bt "Cart" [Bg :cartItems #red]';
      const schema = parseUI(input);
      const button = schema.layers[0].root;
      const badge = button.children![0];

      expect(button.label).toBe('Cart');
      expect(badge.binding?.value).toBe('cartItems');
      expect(badge.style?.color).toBe('red');
    });

    it('should parse status badge example', () => {
      const input = 'Bg "Beta" #blue';
      const schema = parseUI(input);
      const badge = schema.layers[0].root;

      expect(badge.label).toBe('Beta');
      expect(badge.style?.color).toBe('blue');
    });

    it('should parse avatar with online indicator', () => {
      const input = 'Av :user [Bg #green]';
      const schema = parseUI(input);
      const avatar = schema.layers[0].root;
      const badge = avatar.children![0];

      expect(avatar.type).toBe('avatar');
      expect(badge.type).toBe('badge');
      expect(badge.style?.color).toBe('green');
    });
  });
});
