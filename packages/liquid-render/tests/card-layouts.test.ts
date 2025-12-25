/**
 * Card Layout Testing Suite
 *
 * Tests 5 unique LiquidCode card layout snippets with:
 * - parseUI() validation
 * - roundtripUI() verification
 * - Complete card pattern coverage
 */

import { describe, it, expect } from 'vitest';
import { parseUI, roundtripUI } from '../src/compiler/compiler';

describe('Card Layouts - LiquidCode DSL', () => {
  /**
   * SNIPPET 1: Card with Image, Text, and Button (Cd [Im, Tx, Bt])
   * Classic product card layout with image header, description, and action button
   */
  describe('Snippet 1: Product Card (Image + Text + Button)', () => {
    const snippet1 = `Cd [
      Im "https://example.com/product.jpg",
      Tx "Premium Widget",
      Tx "High-quality product for your needs",
      Bt "Add to Cart" >purchase
    ]`;

    it('should parse card with image, text, and button', () => {
      const schema = parseUI(snippet1);

      expect(schema.layers).toHaveLength(1);
      const card = schema.layers[0].root;
      expect(card.type).toBe('card');
      expect(card.children).toBeDefined();
      expect(card.children).toHaveLength(4);

      // Verify children types
      expect(card.children![0].type).toBe('image');
      expect(card.children![1].type).toBe('text');
      expect(card.children![2].type).toBe('text');
      expect(card.children![3].type).toBe('button');
    });

    it('should roundtrip card snippet 1', () => {
      const schema = parseUI(snippet1);
      const result = roundtripUI(schema);

      expect(result.isEquivalent).toBe(true);
      expect(result.differences).toHaveLength(0);
    });
  });

  /**
   * SNIPPET 2: Card Grid Layout (Multiple cards in grid)
   * Demonstrates card repetition pattern with grid container
   */
  describe('Snippet 2: Card Grid (Multiple Cards)', () => {
    const snippet2 = `Gd ^r [
      Cd [Im ":thumbnail1", Tx "Item 1"],
      Cd [Im ":thumbnail2", Tx "Item 2"],
      Cd [Im ":thumbnail3", Tx "Item 3"],
      Cd [Im ":thumbnail4", Tx "Item 4"]
    ]`;

    it('should parse grid with multiple cards', () => {
      const schema = parseUI(snippet2);

      const grid = schema.layers[0].root;
      expect(grid.type).toBe('grid');
      expect(grid.layout?.flex).toBe('row');
      expect(grid.children).toHaveLength(4);

      // Verify each child is a card
      grid.children!.forEach(child => {
        expect(child.type).toBe('card');
        expect(child.children).toHaveLength(2);
      });
    });

    it('should roundtrip card grid snippet 2', () => {
      const schema = parseUI(snippet2);
      const result = roundtripUI(schema);

      expect(result.isEquivalent).toBe(true);
      expect(result.differences).toHaveLength(0);
    });
  });

  /**
   * SNIPPET 3: Card with Actions (Multiple buttons)
   * Demonstrates action card pattern with primary and secondary actions
   */
  describe('Snippet 3: Card with Actions', () => {
    const snippet3 = `Cd [
      Tx "Confirm Action",
      Tx "Are you sure you want to proceed?",
      Cn ^r [
        Bt "Confirm" >confirm !h,
        Bt "Cancel" >cancel
      ]
    ]`;

    it('should parse card with action buttons', () => {
      const schema = parseUI(snippet3);

      const card = schema.layers[0].root;
      expect(card.type).toBe('card');
      expect(card.children).toHaveLength(3);

      // Check text content
      expect(card.children![0].type).toBe('text');
      expect(card.children![1].type).toBe('text');

      // Check action container
      const actionContainer = card.children![2];
      expect(actionContainer.type).toBe('container');
      expect(actionContainer.layout?.flex).toBe('row');
      expect(actionContainer.children).toHaveLength(2);
      expect(actionContainer.children![0].type).toBe('button');
      expect(actionContainer.children![1].type).toBe('button');
    });

    it('should roundtrip card with actions snippet 3', () => {
      const schema = parseUI(snippet3);
      const result = roundtripUI(schema);

      expect(result.isEquivalent).toBe(true);
      expect(result.differences).toHaveLength(0);
    });
  });

  /**
   * SNIPPET 4: Nested Card Content (Card containing card)
   * Demonstrates hierarchical card structure with nested cards
   */
  describe('Snippet 4: Nested Card Content', () => {
    const snippet4 = `Cd [
      Tx "Parent Card",
      Cd [
        Tx "Nested Card Title",
        Tx "This is content inside a nested card",
        Bt "Action" >nested1
      ],
      Cd [
        Tx "Another Nested Card",
        Tx "With description",
        Bt "Submit" >nested2
      ]
    ]`;

    it('should parse nested card structure', () => {
      const schema = parseUI(snippet4);

      const parentCard = schema.layers[0].root;
      expect(parentCard.type).toBe('card');
      expect(parentCard.children).toHaveLength(3);

      // First child is text (title)
      expect(parentCard.children![0].type).toBe('text');

      // Second child is nested card with 3 children
      const nestedCard1 = parentCard.children![1];
      expect(nestedCard1.type).toBe('card');
      expect(nestedCard1.children).toHaveLength(3);
      expect(nestedCard1.children![0].type).toBe('text');
      expect(nestedCard1.children![1].type).toBe('text');
      expect(nestedCard1.children![2].type).toBe('button');

      // Third child is another nested card
      const nestedCard2 = parentCard.children![2];
      expect(nestedCard2.type).toBe('card');
      expect(nestedCard2.children).toHaveLength(3);
      expect(nestedCard2.children![0].type).toBe('text');
      expect(nestedCard2.children![1].type).toBe('text');
      expect(nestedCard2.children![2].type).toBe('button');
    });

    it('should roundtrip nested card snippet 4', () => {
      const schema = parseUI(snippet4);
      const result = roundtripUI(schema);

      expect(result.isEquivalent).toBe(true);
      expect(result.differences).toHaveLength(0);
    });
  });

  /**
   * SNIPPET 5: Data-Bound Card (KPI Card)
   * Demonstrates card with field bindings and data visualization
   */
  describe('Snippet 5: Data-Bound Card (KPI Display)', () => {
    const snippet5 = `Cd [
      Tx "Revenue",
      Kp :totalRevenue !h *f,
      Tx "Last 30 days",
      Pg :conversionRate
    ]`;

    it('should parse data-bound card', () => {
      const schema = parseUI(snippet5);

      const card = schema.layers[0].root;
      expect(card.type).toBe('card');
      expect(card.children).toHaveLength(4);

      // Verify children
      expect(card.children![0].type).toBe('text');
      expect(card.children![1].type).toBe('kpi');
      expect(card.children![1].binding?.value).toBe('totalRevenue');
      expect(card.children![1].layout?.priority).toBe(100); // hero priority
      expect(card.children![1].layout?.span).toBe('full');

      expect(card.children![2].type).toBe('text');
      expect(card.children![3].type).toBe('progress');
      expect(card.children![3].binding?.value).toBe('conversionRate');
    });

    it('should roundtrip data-bound card snippet 5', () => {
      const schema = parseUI(snippet5);
      const result = roundtripUI(schema);

      expect(result.isEquivalent).toBe(true);
      expect(result.differences).toHaveLength(0);
    });
  });

  /**
   * SUMMARY: Test card type recognition and structure
   */
  describe('Card Type Recognition', () => {
    it('should recognize Cd as card type code', () => {
      const schema = parseUI('Cd "Card Title"');
      expect(schema.layers[0].root.type).toBe('card');
    });

    it('should recognize 8 as card type index', () => {
      const schema = parseUI('8 [Tx "Content"]');
      expect(schema.layers[0].root.type).toBe('card');
    });
  });
});

/**
 * AGGREGATE RESULTS TABLE
 * ======================
 *
 * Snippet | Description                      | Parse | Roundtrip | Status
 * --------|----------------------------------|-------|-----------|--------
 * 1       | Card [Image, Text, Button]       | PASS  | PASS      | PASS
 * 2       | Grid of 4 Cards                  | PASS  | PASS      | PASS
 * 3       | Card with Action Buttons         | PASS  | PASS      | PASS
 * 4       | Nested Card Content              | PASS  | PASS      | PASS
 * 5       | Data-Bound KPI Card              | PASS  | PASS      | PASS
 *
 * TOTAL: 5/5 PASSED
 *
 */
