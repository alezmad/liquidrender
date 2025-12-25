/**
 * Complex LiquidCode Layout Verification Test - FINAL
 *
 * 5 NEW UNIQUE COMPLEX LAYOUT SNIPPETS - ALL VERIFIED
 *
 * Features Demonstrated:
 * ✓ Grid layouts (Gd) with multi-row organization
 * ✓ Stack layouts (Sk) with vertical/horizontal stacking
 * ✓ Split views (Sp) for sidebar + content patterns
 * ✓ Flex modifiers (^r, ^c, ^g, ^f, ^s)
 * ✓ Span modifiers (*h, *f for width control)
 * ✓ Priority modifiers (!h, !p, !s for importance)
 * ✓ Signal management (@signal, <>emit/receive)
 * ✓ Layer interactions (/1, >/1, /<)
 * ✓ Styling and coloring (#red, #yellow)
 * ✓ Child nesting with brackets
 *
 * Test Plan:
 * 1. Parse with parseUI()
 * 2. Verify roundtrip with roundtripUI()
 * 3. Report pass/fail with detailed diagnostics
 */

import { parseUI, roundtripUI, compileUI } from './src/compiler/ui-compiler';

// ============================================================================
// 5 NEW UNIQUE COMPLEX LAYOUT SNIPPETS
// ============================================================================

const complexLayoutSnippets = [
  {
    id: 1,
    name: 'Multi-row Grid with Growing Charts',
    description: 'Grid layout with fixed KPIs and growing chart sections',
    code: `Gd ^r [
  Kp :revenue, Kp :orders
  Ln :trend ^g
  Br :comparison ^g
  Pi :distribution ^g
]`,
    features: ['Gd', '^r', '^g', 'multi-row', 'mixed-types'],
  },

  {
    id: 2,
    name: 'Nested Split with Cascading Stacks',
    description: 'Half-width sidebar with growing stack of analytics',
    code: `Sp *h ^f [
  Dw [Tx "Filters" ^c]
  Sk ^g [
    Br :monthly ^g
    Ln :daily ^g
    Tb :details [:id :amount :date] ^g
  ]
]`,
    features: ['Sp', '*h', '^f', '^c', '^g', 'nested-sk'],
  },

  {
    id: 3,
    name: 'Interactive Responsive Stack',
    description: 'Stack with bidirectional signal binding for filters',
    code: `@filter
Sk [
  Fm ^c [
    In :search <>filter
    Se :category <>filter
    Bt "Apply" >filter
  ]
  Tb :results <filter ^g [:id :name :type]
  Tx "Apply filters to view data" ^c
]`,
    features: ['@signal', '<>', '^c', '^g', 'forms', 'signal-binding'],
  },

  {
    id: 4,
    name: 'Priority-Based Dashboard Grid',
    description: 'Grid with hero section, primary chart, and secondary alerts',
    code: `Gd ^r [
  0 !h ^g [Kp :revenue, Kp :growth, Kp :target]
  Br :monthly !p ^g *f
  Sk !s ^c [
    8 :alert1 #red
    8 :alert2 #yellow
  ]
]`,
    features: ['Gd', '!h', '!p', '!s', '*f', '#color', 'priority-based'],
  },

  {
    id: 5,
    name: 'Advanced Split with List and Layer Modal',
    description: 'Split pane with repeating list and modal interaction layer',
    code: `@edit
Sp ^f [
  Ls :items [8 :.id :.name >item]
  Sk ^g [
    Kp :itemCount
    Tb :itemData [:id :name :status] ^g
  ]
]
/1 9 [
  Fm [
    In :title
    Se :status
    Bt "Save" !submit, Bt "Close" /<
  ]
]`,
    features: ['Sp', 'Ls', '/1', '>/1', '@signal', '^f', '^g', 'complex-interaction'],
  },
];

// ============================================================================
// TEST EXECUTION & REPORTING
// ============================================================================

interface TestResult {
  id: number;
  name: string;
  description: string;
  code: string;
  features: string[];
  parsed: boolean;
  parseError?: string;
  roundtripped: boolean;
  isEquivalent: boolean;
  differences?: string[];
  status: 'PASS' | 'FAIL';
  stats?: {
    signals: number;
    layers: number;
    rootBlocks: number;
  };
}

