/**
 * Complex LiquidCode Layout Verification Test - Version 2
 *
 * 5 UNIQUE COMPLEX LAYOUT SNIPPETS - All Verified
 *
 * Features Demonstrated:
 * - Grid layouts (Gd) with multi-row organization
 * - Stack layouts (Sk) with vertical/horizontal stacking
 * - Split views (Sp) for sidebar + content patterns
 * - Flex modifiers (^r, ^c, ^g, ^f, ^s)
 * - Span modifiers (*h, *f for width control)
 * - Priority modifiers (!h, !p, !s for importance)
 * - Signal management (@signal, <>emit/receive)
 * - Layer interactions (/1, >/1, /<)
 * - Styling and coloring (#red, #yellow)
 * - Child nesting with brackets
 *
 * For each snippet:
 * 1. Parse with parseUI()
 * 2. Verify roundtrip with roundtripUI()
 * 3. Report pass/fail with detailed diagnostics
 */

import { parseUI, roundtripUI, compileUI } from './src/compiler/ui-compiler';

// ============================================================================
// 5 UNIQUE COMPLEX LAYOUT SNIPPETS
// ============================================================================

const complexLayoutSnippets = [
  // ─────────────────────────────────────────────────────────────────────
  // Snippet 1: MULTI-ROW GRID DASHBOARD WITH FLEX GROWTH
  // ─────────────────────────────────────────────────────────────────────
  // Demonstrates:
  // - Gd (Grid) layout with flex row mode (^r)
  // - Mixed child types: KPIs (fixed), Charts (grow)
  // - Flex modifiers (^g for growth)
  {
    name: 'Multi-row Grid Dashboard',
    code: `Gd ^r [
  Kp :revenue, Kp :orders
  Ln :trend ^g
  Br :comparison ^g
  Pi :distribution ^g
]`,
    description: 'Grid with 2 KPIs in first row, 3 growing charts below',
  },

  // ─────────────────────────────────────────────────────────────────────
  // Snippet 2: NESTED SPLIT VIEW WITH CASCADING STACKS
  // ─────────────────────────────────────────────────────────────────────
  // Demonstrates:
  // - Sp (Split pane) with half-width fixed sidebar (*h ^f)
  // - Nested Sk (Stack) with growing content (^g)
  // - Multiple chart types in stack
  {
    name: 'Split View with Cascading Stacks',
    code: `Sp *h ^f [
  Dw [Tx "Sidebar" ^c]
  Sk ^g [
    Br :monthly ^g
    Ln :daily ^g
    Tb :details [:id :amount :date] ^g
  ]
]`,
    description: 'Fixed sidebar + growing stack of charts and table',
  },

  // ─────────────────────────────────────────────────────────────────────
  // Snippet 3: STACK WITH SIGNALS AND CONDITIONAL RENDERING
  // ─────────────────────────────────────────────────────────────────────
  // Demonstrates:
  // - Signal declaration (@filter)
  // - Bidirectional binding (<>filter)
  // - Input with signal binding
  // - Stack organization (Sk)
  // - Collapse flex modifier (^c)
  {
    name: 'Interactive Stack with Signals',
    code: `@filter
Sk [
  Fm ^c [
    In :search <>filter
    Se :status <>filter
  ]
  Tb :results <filter ^g [:id :name :status]
  Tx "No results shown" ^c
]`,
    description: 'Stack with form inputs (bidirectional) and table (receiving)',
  },

  // ─────────────────────────────────────────────────────────────────────
  // Snippet 4: PRIORITY-BASED GRID WITH MIXED FLEX MODES
  // ─────────────────────────────────────────────────────────────────────
  // Demonstrates:
  // - Grid with flex row mode (^r)
  // - Priority modifiers (!h = hero, !p = primary, !s = secondary)
  // - Full-width span (*f)
  // - Color styling (#red, #yellow)
  // - Nested container (0) with children
  {
    name: 'Priority Dashboard Grid',
    code: `Gd ^r [
  0 !h ^g [Kp :revenue, Kp :growth, Kp :target]
  Br :sales !p ^g *f
  Sk !s ^c [
    8 :alert1 #red
    8 :alert2 #yellow
    Tx "Warnings" ^c
  ]
]`,
    description: 'Grid with priority levels, hero section, and alert stack',
  },

  // ─────────────────────────────────────────────────────────────────────
  // Snippet 5: SPLIT WITH LIST AND MODAL LAYER INTERACTION
  // ─────────────────────────────────────────────────────────────────────
  // Demonstrates:
  // - Sp (Split) layout
  // - Ls (List) with repeating items and nesting
  // - Layer definition (/1) with modal (9)
  // - Layer triggers (>/1)
  // - Form with multiple controls
  // - Flex modifiers (^f fixed, ^g grow, ^s shrink)
  {
    name: 'Split List with Modal Editor',
    code: `@edit
Sp ^f [
  Ls :users [
    Tx :.name "Details" >/1 ^s
  ]
  Sk ^g [
    Tb :userData [:id :name :email] ^g
    Pg :progress ^c
  ]
]
/1 9 [
  Fm [
    In :firstName
    In :lastName
    In :email
    Se :role
    Bt "Save" !submit, Bt "Cancel" /<
  ]
]`,
    description: 'Split pane with list (fixed) + content (grow) + modal',
  },
];

// ============================================================================
// TEST EXECUTION
// ============================================================================

interface TestResult {
  index: number;
  name: string;
  description: string;
  code: string;
  parsed: boolean;
  parseError?: string;
  roundtripped: boolean;
  isEquivalent: boolean;
  differences?: string[];
  roundtripError?: string;
  status: 'PASS' | 'FAIL';
  compiledDsl?: string;
}

const results: TestResult[] = [];

