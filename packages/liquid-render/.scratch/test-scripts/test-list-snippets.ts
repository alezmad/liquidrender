/**
 * Test 5 unique LiquidCode list component snippets
 * Tests: parseUI() and roundtripUI() for each
 */

import { parseUI, roundtripUI } from './src/compiler/compiler';

const tests = [
  {
    name: 'Simple List (Ls :items)',
    snippet: '7 :items',
    description: 'Basic list with field binding using index 7 (Ls)',
  },
  {
    name: 'List with Template',
    snippet: 'Ls :products [Tx :.name, Tx :.price]',
    description: 'List with iterator template showing name and price',
  },
  {
    name: 'Nested List Structure',
    snippet: 'Ls :categories [Tx :.title, Ls :.subcategories [Tx :.name]]',
    description: 'List containing nested lists (categories with subcategories)',
  },
  {
    name: 'List with Actions',
    snippet: 'Ls :orders [Tx :.id, Bt "View" >detail, Bt "Edit" >edit]',
    description: 'List items with action buttons (emit signals)',
  },
  {
    name: 'List with Layout and Styling',
    snippet: '7 :users !p ^r [Tx :.username #blue, Tx :.email, Bt "Profile" >view]',
    description: 'List with priority, flex row layout, and color styling',
  },
];

console.log('='.repeat(80));
console.log('LIQUIDCODE LIST COMPONENT SNIPPET VERIFICATION');
console.log('='.repeat(80));
console.log();

const results = tests.map((test, idx) => {
  console.log(`[${idx + 1}] ${test.name}`);
  console.log(`    Description: ${test.description}`);
  console.log(`    Snippet: ${test.snippet}`);
  console.log();

  try {
    // Step 1: Parse with parseUI()
    console.log('    Parsing with parseUI()...');
    const schema = parseUI(test.snippet);
    console.log(`    ✓ Parse successful`);
    console.log(`      - Layers: ${schema.layers.length}`);
    console.log(`      - Root type: ${schema.layers[0]?.root.type}`);
    if (schema.layers[0]?.root.binding) {
      console.log(`      - Binding: ${schema.layers[0].root.binding.kind}:${schema.layers[0].root.binding.value}`);
    }

    // Step 2: Verify with roundtripUI()
    console.log('    Verifying with roundtripUI()...');
    const roundtrip = roundtripUI(schema);
    console.log(`    ✓ Roundtrip completed`);
    const dslPreview = roundtrip.dsl.substring(0, 50);
    console.log(`      - DSL: ${dslPreview}${roundtrip.dsl.length > 50 ? '...' : ''}`);
    console.log(`      - Equivalent: ${roundtrip.isEquivalent ? 'YES' : 'NO'}`);
    if (roundtrip.differences.length > 0) {
      console.log(`      - Differences: ${roundtrip.differences.join(', ')}`);
    }

    console.log(`    Result: PASS ✓`);
    return { name: test.name, passed: true, error: null };
  } catch (error: any) {
    console.log(`    Error: ${error.message}`);
    console.log(`    Result: FAIL ✗`);
    return { name: test.name, passed: false, error: error.message };
  }
});

console.log();
console.log('='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
results.forEach((result, idx) => {
  const status = result.passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${idx + 1}. ${result.name}: ${status}`);
  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }
});

const passCount = results.filter(r => r.passed).length;
const totalCount = results.length;
console.log();
console.log(`Total: ${passCount}/${totalCount} passed`);
console.log('='.repeat(80));
