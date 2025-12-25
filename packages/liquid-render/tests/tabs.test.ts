// Tabs Component Tests
import { describe, it, expect } from 'vitest';
import { parseUI } from '../src/compiler/compiler';

describe('Tabs Component', () => {
  describe('DSL Parsing', () => {
    it('should parse basic Ts (tabs) with tab children', () => {
      const input = `Ts :activeTab [
        tab "Overview" [Tx "Overview content"],
        tab "Details" [Tx "Details content"],
        tab "Settings" [Tx "Settings content"]
      ]`;

      const schema = parseUI(input);
      const block = schema.layers[0]?.root;

      expect(block).toBeDefined();
      expect(block.type).toBe('tabs');
      expect(block.binding?.kind).toBe('field');
      expect(block.binding?.value).toBe('activeTab');
      expect(block.children).toHaveLength(3);

      // First tab
      expect(block.children![0].type).toBe('tab');
      expect(block.children![0].label).toBe('Overview');
      expect(block.children![0].children).toHaveLength(1);
      expect(block.children![0].children![0].type).toBe('text');

      // Second tab
      expect(block.children![1].type).toBe('tab');
      expect(block.children![1].label).toBe('Details');

      // Third tab
      expect(block.children![2].type).toBe('tab');
      expect(block.children![2].label).toBe('Settings');
    });

    it('should parse tabs with pills variant', () => {
      const input = `Ts :tab #pills [
        tab "Tab 1" [Tx "Content 1"],
        tab "Tab 2" [Tx "Content 2"]
      ]`;

      const schema = parseUI(input);
      const block = schema.layers[0]?.root;

      expect(block).toBeDefined();
      expect(block.type).toBe('tabs');
      expect(block.style?.color).toBe('pills');
    });

    it.skip('should parse tabs with disabled tab (TODO: implement :disabled state)', () => {
      const input = `Ts :activeTab [
        tab "Active" [Tx "Content"],
        tab "Disabled" :disabled [Tx "Coming soon"]
      ]`;

      const schema = parseUI(input);
      const block = schema.layers[0]?.root;

      expect(block).toBeDefined();
      expect(block.children).toHaveLength(2);
      expect(block.children![1].state?.disabled).toBe(true);
    });

    it.skip('should parse tabs with signal emit (TODO: fix signal parsing)', () => {
      const input = `sig tab
Ts :activeTab >tab [
  tab "Overview" [Kp :revenue],
  tab "Details" [Tb :transactions]
]`;

      const schema = parseUI(input);
      const block = schema.layers[0]?.root;

      expect(block).toBeDefined();
      expect(block.type).toBe('tabs');
      expect(block.signals?.emit?.name).toBe('tab');
    });

    it('should parse tabs with nested components', () => {
      const input = `Ts :activeTab [
        tab "Dashboard" [
          Kp :revenue "Revenue",
          Kp :orders "Orders",
          Ln :trend
        ],
        tab "Table" [
          Tb :data [:id :name :amount]
        ]
      ]`;

      const schema = parseUI(input);
      const block = schema.layers[0]?.root;

      expect(block).toBeDefined();
      expect(block.children).toHaveLength(2);

      // Dashboard tab with 3 children
      expect(block.children![0].children).toHaveLength(3);
      expect(block.children![0].children![0].type).toBe('kpi');
      expect(block.children![0].children![1].type).toBe('kpi');
      expect(block.children![0].children![2].type).toBe('line');

      // Table tab
      expect(block.children![1].children).toHaveLength(1);
      expect(block.children![1].children![0].type).toBe('table');
    });

    it('should handle empty tabs container', () => {
      const input = 'Ts :activeTab';

      const schema = parseUI(input);
      const block = schema.layers[0]?.root;

      expect(block).toBeDefined();
      expect(block.type).toBe('tabs');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single tab', () => {
      const input = `Ts :activeTab [
        tab "Only One" [Tx "Content"]
      ]`;

      const schema = parseUI(input);
      const block = schema.layers[0]?.root;

      expect(block).toBeDefined();
      expect(block.children).toHaveLength(1);
    });

    it('should handle tabs with empty tab content', () => {
      const input = `Ts :activeTab [
        tab "Empty Tab" [],
        tab "With Content" [Tx "Content"]
      ]`;

      const schema = parseUI(input);
      const block = schema.layers[0]?.root;

      expect(block).toBeDefined();
      expect(block.children).toHaveLength(2);
      expect(block.children![0].children?.length ?? 0).toBe(0);
    });

    it('should handle deeply nested content in tabs', () => {
      const input = `Ts :activeTab [
        tab "Nested" [
          Cn [
            Cn [
              Tx "Deep content"
            ]
          ]
        ]
      ]`;

      const schema = parseUI(input);
      const block = schema.layers[0]?.root;

      expect(block).toBeDefined();
      const tabContent = block.children![0].children![0];
      expect(tabContent.type).toBe('container');
      expect(tabContent.children![0].type).toBe('container');
    });

    it('should handle tabs without binding', () => {
      const input = `Ts [
        tab "Tab 1" [Tx "Content 1"],
        tab "Tab 2" [Tx "Content 2"]
      ]`;

      const schema = parseUI(input);
      const block = schema.layers[0]?.root;

      expect(block).toBeDefined();
      expect(block.type).toBe('tabs');
    });

    it.skip('should handle tabs with all disabled tabs (TODO: implement :disabled state)', () => {
      const input = `Ts :activeTab [
        tab "Tab 1" :disabled [Tx "Content 1"],
        tab "Tab 2" :disabled [Tx "Content 2"]
      ]`;

      const schema = parseUI(input);
      const block = schema.layers[0]?.root;

      expect(block).toBeDefined();
      expect(block.children).toHaveLength(2);
      expect(block.children![0].state?.disabled).toBe(true);
      expect(block.children![1].state?.disabled).toBe(true);
    });

    it('should handle tabs with mixed content types', () => {
      const input = `Ts :activeTab [
        tab "Charts" [
          Ln :data,
          Br :data,
          Pi :data
        ],
        tab "Tables" [
          Tb :data1,
          Tb :data2
        ],
        tab "Forms" [
          In :name,
          In :email,
          Bt "Submit"
        ]
      ]`;

      const schema = parseUI(input);
      const block = schema.layers[0]?.root;

      expect(block).toBeDefined();
      expect(block.children).toHaveLength(3);
      expect(block.children![0].children).toHaveLength(3); // Charts
      expect(block.children![1].children).toHaveLength(2); // Tables
      expect(block.children![2].children).toHaveLength(3); // Forms
    });
  });

  describe.skip('Integration with Signals (TODO: fix signal parsing with newlines)', () => {
    it('should parse tabs with signal receive', () => {
      const input = `sig tab
Ts :activeTab <tab [
  tab "Tab 1" [Tx "Content 1"],
  tab "Tab 2" [Tx "Content 2"]
]`;

      const schema = parseUI(input);
      const block = schema.layers[0]?.root;

      expect(block).toBeDefined();
      expect(block.signals?.receive).toBeDefined();
      expect(block.signals?.receive?.name).toBe('tab');
    });

    it('should parse tabs with bidirectional signal', () => {
      const input = `sig tab
Ts :activeTab <>tab [
  tab "Tab 1" [Tx "Content 1"],
  tab "Tab 2" [Tx "Content 2"]
]`;

      const schema = parseUI(input);
      const block = schema.layers[0]?.root;

      expect(block).toBeDefined();
      expect(block.signals?.bidirectional).toBeDefined();
      expect(block.signals?.bidirectional?.name).toBe('tab');
    });
  });

  describe('Variants', () => {
    it('should handle line variant (default)', () => {
      const input = `Ts :activeTab [
        tab "Tab 1" [Tx "Content"]
      ]`;

      const schema = parseUI(input);
      const block = schema.layers[0]?.root;

      expect(block).toBeDefined();
      expect(block.type).toBe('tabs');
      // Default variant is 'line' - no explicit color modifier expected
    });

    it('should handle pills variant via color modifier', () => {
      const input = `Ts :activeTab #pills [
        tab "Tab 1" [Tx "Content"]
      ]`;

      const schema = parseUI(input);
      const block = schema.layers[0]?.root;

      expect(block).toBeDefined();
      expect(block.style?.color).toBe('pills');
    });

    it('should handle boxed variant via color modifier', () => {
      const input = `Ts :activeTab #boxed [
        tab "Tab 1" [Tx "Content"]
      ]`;

      const schema = parseUI(input);
      const block = schema.layers[0]?.root;

      expect(block).toBeDefined();
      expect(block.style?.color).toBe('boxed');
    });
  });

  describe('Complex Example', () => {
    it('should parse complex tabs example from spec', () => {
      const input = `Ts :activeTab [
  tab "Overview" [
    Kp :revenue,
    Kp :orders
  ],
  tab "Details" [Tb :transactions],
  tab "Settings" [Tx "Coming soon"]
]`;

      const schema = parseUI(input);
      const block = schema.layers[0]?.root;

      expect(block).toBeDefined();
      expect(block.type).toBe('tabs');
      expect(block.binding?.kind).toBe('field');
      expect(block.binding?.value).toBe('activeTab');
      expect(block.children).toHaveLength(3);

      // Overview tab
      const overview = block.children![0];
      expect(overview.label).toBe('Overview');
      expect(overview.children).toHaveLength(2);
      expect(overview.children![0].type).toBe('kpi');
      expect(overview.children![0].binding?.value).toBe('revenue');

      // Details tab
      const details = block.children![1];
      expect(details.label).toBe('Details');
      expect(details.children).toHaveLength(1);
      expect(details.children![0].type).toBe('table');

      // Settings tab
      const settings = block.children![2];
      expect(settings.label).toBe('Settings');
      expect(settings.children).toHaveLength(1);
      expect(settings.children![0].type).toBe('text');
    });
  });
});
