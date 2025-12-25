/**
 * Test: 5 Unique LiquidCode Fidelity Modifier Snippets
 *
 * Tests parseUI() and roundtripUI() for:
 * - Low fidelity ($lo)
 * - High fidelity ($hi)
 * - Auto fidelity ($auto)
 * - Skeleton loading ($skeleton)
 * - Deferred loading ($defer)
 *
 * Corrected to use proper function signatures
 */

import { parseUI, compileUI, roundtripUI, parseUIToAST } from './src/compiler/compiler';
import type { LiquidSchema } from './src/compiler/ui-emitter';

interface TestResult {
  name: string;
  snippet: string;
  parsePass: boolean;
  roundtripPass: boolean;
  parseError?: string;
  roundtripError?: string;
  explanation: string;
}

const results: TestResult[] = [];

// ============================================================================
// Snippet 1: Low Fidelity Dashboard Card
// ============================================================================
const snippet1 = `Cd "Sales Dashboard" @src=salesData $lo`;

console.log('\n' + '='.repeat(80));
console.log('SNIPPET 1: Low Fidelity ($lo) Dashboard Card');
console.log('='.repeat(80));
console.log('Input:', JSON.stringify(snippet1));
const result1: TestResult = {
  name: 'Low Fidelity ($lo) Dashboard Card',
  snippet: snippet1,
  parsePass: false,
  roundtripPass: false,
  explanation: 'Card component with low-fidelity rendering (simplified UI)',
};

try {
  const parsed1: LiquidSchema = parseUI(snippet1);
  result1.parsePass = true;
  console.log('Parse: PASS');
  console.log('Schema:', JSON.stringify(parsed1, null, 2));

  try {
    const roundtripped1 = roundtripUI(parsed1);
    result1.roundtripPass = roundtripped1.isEquivalent;
    console.log('Roundtrip: ' + (roundtripped1.isEquivalent ? 'PASS' : 'FAIL'));
    console.log('DSL:', JSON.stringify(roundtripped1.dsl));
    if (!roundtripped1.isEquivalent) {
      console.log('Differences:');
      roundtripped1.differences.forEach(d => console.log('  -', d));
    }
  } catch (error) {
    result1.roundtripError = String(error);
    console.log('Roundtrip: FAIL -', error);
  }
} catch (error) {
  result1.parseError = String(error);
  console.log('Parse: FAIL -', error);
}
results.push(result1);

// ============================================================================
// Snippet 2: High Fidelity Product Grid
// ============================================================================
const snippet2 = `Gd "Featured Products" @columns=4 @src=products :category $hi`;

console.log('\n' + '='.repeat(80));
console.log('SNIPPET 2: High Fidelity ($hi) Product Grid');
console.log('='.repeat(80));
console.log('Input:', JSON.stringify(snippet2));
const result2: TestResult = {
  name: 'High Fidelity ($hi) Product Grid',
  snippet: snippet2,
  parsePass: false,
  roundtripPass: false,
  explanation: 'Grid layout with high-fidelity rendering (full detail images)',
};

try {
  const parsed2: LiquidSchema = parseUI(snippet2);
  result2.parsePass = true;
  console.log('Parse: PASS');
  console.log('Schema:', JSON.stringify(parsed2, null, 2));

  try {
    const roundtripped2 = roundtripUI(parsed2);
    result2.roundtripPass = roundtripped2.isEquivalent;
    console.log('Roundtrip: ' + (roundtripped2.isEquivalent ? 'PASS' : 'FAIL'));
    console.log('DSL:', JSON.stringify(roundtripped2.dsl));
    if (!roundtripped2.isEquivalent) {
      console.log('Differences:');
      roundtripped2.differences.forEach(d => console.log('  -', d));
    }
  } catch (error) {
    result2.roundtripError = String(error);
    console.log('Roundtrip: FAIL -', error);
  }
} catch (error) {
  result2.parseError = String(error);
  console.log('Parse: FAIL -', error);
}
results.push(result2);

// ============================================================================
// Snippet 3: Auto Fidelity Line Chart
// ============================================================================
const snippet3 = `Ln "Revenue Trends" @type=line @src=revenueMetrics :timeRange $auto`;

console.log('\n' + '='.repeat(80));
console.log('SNIPPET 3: Auto Fidelity ($auto) Line Chart');
console.log('='.repeat(80));
console.log('Input:', JSON.stringify(snippet3));
const result3: TestResult = {
  name: 'Auto Fidelity ($auto) Line Chart',
  snippet: snippet3,
  parsePass: false,
  roundtripPass: false,
  explanation: 'Line chart with adaptive fidelity (auto-select based on space)',
};

