/**
 * Span Modifiers Verification Test
 *
 * Generates and verifies 5 unique LiquidCode snippets with SPAN MODIFIERS
 * - Numeric spans (*2, *3)
 * - Full span (*f)
 * - Half span (*h)
 * - Quarter span (*q)
 *
 * For each snippet:
 * 1. Parse with parseUI()
 * 2. Verify with roundtripUI()
 * 3. Report pass/fail
 */

import { parseUI, roundtripUI } from '../src/compiler/compiler';

interface TestCase {
  name: string;
  source: string;
  description: string;
}

// Define 5 unique test cases covering all span modifiers
const testCases: TestCase[] = [
  {
    name: 'SPAN-001: Numeric Span *2',
    source: 'Kp :revenue *2',
    description: 'KPI with 2-column span modifier'
  },
  {
    name: 'SPAN-002: Numeric Span *3',
    source: 'Br :categories :values *3',
    description: 'Bar chart with 3-column span modifier'
  },
  {
    name: 'SPAN-003: Full Span *f',
    source: 'Tb :transactions [:date, :amount, :status] *f',
    description: 'Table with full-width span modifier'
  },
  {
    name: 'SPAN-004: Half Span *h',
    source: 'Ln :month :revenue *h',
    description: 'Line chart with half-width span modifier'
  },
  {
    name: 'SPAN-005: Quarter Span *q',
    source: 'Bt "Submit" *q',
    description: 'Button with quarter-width span modifier'
  }
];

interface TestResult {
  testCase: TestCase;
  parseSuccess: boolean;
  parseError?: string;
  schema?: any;
  roundtripSuccess: boolean;
  roundtripError?: string;
  dsl?: string;
  reconstructed?: any;
  differences?: string[];
}

const results: TestResult[] = [];

console.log('\n' + '='.repeat(80));
console.log('SPAN MODIFIERS VERIFICATION TEST');
console.log('='.repeat(80) + '\n');

// Test each case
for (const testCase of testCases) {
  console.log(`Testing: ${testCase.name}`);
  console.log(`Description: ${testCase.description}`);
  console.log(`Source: "${testCase.source}"`);
  console.log('-'.repeat(80));

  const result: TestResult = {
    testCase,
    parseSuccess: false,
    roundtripSuccess: false,
  };

  // Step 1: Parse with parseUI()
  try {
    const schema = parseUI(testCase.source);
    result.schema = schema;
    result.parseSuccess = true;
    console.log('✓ parseUI() PASSED');

    // Log the parsed structure
    if (schema.layers.length > 0) {
      const rootBlock = schema.layers[0].root;
      console.log(`  - Block type: ${rootBlock.type}`);
      console.log(`  - Layout span: ${rootBlock.layout?.span || 'none'}`);
      if (rootBlock.binding) {
        console.log(`  - Binding: ${rootBlock.binding.value}`);
      }
    }
  } catch (error) {
    result.parseSuccess = false;
    result.parseError = error instanceof Error ? error.message : String(error);
    console.log(`✗ parseUI() FAILED: ${result.parseError}`);
  }

  // Step 2: Roundtrip with roundtripUI()
  if (result.parseSuccess && result.schema) {
    try {
      const roundtripResult = roundtripUI(result.schema);
      result.dsl = roundtripResult.dsl;
      result.reconstructed = roundtripResult.reconstructed;
      result.roundtripSuccess = roundtripResult.isEquivalent;
      result.differences = roundtripResult.differences;

      if (result.roundtripSuccess) {
        console.log('✓ roundtripUI() PASSED');
        console.log(`  - Reconstructed DSL: "${result.dsl}"`);
      } else {
        console.log(`✗ roundtripUI() FAILED - Schema mismatch`);
        console.log(`  - Differences:`);
        result.differences?.forEach(diff => {
          console.log(`    * ${diff}`);
        });
      }
    } catch (error) {
      result.roundtripSuccess = false;
      result.roundtripError = error instanceof Error ? error.message : String(error);
      console.log(`✗ roundtripUI() FAILED: ${result.roundtripError}`);
    }
  }

  results.push(result);
  console.log();
}

// Summary Report
console.log('='.repeat(80));
console.log('SUMMARY REPORT');
console.log('='.repeat(80) + '\n');

const parsePassCount = results.filter(r => r.parseSuccess).length;
const roundtripPassCount = results.filter(r => r.roundtripSuccess).length;

console.log(`Total Tests: ${results.length}`);
console.log(`Parse Tests Passed: ${parsePassCount}/${results.length}`);
console.log(`Roundtrip Tests Passed: ${roundtripPassCount}/${results.length}`);
console.log();

// Detailed results table
console.log('DETAILED RESULTS:');
console.log('-'.repeat(80));
console.log(
  'Test Case'.padEnd(20) +
  'Parse'.padEnd(12) +
  'Roundtrip'.padEnd(12) +
  'Overall'.padEnd(12)
);
console.log('-'.repeat(80));

for (const result of results) {
  const testName = result.testCase.name.split(':')[0].trim().padEnd(20);
  const parseStatus = (result.parseSuccess ? '✓ PASS' : '✗ FAIL').padEnd(12);
  const roundtripStatus = (result.roundtripSuccess ? '✓ PASS' : '✗ FAIL').padEnd(12);
  const overallStatus = (result.parseSuccess && result.roundtripSuccess ? '✓ PASS' : '✗ FAIL').padEnd(12);

  console.log(testName + parseStatus + roundtripStatus + overallStatus);
}

console.log('-'.repeat(80) + '\n');

// Report per-test details
console.log('DETAILED BREAKDOWN:');
console.log('='.repeat(80) + '\n');

results.forEach((result, index) => {
  console.log(`${index + 1}. ${result.testCase.name}`);
  console.log(`   Source: ${result.testCase.source}`);
  console.log(`   Parse: ${result.parseSuccess ? 'PASS ✓' : 'FAIL ✗'}`);
  if (result.parseError) {
    console.log(`   Parse Error: ${result.parseError}`);
  }
  console.log(`   Roundtrip: ${result.roundtripSuccess ? 'PASS ✓' : 'FAIL ✗'}`);
  if (result.roundtripError) {
    console.log(`   Roundtrip Error: ${result.roundtripError}`);
  }
  if (result.differences && result.differences.length > 0) {
    console.log(`   Differences:`);
    result.differences.forEach(diff => {
      console.log(`     - ${diff}`);
    });
  }
  if (result.schema && result.schema.layers.length > 0) {
    const span = result.schema.layers[0].root.layout?.span;
    console.log(`   Parsed Span Value: ${span !== undefined ? span : '(none)'}`);
  }
  console.log();
});

// Final verdict
console.log('='.repeat(80));
console.log('FINAL VERDICT');
console.log('='.repeat(80) + '\n');

const allPassed = results.every(r => r.parseSuccess && r.roundtripSuccess);

if (allPassed) {
  console.log('✓ ALL TESTS PASSED - SPAN MODIFIERS VERIFIED');
  process.exit(0);
} else {
  console.log('✗ SOME TESTS FAILED - REVIEW REQUIRED');
  process.exit(1);
}
