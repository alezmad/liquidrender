// Test Chart Snippets - 5 unique visualization types
// This tests parseUI() and roundtripUI() for chart components

import { parseUI, roundtripUI } from './src/compiler/compiler';

const snippets = [
  // 1. Line chart with dual Y axes (revenue and orders over months)
  `Ln :month :revenue :orders`,

  // 2. Bar chart with colors by category (sales by region)
  `Br :region :sales #region`,

  // 3. Pie chart with labels and percentages (market share)
  `Pi :segment :share "Market Share"`,

  // 4. Heatmap with intensity values (user activity by day/hour)
  `Hm :day :hour :intensity`,

  // 5. Gauge chart showing progress/performance metric
  `Gn :score "Performance Score"`,
];

console.log('Testing 5 LiquidCode Chart Snippets\n' +
  '====================================\n');

const results: { snippet: string; status: 'PASS' | 'FAIL'; details: string }[] = [];

for (const snippet of snippets) {
  console.log(`\nSnippet: "${snippet}"`);

  try {
    // Step 1: Parse the snippet
    const schema = parseUI(snippet);
    console.log('  ✓ parseUI() succeeded');

    // Step 2: Roundtrip test
    const { isEquivalent, differences, dsl } = roundtripUI(schema);

    if (isEquivalent) {
      console.log('  ✓ roundtripUI() PASSED - schema is equivalent');
      console.log(`    Regenerated DSL: "${dsl}"`);
      results.push({ snippet, status: 'PASS', details: 'Perfect roundtrip' });
    } else {
      console.log('  ✗ roundtripUI() FAILED - differences found:');
      differences.forEach(diff => console.log(`    - ${diff}`));
      results.push({ snippet, status: 'FAIL', details: differences.join('; ') });
    }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.log(`  ✗ ERROR: ${errorMsg}`);
    results.push({ snippet, status: 'FAIL', details: errorMsg });
  }
}

// Summary report
console.log('\n\n' +
  '====================================\n' +
  'TEST SUMMARY\n' +
  '====================================\n');

const passCount = results.filter(r => r.status === 'PASS').length;
const failCount = results.filter(r => r.status === 'FAIL').length;

console.log(`Total: ${snippets.length} | Pass: ${passCount} | Fail: ${failCount}\n`);

results.forEach((r, i) => {
  const icon = r.status === 'PASS' ? '✓' : '✗';
  console.log(`${i + 1}. [${icon}] ${r.status}`);
  console.log(`   Snippet: "${r.snippet}"`);
  console.log(`   Details: ${r.details}\n`);
});

// Export results as JSON for CI/CD
console.log('\nJSON Results:');
console.log(JSON.stringify(results, null, 2));
