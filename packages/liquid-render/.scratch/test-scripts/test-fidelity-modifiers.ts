/**
 * Test: 5 Unique LiquidCode Fidelity Modifier Snippets
 *
 * Tests parseUI() and roundtripUI() for:
 * - Low fidelity ($lo)
 * - High fidelity ($hi)
 * - Auto fidelity ($auto)
 * - Skeleton loading ($skeleton)
 * - Deferred loading ($defer)
 */

import { parseUI, roundtripUI } from './src/compiler/compiler';

interface TestResult {
  name: string;
  snippet: string;
  parsePass: boolean;
  roundtripPass: boolean;
  parseError?: string;
  roundtripError?: string;
}

const results: TestResult[] = [];

// ============================================================================
// Snippet 1: Low Fidelity Dashboard
// ============================================================================
const snippet1 = `
signal: dataReady

[ hero-card
  "Sales Dashboard"
  @src=salesData
  $lo
]
`.trim();

console.log('\n=== SNIPPET 1: Low Fidelity Dashboard ===');
console.log('Input:', snippet1);
const result1: TestResult = {
  name: 'Low Fidelity ($lo) Dashboard',
  snippet: snippet1,
  parsePass: false,
  roundtripPass: false,
};

try {
  const parsed1 = parseUI(snippet1);
  result1.parsePass = true;
  console.log('Parse: PASS');
  console.log('AST:', JSON.stringify(parsed1, null, 2));

  try {
    const roundtripped1 = roundtripUI(snippet1);
    result1.roundtripPass = true;
    console.log('Roundtrip: PASS');
    console.log('Output:', roundtripped1);
  } catch (error) {
    result1.roundtripError = String(error);
    console.log('Roundtrip: FAIL', error);
  }
} catch (error) {
  result1.parseError = String(error);
  console.log('Parse: FAIL', error);
}
results.push(result1);

// ============================================================================
// Snippet 2: High Fidelity Product List
// ============================================================================
const snippet2 = `
signal: selectedCategory

[ product-grid
  "Featured Products"
  @columns=4
  @src=products
  :category
  $hi
]
`.trim();

console.log('\n=== SNIPPET 2: High Fidelity Product List ===');
console.log('Input:', snippet2);
const result2: TestResult = {
  name: 'High Fidelity ($hi) Product List',
  snippet: snippet2,
  parsePass: false,
  roundtripPass: false,
};

try {
  const parsed2 = parseUI(snippet2);
  result2.parsePass = true;
  console.log('Parse: PASS');
  console.log('AST:', JSON.stringify(parsed2, null, 2));

  try {
    const roundtripped2 = roundtripUI(snippet2);
    result2.roundtripPass = true;
    console.log('Roundtrip: PASS');
    console.log('Output:', roundtripped2);
  } catch (error) {
    result2.roundtripError = String(error);
    console.log('Roundtrip: FAIL', error);
  }
} catch (error) {
  result2.parseError = String(error);
  console.log('Parse: FAIL', error);
}
results.push(result2);

// ============================================================================
// Snippet 3: Auto Fidelity Analytics Chart
// ============================================================================
const snippet3 = `
signal: timeRange

[ analytics-chart
  "Revenue Trends"
  @type=line
  @src=revenueMetrics
  :timeRange
  $auto
]
`.trim();

console.log('\n=== SNIPPET 3: Auto Fidelity Analytics Chart ===');
console.log('Input:', snippet3);
const result3: TestResult = {
  name: 'Auto Fidelity ($auto) Analytics Chart',
  snippet: snippet3,
  parsePass: false,
  roundtripPass: false,
};

try {
  const parsed3 = parseUI(snippet3);
  result3.parsePass = true;
  console.log('Parse: PASS');
  console.log('AST:', JSON.stringify(parsed3, null, 2));

  try {
    const roundtripped3 = roundtripUI(snippet3);
    result3.roundtripPass = true;
    console.log('Roundtrip: PASS');
    console.log('Output:', roundtripped3);
  } catch (error) {
    result3.roundtripError = String(error);
    console.log('Roundtrip: FAIL', error);
  }
} catch (error) {
  result3.parseError = String(error);
  console.log('Parse: FAIL', error);
}
results.push(result3);

