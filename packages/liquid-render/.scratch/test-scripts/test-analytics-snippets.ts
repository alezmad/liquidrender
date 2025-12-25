/**
 * Analytics Dashboard Snippets - Roundtrip Verification
 *
 * Tests 5 unique LiquidCode snippets for analytics dashboards with:
 * - KPIs with streaming modifiers (~5s, ~ws://)
 * - Charts with fidelity modifiers ($lo, $hi)
 * - Signal-bound components
 * - Nested layouts with conditionals
 */

import { parseUI, roundtripUI } from './src/compiler/compiler';

// ============================================================================
// 5 Unique Analytics Snippets
// ============================================================================

const snippets = [
  // Snippet 1: Real-time KPI Dashboard with WebSocket streaming
  `@revenue @orders
Kp :revenue ~ws://api.metrics/revenue $hi, Kp :orders ~ws://api.metrics/orders $hi
Kp :conversion ~5s
>revenue=peak: Tx "Revenue Peak Alert" #ff0000`,

  // Snippet 2: Multi-axis charts with fidelity levels and signal binding
  `@timeRange @selectedCategory
Ln :date :sales $lo @timeRange
Br :category :volume $hi
?selectedCategory=electronics: Ln :date :electronics_sales`,

  // Snippet 3: Nested analytics dashboard with conditional visibility
  `@dashboardMode
/1 [
  Kp :daily_active_users ~2s, Kp :session_count ~2s, Kp :bounce_rate ~2s
  Ln :hour :transactions $lo
  Hm :user_id :feature_usage $hi
]
?dashboardMode=summary: Kp :total_users ~5s`,

  // Snippet 4: Complex form-based analytics with layered components
  `@filters @resultMode
Fm [
  Se :metric_type, Dt :start_date, Dt :end_date
  Bt "Apply Filters" >filters
]
?resultMode=table: Tb :results [:date :metric :value]
?resultMode=chart: Br :date :metric $lo`,

  // Snippet 5: Signal-bound competitive intelligence dashboard
  `@competitor @compareMode
Gd [
  Kp :market_share ~ws://live/competitor1 $hi
  Kp :revenue_growth ~ws://live/competitor2 $hi
  Kp :customer_satisfaction ~5s
  Ln :month :market_share >competitor <compareMode
]
<>competitor: Tb :competitor_data [:rank :score :trend]`,
];

// ============================================================================
// Roundtrip Verification
// ============================================================================

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║  Analytics Dashboard Snippets - Roundtrip Verification Test   ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let passCount = 0;
let failCount = 0;

for (let i = 0; i < snippets.length; i++) {
  const snippet = snippets[i];
  const snippetNum = i + 1;

  console.log(`\n[SNIPPET ${snippetNum}]`);
  console.log('─'.repeat(70));
  console.log('Source:');
  console.log(snippet);
  console.log('');

  try {
    // Parse the snippet to schema
    console.log('→ Parsing with parseUI()...');
    const schema = parseUI(snippet);

    console.log(`  ✓ Parsed successfully`);
    console.log(`    - Signals: ${schema.signals.length}`);
    console.log(`    - Layers: ${schema.layers.length}`);

    // Roundtrip: schema -> DSL -> schema
    console.log('→ Roundtripping with roundtripUI()...');
    const { dsl, isEquivalent, differences } = roundtripUI(schema);

    if (isEquivalent) {
      console.log(`  ✓ PASS - Roundtrip equivalent`);
      console.log(`    Generated DSL:`);
      dsl.split('\n').forEach(line => console.log(`      ${line}`));
      passCount++;
    } else {
      console.log(`  ✗ FAIL - Roundtrip mismatch`);
      console.log(`    Differences:`);
      differences.forEach(diff => console.log(`      - ${diff}`));
      failCount++;
    }
  } catch (e) {
    console.log(`  ✗ FAIL - Parse error`);
    console.log(`    Error: ${e instanceof Error ? e.message : String(e)}`);
    if (e instanceof Error && e.stack) {
      console.log(`    Stack: ${e.stack.split('\n').slice(0, 3).join('\n    ')}`);
    }
    failCount++;
  }
}

// ============================================================================
// Summary Report
// ============================================================================

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║  SUMMARY REPORT                                              ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');
console.log(`Total Snippets:  ${snippets.length}`);
console.log(`Passed:          ${passCount}`);
console.log(`Failed:          ${failCount}`);
console.log(`Pass Rate:       ${((passCount / snippets.length) * 100).toFixed(1)}%`);
console.log(`\nStatus: ${failCount === 0 ? '✓ ALL TESTS PASSED' : `✗ ${failCount} TEST(S) FAILED`}`);
console.log();