const results: TestResult[] = [];

console.log('\n');
console.log('╔════════════════════════════════════════════════════════════════════╗');
console.log('║  COMPLEX LIQUIDCODE LAYOUT VERIFICATION TEST SUITE                ║');
console.log('║  Grid • Stack • Split • Flex Modifiers • Signals • Layers        ║');
console.log('╚════════════════════════════════════════════════════════════════════╝');
console.log('\n');

for (const snippet of complexLayoutSnippets) {
  const result: TestResult = {
    id: snippet.id,
    name: snippet.name,
    description: snippet.description,
    code: snippet.code,
    features: snippet.features,
    parsed: false,
    roundtripped: false,
    isEquivalent: false,
    status: 'FAIL',
  };

  console.log(`┌─────────────────────────────────────────────────────────────────────`);
  console.log(`│ Snippet ${snippet.id}: ${snippet.name}`);
  console.log(`├─────────────────────────────────────────────────────────────────────`);
  console.log(`│ ${snippet.description}\n`);
  console.log(`│ Features: ${snippet.features.join(' • ')}\n`);

  try {
    // ─────────────────────────────────────────────────────────────────────
    // PARSE
    // ─────────────────────────────────────────────────────────────────────
    console.log(`│ [PARSE]`);
    const schema = parseUI(snippet.code);
    result.parsed = true;

    const stats = {
      signals: schema.signals?.length || 0,
      layers: schema.layers?.length || 0,
      rootBlocks: schema.layers[0]?.root?.children?.length || 1,
    };
    result.stats = stats;

    console.log(`│   ✓ Success`);
    console.log(`│   ├─ Signals: ${stats.signals}`);
    console.log(`│   ├─ Layers: ${stats.layers}`);
    console.log(`│   └─ Root blocks: ${stats.rootBlocks}\n`);

    // ─────────────────────────────────────────────────────────────────────
    // ROUNDTRIP
    // ─────────────────────────────────────────────────────────────────────
    console.log(`│ [ROUNDTRIP]`);
    const { isEquivalent, differences } = roundtripUI(schema);
    result.roundtripped = true;
    result.isEquivalent = isEquivalent;
    result.differences = differences;

    console.log(`│   ✓ Success`);
    console.log(`│   └─ Equivalent: ${isEquivalent ? 'YES ✓' : 'NO ✗'}\n`);

    // ─────────────────────────────────────────────────────────────────────
    // DIFFERENCES (if any)
    // ─────────────────────────────────────────────────────────────────────
    if (!isEquivalent && differences && differences.length > 0) {
      console.log(`│ [DIFFERENCES] (${differences.length})`);
      differences.forEach((diff, idx) => {
        const isLast = idx === differences.length - 1;
        const prefix = isLast ? '└─' : '├─';
        console.log(`│   ${prefix} ${diff}`);
      });
      console.log();
    }

    // ─────────────────────────────────────────────────────────────────────
    // FINAL STATUS
    // ─────────────────────────────────────────────────────────────────────
    result.status = isEquivalent ? 'PASS' : 'FAIL';
    const statusSymbol = isEquivalent ? '✓' : '✗';
    const statusText = isEquivalent ? 'PASS' : 'FAIL';
    console.log(`└─ ${statusSymbol} ${statusText}\n`);
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    result.parseError = error;
    result.status = 'FAIL';

    console.log(`│ [ERROR]`);
    console.log(`│   ${error}\n`);
    console.log(`└─ ✗ FAIL\n`);
  }

  results.push(result);
}

// ============================================================================
// SUMMARY REPORT
// ============================================================================

const passCount = results.filter((r) => r.status === 'PASS').length;
const failCount = results.filter((r) => r.status === 'FAIL').length;
const totalTests = results.length;

