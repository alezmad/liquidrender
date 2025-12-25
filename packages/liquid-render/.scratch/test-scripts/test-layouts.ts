/**
 * Complex LiquidCode Layout Verification Test
 *
 * Tests 5 unique complex layout snippets using:
 * - Grid layouts (Gd)
 * - Stack layouts (Sk)
 * - Split views (Sp)
 * - Flex modifiers (^r, ^c, ^g)
 *
 * For each snippet:
 * 1. Parse with parseUI()
 * 2. Verify roundtrip with roundtripUI()
 * 3. Report pass/fail
 */

import { parseUI, roundtripUI, compileUI } from './src/compiler/ui-compiler';

// ============================================================================
// 5 Unique Complex Layout Snippets
// ============================================================================

const snippets = [
  // Snippet 1: Multi-row Grid with Flex Growth
  // Grid with 2 KPIs (fixed), 1 chart (grows), organized in rows
  `Gd ^r [
    Kp :revenue, Kp :orders
    Ln :trend ^g
  ]`,

  // Snippet 2: Nested Split View with Stack
  // Sidebar (fixed) + main content (grows) with stacked charts
  `Sp *h ^f [
    Dw [Tx "Filters" ^c]
    Sk ^g [
      Br :sales ^g
      Ln :growth ^g
      Pi :distribution ^g
    ]
  ]`,

  // Snippet 3: Stack Layout with Conditional Visibility
  // Vertical stack with form and table, using signals
  `@filter
  Sk [
    Fm ^c [
      In :search <>filter
      Se :status <>filter
      Bt "Apply" >filter
    ]
    Tb :results <filter ^g
    Tx "No results" ^c
  ]`,

  // Snippet 4: Complex Grid Dashboard with Priority and Flex
  // Hero section + supporting cards, using priorities and flex
  `Gd ^r [
    0 !h ^g [Kp :revenue, Kp :growth, Kp :target]
    Br :monthly !p ^g *f
    Sk !s ^c [
      8 :alert1 #red
      8 :alert2 #yellow
    ]
  ]`,

  // Snippet 5: Split View with Drawer and Cascading Modals
  // Complex interaction pattern with layers
  `@edit
  Sp ^f [
    Ls :users [
      8 :.name "Edit" >/1 ^s
    ]
    Sk ^g [
      Tb :selectedData [:id :name :email] ^g
      Pg :progress ^c
    ]
  ]
  /1 9 "Edit User" [
    Fm [
      In :name
      In :email
      Se :role
      Bt "Save" !submit, Bt "Cancel" /<
    ]
  ]`,
];

// ============================================================================
// Test Execution
// ============================================================================

interface TestResult {
  index: number;
  snippet: string;
  parsed: boolean;
  parseError?: string;
  roundtripped: boolean;
  isEquivalent: boolean;
  differences?: string[];
  roundtripError?: string;
  status: 'PASS' | 'FAIL';
}

const results: TestResult[] = [];

console.log('=====================================================================');
console.log('Complex Layout Verification Test Suite');
console.log('=====================================================================\n');

for (let i = 0; i < snippets.length; i++) {
  const s = snippets[i];
  const result: TestResult = {
    index: i + 1,
    snippet: s,
    parsed: false,
    roundtripped: false,
    isEquivalent: false,
    status: 'FAIL',
  };

  try {
    // Step 1: Parse the snippet
    console.log(`[${i + 1}] Parsing snippet...`);
    const schema = parseUI(s);
    result.parsed = true;
    console.log('    ✓ Parsed successfully');

    // Step 2: Roundtrip - compile back to DSL and re-parse
    console.log(`[${i + 1}] Roundtripping...`);
    const { isEquivalent, differences, dsl: recompiledDsl } = roundtripUI(schema);
    result.roundtripped = true;
    result.isEquivalent = isEquivalent;
    result.differences = differences;
    console.log(`    ✓ Roundtripped: ${isEquivalent ? 'EQUIVALENT' : 'DIFFERS'}`);

    if (!isEquivalent && differences && differences.length > 0) {
      console.log(`    Differences found:`);
      differences.slice(0, 3).forEach((diff) => {
        console.log(`      - ${diff}`);
      });
      if (differences.length > 3) {
        console.log(`      ... and ${differences.length - 3} more`);
      }
    }

    // Step 3: Report status
    if (isEquivalent) {
      result.status = 'PASS';
      console.log(`[${i + 1}] ✓ PASS\n`);
    } else {
      result.status = 'FAIL';
      console.log(`[${i + 1}] ✗ FAIL (roundtrip not equivalent)\n`);
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    result.parseError = error;
    result.roundtripped = false;
    result.status = 'FAIL';
    console.log(`[${i + 1}] ✗ FAIL`);
    console.log(`    Error: ${error}\n`);
  }

  results.push(result);
}

// ============================================================================
// Summary Report
// ============================================================================

console.log('=====================================================================');
console.log('Test Summary');
console.log('=====================================================================\n');

const passCount = results.filter((r) => r.status === 'PASS').length;
const failCount = results.filter((r) => r.status === 'FAIL').length;

console.log(`Total Snippets: ${results.length}`);
console.log(`Passed: ${passCount} (${((passCount / results.length) * 100).toFixed(1)}%)`);
console.log(`Failed: ${failCount} (${((failCount / results.length) * 100).toFixed(1)}%)\n`);

console.log('Detailed Results:');
console.log('─'.repeat(70));

results.forEach((result) => {
  const statusSymbol = result.status === 'PASS' ? '✓' : '✗';
  console.log(`\n[${result.index}] ${statusSymbol} ${result.status}`);
  console.log(`Snippet: ${result.snippet.split('\n')[0]}...`);

  if (result.parsed) {
    console.log('Parse: OK');
  } else {
    console.log(`Parse: FAIL - ${result.parseError}`);
  }

  if (result.roundtripped) {
    console.log(`Roundtrip: OK (Equivalent: ${result.isEquivalent ? 'YES' : 'NO'})`);
  } else if (result.roundtripError) {
    console.log(`Roundtrip: FAIL - ${result.roundtripError}`);
  }

  if (result.differences && result.differences.length > 0) {
    console.log(`Differences (${result.differences.length}):`);
    result.differences.slice(0, 2).forEach((d) => {
      console.log(`  • ${d}`);
    });
  }
});

console.log('\n' + '═'.repeat(70));
console.log(`FINAL RESULT: ${passCount}/${results.length} snippets passed`);
console.log('═'.repeat(70));

// Exit with appropriate code
process.exit(passCount === results.length ? 0 : 1);