console.log('\n');
console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║     COMPLEX LIQUIDCODE LAYOUT VERIFICATION TEST SUITE            ║');
console.log('║          Grid • Stack • Split • Flex Modifiers                    ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝');
console.log('\n');

for (let i = 0; i < complexLayoutSnippets.length; i++) {
  const snippet = complexLayoutSnippets[i];
  const result: TestResult = {
    index: i + 1,
    name: snippet.name,
    description: snippet.description,
    code: snippet.code,
    parsed: false,
    roundtripped: false,
    isEquivalent: false,
    status: 'FAIL',
  };

  console.log(`┌─ Snippet ${i + 1}: ${snippet.name}`);
  console.log(`│  ${snippet.description}\n`);

  try {
    // Step 1: Parse the snippet
    console.log(`  [PARSE]`);
    const schema = parseUI(snippet.code);
    result.parsed = true;
    console.log(`    ✓ Parsed successfully`);
    console.log(`    • Signals: ${schema.signals?.length || 0}`);
    console.log(`    • Layers: ${schema.layers?.length || 0}`);
    console.log(`    • Root blocks: ${schema.layers[0]?.root?.children?.length || 1}\n`);

    // Step 2: Roundtrip - compile and re-parse
    console.log(`  [ROUNDTRIP]`);
    const { isEquivalent, differences, dsl: recompiledDsl } = roundtripUI(schema);
    result.roundtripped = true;
    result.isEquivalent = isEquivalent;
    result.differences = differences;
    result.compiledDsl = recompiledDsl;

    console.log(`    ✓ Roundtripped`);
    console.log(`    • Equivalence: ${isEquivalent ? 'YES' : 'NO'}\n`);

    // Report differences if any
    if (!isEquivalent && differences && differences.length > 0) {
      console.log(`  [DIFFERENCES]`);
      differences.forEach((diff) => {
        console.log(`    • ${diff}`);
      });
      console.log();
    }

    // Step 3: Set final status
    result.status = isEquivalent ? 'PASS' : 'FAIL';
    const statusSymbol = isEquivalent ? '✓' : '✗';
    console.log(`└─ ${statusSymbol} ${result.status}\n`);
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    result.parseError = error;
    result.roundtripped = false;
    result.status = 'FAIL';
    console.log(`  [ERROR]`);
    console.log(`    ${error}\n`);
    console.log(`└─ ✗ FAIL\n`);
  }

  results.push(result);
}

// ============================================================================
// SUMMARY REPORT
// ============================================================================

const passCount = results.filter((r) => r.status === 'PASS').length;
const failCount = results.filter((r) => r.status === 'FAIL').length;

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║                        TEST SUMMARY                              ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

console.log(`Total Snippets:     ${results.length}`);
console.log(`Passed:             ${passCount} (${((passCount / results.length) * 100).toFixed(1)}%)`);
console.log(`Failed:             ${failCount} (${((failCount / results.length) * 100).toFixed(1)}%)`);
console.log('\n');

console.log('DETAILED RESULTS');
console.log('─'.repeat(73));

results.forEach((result) => {
  const statusSymbol = result.status === 'PASS' ? '✓' : '✗';
  const statusColor = result.status === 'PASS' ? '✓ PASS' : '✗ FAIL';

  console.log(`\n[${result.index}] ${statusColor} - ${result.name}`);
  console.log(`    ${result.description}\n`);

  if (result.parsed) {
    console.log(`    Parse:      OK`);
  } else {
    console.log(`    Parse:      ERROR - ${result.parseError}`);
  }

  if (result.roundtripped) {
    console.log(`    Roundtrip:  OK (Equivalent: ${result.isEquivalent ? 'YES' : 'NO'})`);
  } else if (result.roundtripError) {
    console.log(`    Roundtrip:  ERROR - ${result.roundtripError}`);
  }

  if (result.differences && result.differences.length > 0) {
    console.log(`\n    Differences (${result.differences.length}):`);
    result.differences.forEach((d) => {
      console.log(`      • ${d}`);
    });
  }
});

console.log('\n' + '═'.repeat(73));
console.log(`FINAL RESULT: ${passCount}/${results.length} complex layouts verified successfully`);
console.log('═'.repeat(73) + '\n');

// ============================================================================
// DETAILED BREAKDOWN BY FEATURE
// ============================================================================

console.log('FEATURE COVERAGE');
console.log('─'.repeat(73));
console.log('\nLayout Types Used:');
console.log('  • Grid (Gd):           Snippets 1, 4');
console.log('  • Stack (Sk):          Snippets 2, 3, 4, 5');
console.log('  • Split (Sp):          Snippets 2, 5');
console.log('  • Drawer (Dw):         Snippet 2');
console.log('  • Form (Fm):           Snippets 3, 5');
console.log('  • List (Ls):           Snippet 5');
console.log('  • Modal (9):           Snippet 5');

console.log('\nFlex Modifiers Used:');
console.log('  • ^r (flex row):       Snippets 1, 4');
console.log('  • ^g (grow):           Snippets 1, 2, 3, 4, 5');
console.log('  • ^c (collapse):       Snippets 3, 4, 5');
console.log('  • ^f (fixed):          Snippets 2, 5');
console.log('  • ^s (shrink):         Snippet 5');

console.log('\nAdditional Modifiers:');
console.log('  • Priority (!h, !p, !s):     Snippet 4');
console.log('  • Span (*h, *f):             Snippets 2, 4');
console.log('  • Color (#red, #yellow):     Snippet 4');
console.log('  • Signals (@, <>):           Snippets 3, 5');
console.log('  • Layers (/1, >/1, /<):      Snippet 5');

console.log('\n' + '═'.repeat(73) + '\n');

// Exit with appropriate code
process.exit(passCount === results.length ? 0 : 1);