console.log('╔════════════════════════════════════════════════════════════════════╗');
console.log('║                          TEST SUMMARY                             ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

console.log(`  Total Snippets:     ${totalTests}`);
console.log(`  Passed:             ${passCount} (${((passCount / totalTests) * 100).toFixed(1)}%)`);
console.log(`  Failed:             ${failCount} (${((failCount / totalTests) * 100).toFixed(1)}%)`);
console.log('\n');

// ============================================================================
// DETAILED RESULTS TABLE
// ============================================================================

console.log('DETAILED RESULTS');
console.log('─'.repeat(76));

results.forEach((result) => {
  const statusSymbol = result.status === 'PASS' ? '✓' : '✗';
  console.log(`\n  [${result.id}] ${statusSymbol} ${result.name}`);
  console.log(`      ${result.description}\n`);

  if (result.parsed) {
    console.log(`      Parse:      ✓ OK`);
  } else {
    console.log(`      Parse:      ✗ ERROR`);
    console.log(`                  ${result.parseError}`);
  }

  if (result.roundtripped) {
    const equiv = result.isEquivalent ? 'YES ✓' : 'NO ✗';
    console.log(`      Roundtrip:  ✓ OK (Equivalent: ${equiv})`);
  } else if (result.parseError) {
    console.log(`      Roundtrip:  — SKIPPED (parse failed)`);
  }

  if (result.stats) {
    console.log(`      Signals:    ${result.stats.signals}`);
    console.log(`      Layers:     ${result.stats.layers}`);
    console.log(`      Root blocks: ${result.stats.rootBlocks}`);
  }

  if (result.differences && result.differences.length > 0) {
    console.log(`      \n      Differences:`);
    result.differences.slice(0, 3).forEach((d) => {
      console.log(`        • ${d}`);
    });
    if (result.differences.length > 3) {
      console.log(`        ... and ${result.differences.length - 3} more`);
    }
  }
});

// ============================================================================
// FEATURE MATRIX
// ============================================================================

console.log('\n');
console.log('╔════════════════════════════════════════════════════════════════════╗');
console.log('║                      FEATURE COVERAGE MATRIX                       ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

const featureIndex: Record<string, number[]> = {};
results.forEach((result) => {
  result.features.forEach((feature) => {
    if (!featureIndex[feature]) featureIndex[feature] = [];
    featureIndex[feature].push(result.id);
  });
});

const sortedFeatures = Object.entries(featureIndex).sort(([a], [b]) => a.localeCompare(b));

console.log('Layout Types:');
['Gd', 'Sp', 'Sk', 'Ls', 'Dw', 'Fm'].forEach((type) => {
  if (featureIndex[type]) {
    console.log(`  • ${type.padEnd(4)} (Grid, Split, Stack, List, Drawer, Form)  → Snippets ${featureIndex[type].join(', ')}`);
  }
});

console.log('\nFlex Modifiers:');
['^r', '^g', '^c', '^f', '^s'].forEach((mod) => {
  if (featureIndex[mod]) {
    console.log(`  • ${mod.padEnd(4)}                                           → Snippets ${featureIndex[mod].join(', ')}`);
  }
});

console.log('\nOther Modifiers:');
['*h', '*f', '!h', '!p', '!s', '#color', '@signal', '<>', '/1', '>/1', 'signal-binding'].forEach((mod) => {
  if (featureIndex[mod]) {
    console.log(`  • ${mod.padEnd(20)}                         → Snippets ${featureIndex[mod].join(', ')}`);
  }
});

console.log('\nPattern Types:');
['multi-row', 'nested-sk', 'forms', 'priority-based', 'complex-interaction'].forEach((pat) => {
  if (featureIndex[pat]) {
    console.log(`  • ${pat.padEnd(20)}                         → Snippets ${featureIndex[pat].join(', ')}`);
  }
});

// ============================================================================
// FINAL VERDICT
// ============================================================================

console.log('\n');
console.log('═'.repeat(76));

if (passCount === totalTests) {
  console.log(
    `✓ SUCCESS: All ${totalTests} complex layouts verified successfully!`.padStart(78),
  );
  console.log('═'.repeat(76));
  console.log(
    `\n  All snippets passed parse and roundtrip verification with full equivalence.\n`,
  );
} else {
  console.log(
    `⚠ PARTIAL: ${passCount}/${totalTests} complex layouts verified (${((passCount / totalTests) * 100).toFixed(1)}%)`.padStart(85),
  );
  console.log('═'.repeat(76));
  console.log(`\n  ${failCount} snippet(s) have differences or errors.\n`);
}

console.log('═'.repeat(76) + '\n');

// Exit with appropriate code
process.exit(passCount === totalTests ? 0 : 1);
