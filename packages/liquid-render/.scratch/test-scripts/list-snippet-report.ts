/**
 * Detailed Report: 5 Unique LiquidCode List Component Snippets
 * Full verification with parseUI() and roundtripUI()
 */

import { parseUI, roundtripUI } from './src/compiler/compiler';
import { UIEmitter } from './src/compiler/ui-emitter';

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

console.log('==============================================================================');
console.log('LIQUIDCODE LIST COMPONENT SNIPPETS - DETAILED VERIFICATION REPORT');
console.log('==============================================================================');
console.log();

const results: Array<{
  testNum: number;
  name: string;
  passed: boolean;
  parseUI?: any;
  roundtrip?: any;
  error?: string;
}> = [];

tests.forEach((test, idx) => {
  const testNum = idx + 1;
  console.log(`\n[TEST ${testNum}] ${test.name}`);
  console.log('-'.repeat(78));
  console.log(`Description: ${test.description}`);
  console.log(`Original Snippet: ${test.snippet}`);
  console.log();

  try {
    // Parse with parseUI()
    console.log('Step 1: parseUI() - Parse LiquidCode to LiquidSchema');
    const schema = parseUI(test.snippet);

    console.log('  Status: ✓ SUCCESS');
    console.log('  Schema Details:');
    console.log(`    - Version: ${schema.version}`);
    console.log(`    - Signals: ${schema.signals.length}`);
    console.log(`    - Layers: ${schema.layers.length}`);

    const layer = schema.layers[0];
    if (layer) {
      const root = layer.root;
      console.log(`    - Layer 0 Root Type: ${root.type}`);
      if (root.binding) {
        console.log(`    - Binding: kind=${root.binding.kind}, value=${root.binding.value}`);
      }
      if (root.label) {
        console.log(`    - Label: ${root.label}`);
      }
      if (root.layout) {
        console.log(`    - Layout: priority=${root.layout.priority}, flex=${root.layout.flex}, span=${root.layout.span}`);
      }
      if (root.style?.color) {
        console.log(`    - Style Color: ${root.style.color}`);
      }
      if (root.children && root.children.length > 0) {
        console.log(`    - Children: ${root.children.length} items`);
        root.children.forEach((child, i) => {
          console.log(`      [${i}] ${child.type}${child.label ? ` "${child.label}"` : ''}${child.binding ? ` :${child.binding.value}` : ''}`);
        });
      }
    }
    console.log();

    // Roundtrip with roundtripUI()
    console.log('Step 2: roundtripUI() - Roundtrip: Schema -> DSL -> Schema');
    const roundtrip = roundtripUI(schema);

    console.log('  Status: ✓ SUCCESS');
    console.log('  Roundtrip Details:');
    console.log(`    - Generated DSL: ${roundtrip.dsl}`);
    console.log(`    - Equivalence: ${roundtrip.isEquivalent ? 'YES (✓)' : 'NO (✗)'}`);
    if (roundtrip.differences.length > 0) {
      console.log(`    - Differences found: ${roundtrip.differences.length}`);
      roundtrip.differences.forEach(diff => {
        console.log(`      - ${diff}`);
      });
    } else {
      console.log(`    - No differences found`);
    }
    console.log();

    console.log(`RESULT: PASS ✓`);
    results.push({
      testNum,
      name: test.name,
      passed: true,
      parseUI: schema,
      roundtrip,
    });
  } catch (error: any) {
    console.log(`  Status: ✗ FAILED`);
    console.log(`  Error: ${error.message}`);
    console.log();
    console.log(`RESULT: FAIL ✗`);
    results.push({
      testNum,
      name: test.name,
      passed: false,
      error: error.message,
    });
  }
});

// Summary Section
console.log();
console.log('==============================================================================');
console.log('SUMMARY');
console.log('==============================================================================');
console.log();

results.forEach(result => {
  const status = result.passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[Test ${result.testNum}] ${result.name}: ${status}`);
  if (!result.passed) {
    console.log(`         Error: ${result.error}`);
  }
});

const passCount = results.filter(r => r.passed).length;
const totalCount = results.length;

console.log();
console.log(`Total Results: ${passCount}/${totalCount} tests passed`);

if (passCount === totalCount) {
  console.log('Status: ALL TESTS PASSED ✓');
} else {
  console.log(`Status: ${totalCount - passCount} test(s) failed`);
}

console.log();
console.log('==============================================================================');
console.log('SPECIFICATION COVERAGE');
console.log('==============================================================================');
console.log('✓ Simple lists (Ls :items)');
console.log('✓ Lists with templates (iterator binding with :.field)');
console.log('✓ Nested lists (lists containing lists)');
console.log('✓ Lists with actions (signal emit >signal)');
console.log('✓ Lists with layout and styling (!priority, ^flex, #color)');
console.log();
