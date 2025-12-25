import { describe, it, expect } from 'vitest';
import { parseUI, roundtripUI } from './src/compiler/compiler';

describe('LiquidCode Modal & Layer Snippets', () => {
  // Test: Generate and verify 5 NEW unique LiquidCode snippets for MODALS & LAYERS
  // Each snippet demonstrates modals with triggers, layers, and drawer interactions

  const testCases = [
    {
      id: 1,
      name: 'Modal with button trigger and layer 1',
      snippet: 'Bt "Open Modal" >/1 /1 9 "Confirm Action" [Bt "Yes" !submit, Bt "Cancel" /<]',
    },
    {
      id: 2,
      name: 'Drawer panel with close trigger (layer 2)',
      snippet: 'Bt "Show Drawer" >/2 /2 Cn [Tx "Drawer Content", Bt "Close" /<]',
    },
    {
      id: 3,
      name: 'Multi-layer modal cascade (layer 1 and 2)',
      snippet: '/1 Cn [Tx "Modal 1", Bt "Nested" >/2] /2 9 "Modal 2" [Bt "Back" /<]',
    },
    {
      id: 4,
      name: 'Modal with signal control and layer close',
      snippet: '@modal Bt "Edit" >modal=open /1 Cn <modal [Tx "Edit Form", Bt "Save" !submit]',
    },
    {
      id: 5,
      name: 'Sheet-style modal with content and close button (layer 3)',
      snippet: 'Bt "Show Sheet" >/3 /3 Cn ^r [Tx "Sheet Title", Tx "Content", Bt "Dismiss" /<]',
    },
  ];

  testCases.forEach(({ id, name, snippet }) => {
    it(`Snippet ${id}: ${name}`, () => {
      // Step 1: Parse with parseUI()
      const schema = parseUI(snippet);

      // Schema should be valid
      expect(schema).toBeDefined();
      expect(schema.version).toBe('1.0');
      expect(schema.layers).toBeDefined();
      expect(Array.isArray(schema.layers)).toBe(true);

      // Step 2: Verify roundtrip with roundtripUI()
      const { isEquivalent, differences, reconstructed } = roundtripUI(schema);

      // Step 3: Report pass/fail
      if (!isEquivalent) {
        console.log(`\nSnippet ${id} differences:`, differences);
      }

      expect(isEquivalent).toBe(true);
      expect(differences).toHaveLength(0);
      expect(reconstructed).toBeDefined();
      expect(reconstructed.version).toBe('1.0');
    });
  });
});