// ============================================================================
// Snippet 4: Skeleton Loading User Profile
// ============================================================================
const snippet4 = `
signal: profileLoading

[ user-profile
  "Member Profile"
  @src=currentUser
  $skeleton
]
`.trim();

console.log('\n=== SNIPPET 4: Skeleton Loading User Profile ===');
console.log('Input:', snippet4);
const result4: TestResult = {
  name: 'Skeleton Loading ($skeleton) User Profile',
  snippet: snippet4,
  parsePass: false,
  roundtripPass: false,
};

try {
  const parsed4 = parseUI(snippet4);
  result4.parsePass = true;
  console.log('Parse: PASS');
  console.log('AST:', JSON.stringify(parsed4, null, 2));

  try {
    const roundtripped4 = roundtripUI(snippet4);
    result4.roundtripPass = true;
    console.log('Roundtrip: PASS');
    console.log('Output:', roundtripped4);
  } catch (error) {
    result4.roundtripError = String(error);
    console.log('Roundtrip: FAIL', error);
  }
} catch (error) {
  result4.parseError = String(error);
  console.log('Parse: FAIL', error);
}
results.push(result4);

// ============================================================================
// Snippet 5: Deferred Loading Comments Section
// ============================================================================
const snippet5 = `
signal: commentsVisible

[ comments-feed
  "Community Comments"
  @limit=10
  @src=comments
  $defer
]
`.trim();

console.log('\n=== SNIPPET 5: Deferred Loading Comments Section ===');
console.log('Input:', snippet5);
const result5: TestResult = {
  name: 'Deferred Loading ($defer) Comments Section',
  snippet: snippet5,
  parsePass: false,
  roundtripPass: false,
};

try {
  const parsed5 = parseUI(snippet5);
  result5.parsePass = true;
  console.log('Parse: PASS');
  console.log('AST:', JSON.stringify(parsed5, null, 2));

  try {
    const roundtripped5 = roundtripUI(snippet5);
    result5.roundtripPass = true;
    console.log('Roundtrip: PASS');
    console.log('Output:', roundtripped5);
  } catch (error) {
    result5.roundtripError = String(error);
    console.log('Roundtrip: FAIL', error);
  }
} catch (error) {
  result5.parseError = String(error);
  console.log('Parse: FAIL', error);
}
results.push(result5);

// ============================================================================
// Summary Report
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('FIDELITY MODIFIER TEST SUMMARY');
console.log('='.repeat(80));

let totalPass = 0;
let parsePassCount = 0;
let roundtripPassCount = 0;

results.forEach((result, index) => {
  const status = (result.parsePass && result.roundtripPass) ? '✓ PASS' : '✗ FAIL';
  console.log(`\n${index + 1}. ${result.name}`);
  console.log(`   Status: ${status}`);
  console.log(`   Parse: ${result.parsePass ? 'PASS' : 'FAIL'}`);
  if (result.parseError) console.log(`     Error: ${result.parseError}`);
  console.log(`   Roundtrip: ${result.roundtripPass ? 'PASS' : 'FAIL'}`);
  if (result.roundtripError) console.log(`     Error: ${result.roundtripError}`);

  if (result.parsePass && result.roundtripPass) totalPass++;
  if (result.parsePass) parsePassCount++;
  if (result.roundtripPass) roundtripPassCount++;
});

console.log('\n' + '-'.repeat(80));
console.log(`Total Tests: ${results.length}`);
console.log(`Full Pass (Parse + Roundtrip): ${totalPass}/${results.length}`);
console.log(`Parse Only: ${parsePassCount}/${results.length}`);
console.log(`Roundtrip Only: ${roundtripPassCount}/${results.length}`);
console.log('='.repeat(80));

// Export results for programmatic use
export { results };