try {
  const parsed3: LiquidSchema = parseUI(snippet3);
  result3.parsePass = true;
  console.log('Parse: PASS');
  console.log('Schema:', JSON.stringify(parsed3, null, 2));

  try {
    const roundtripped3 = roundtripUI(parsed3);
    result3.roundtripPass = roundtripped3.isEquivalent;
    console.log('Roundtrip: ' + (roundtripped3.isEquivalent ? 'PASS' : 'FAIL'));
    console.log('DSL:', JSON.stringify(roundtripped3.dsl));
    if (!roundtripped3.isEquivalent) {
      console.log('Differences:');
      roundtripped3.differences.forEach(d => console.log('  -', d));
    }
  } catch (error) {
    result3.roundtripError = String(error);
    console.log('Roundtrip: FAIL -', error);
  }
} catch (error) {
  result3.parseError = String(error);
  console.log('Parse: FAIL -', error);
}
results.push(result3);

// ============================================================================
// Snippet 4: Skeleton Loading User Avatar
// ============================================================================
const snippet4 = `Av "User Avatar" @src=currentUser.avatar $skeleton`;

console.log('\n' + '='.repeat(80));
console.log('SNIPPET 4: Skeleton Loading ($skeleton) Avatar');
console.log('='.repeat(80));
console.log('Input:', JSON.stringify(snippet4));
const result4: TestResult = {
  name: 'Skeleton Loading ($skeleton) User Avatar',
  snippet: snippet4,
  parsePass: false,
  roundtripPass: false,
  explanation: 'Avatar component with skeleton loading (animated placeholder)',
};

try {
  const parsed4: LiquidSchema = parseUI(snippet4);
  result4.parsePass = true;
  console.log('Parse: PASS');
  console.log('Schema:', JSON.stringify(parsed4, null, 2));

  try {
    const roundtripped4 = roundtripUI(parsed4);
    result4.roundtripPass = roundtripped4.isEquivalent;
    console.log('Roundtrip: ' + (roundtripped4.isEquivalent ? 'PASS' : 'FAIL'));
    console.log('DSL:', JSON.stringify(roundtripped4.dsl));
    if (!roundtripped4.isEquivalent) {
      console.log('Differences:');
      roundtripped4.differences.forEach(d => console.log('  -', d));
    }
  } catch (error) {
    result4.roundtripError = String(error);
    console.log('Roundtrip: FAIL -', error);
  }
} catch (error) {
  result4.parseError = String(error);
  console.log('Parse: FAIL -', error);
}
results.push(result4);

// ============================================================================
// Snippet 5: Deferred Loading Comments List
// ============================================================================
const snippet5 = `Ls "Community Comments" @limit=10 @src=comments $defer`;

console.log('\n' + '='.repeat(80));
console.log('SNIPPET 5: Deferred Loading ($defer) Comments List');
console.log('='.repeat(80));
console.log('Input:', JSON.stringify(snippet5));
const result5: TestResult = {
  name: 'Deferred Loading ($defer) Comments List',
  snippet: snippet5,
  parsePass: false,
  roundtripPass: false,
  explanation: 'List component with deferred loading (load on scroll/interaction)',
};

try {
  const parsed5: LiquidSchema = parseUI(snippet5);
  result5.parsePass = true;
  console.log('Parse: PASS');
  console.log('Schema:', JSON.stringify(parsed5, null, 2));

  try {
    const roundtripped5 = roundtripUI(parsed5);
    result5.roundtripPass = roundtripped5.isEquivalent;
    console.log('Roundtrip: ' + (roundtripped5.isEquivalent ? 'PASS' : 'FAIL'));
    console.log('DSL:', JSON.stringify(roundtripped5.dsl));
    if (!roundtripped5.isEquivalent) {
      console.log('Differences:');
      roundtripped5.differences.forEach(d => console.log('  -', d));
    }
  } catch (error) {
    result5.roundtripError = String(error);
    console.log('Roundtrip: FAIL -', error);
  }
} catch (error) {
  result5.parseError = String(error);
  console.log('Parse: FAIL -', error);
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
  const status = (result.parsePass && result.roundtripPass) ? 'PASS' : 'FAIL';
  console.log(`\n${index + 1}. ${result.name}`);
  console.log(`   Explanation: ${result.explanation}`);
  console.log(`   Overall: ${status}`);
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
