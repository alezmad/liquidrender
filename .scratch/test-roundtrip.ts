// Test Script: Verify Liquid Schema → DSL → Schema roundtrip identity
import { roundtrip, compile, parse } from '../packages/liquid-render/src/compiler';
import { simpleFeedbackSurvey } from '../packages/liquid-render/src/samples/01-simple-feedback';
import { npsSurvey } from '../packages/liquid-render/src/samples/02-nps-survey';
import { productSatisfactionSurvey } from '../packages/liquid-render/src/samples/03-product-satisfaction';
import { employeeEngagementSurvey } from '../packages/liquid-render/src/samples/04-employee-engagement';
import { eventRegistrationSurvey } from '../packages/liquid-render/src/samples/05-event-registration';
import { medicalIntakeSurvey } from '../packages/liquid-render/src/samples/06-medical-intake';
import type { GraphSurvey } from '../packages/liquid-render/src/types';

// Deep comparison for full identity check
function deepEqual(a: unknown, b: unknown, path = ''): { equal: boolean; diff?: string } {
  if (a === b) return { equal: true };

  if (typeof a !== typeof b) {
    return { equal: false, diff: `${path}: type mismatch (${typeof a} vs ${typeof b})` };
  }

  if (a === null || b === null) {
    return { equal: a === b, diff: `${path}: null mismatch` };
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return { equal: false, diff: `${path}: array length mismatch (${a.length} vs ${b.length})` };
    }
    for (let i = 0; i < a.length; i++) {
      const result = deepEqual(a[i], b[i], `${path}[${i}]`);
      if (!result.equal) return result;
    }
    return { equal: true };
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;

    const aKeys = Object.keys(aObj).sort();
    const bKeys = Object.keys(bObj).sort();

    // Check for extra/missing keys
    const extraInA = aKeys.filter(k => !bKeys.includes(k));
    const extraInB = bKeys.filter(k => !aKeys.includes(k));

    if (extraInA.length > 0) {
      return { equal: false, diff: `${path}: extra keys in original [${extraInA.join(', ')}]` };
    }
    if (extraInB.length > 0) {
      return { equal: false, diff: `${path}: extra keys in reconstructed [${extraInB.join(', ')}]` };
    }

    for (const key of aKeys) {
      const result = deepEqual(aObj[key], bObj[key], `${path}.${key}`);
      if (!result.equal) return result;
    }
    return { equal: true };
  }

  return { equal: false, diff: `${path}: value mismatch (${JSON.stringify(a)} vs ${JSON.stringify(b)})` };
}

// Normalize schema for comparison (remove undefined/null values, normalize arrays)
function normalize(obj: unknown): unknown {
  if (obj === null || obj === undefined) return undefined;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(normalize).filter(x => x !== undefined);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const normalized = normalize(value);
    if (normalized !== undefined) {
      result[key] = normalized;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function testRoundtrip(name: string, survey: GraphSurvey) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${name}`);
  console.log('='.repeat(60));

  // Step 1: Compile to DSL
  console.log('\n--- Step 1: Compile to DSL ---');
  const dsl = compile(survey);
  console.log(dsl);

  // Step 2: Parse back to schema
  console.log('\n--- Step 2: Parse back to Schema ---');
  const reconstructed = parse(dsl);
  console.log('Reconstructed ID:', reconstructed.id);
  console.log('Reconstructed Title:', reconstructed.title);
  console.log('Reconstructed Nodes:', Object.keys(reconstructed.nodes).length);

  // Step 3: Use built-in roundtrip
  console.log('\n--- Step 3: Built-in Roundtrip Check ---');
  const result = roundtrip(survey);
  console.log('Is Equivalent (built-in):', result.isEquivalent);
  if (result.differences.length > 0) {
    console.log('Differences:', result.differences);
  }

  // Step 4: Deep equality check
  console.log('\n--- Step 4: Deep Equality Check ---');
  const normalizedOriginal = normalize(survey);
  const normalizedReconstructed = normalize(reconstructed);

  const deepResult = deepEqual(normalizedOriginal, normalizedReconstructed);
  console.log('Deep Equal:', deepResult.equal);
  if (!deepResult.equal) {
    console.log('First Difference:', deepResult.diff);
  }

  // Step 5: Double roundtrip (DSL → Schema → DSL)
  console.log('\n--- Step 5: Double Roundtrip (DSL → Schema → DSL) ---');
  const dsl2 = compile(reconstructed);
  const identical = dsl === dsl2;
  console.log('DSL Identical:', identical);
  if (!identical) {
    console.log('\nOriginal DSL:');
    console.log(dsl);
    console.log('\nRecompiled DSL:');
    console.log(dsl2);
  }

  // Summary
  console.log('\n--- Summary ---');
  const passed = result.isEquivalent && deepResult.equal && identical;
  console.log(passed ? '✅ IDENTITY MAINTAINED' : '❌ IDENTITY LOST');

  return {
    name,
    passed,
    builtInEquivalent: result.isEquivalent,
    deepEqual: deepResult.equal,
    dslIdentical: identical,
    differences: result.differences,
    deepDiff: deepResult.diff,
  };
}

// Run tests
console.log('Liquid Render - Roundtrip Identity Test');
console.log('Testing: JSON Schema → DSL → JSON Schema → DSL');

const results = [
  testRoundtrip('Simple Feedback Survey', simpleFeedbackSurvey),
  testRoundtrip('NPS Survey', npsSurvey),
  testRoundtrip('Product Satisfaction Survey', productSatisfactionSurvey),
  testRoundtrip('Employee Engagement Survey', employeeEngagementSurvey),
  testRoundtrip('Event Registration Survey', eventRegistrationSurvey),
  testRoundtrip('Medical Intake Survey', medicalIntakeSurvey),
];

// Final summary
console.log('\n' + '='.repeat(60));
console.log('FINAL RESULTS');
console.log('='.repeat(60));

for (const r of results) {
  console.log(`${r.passed ? '✅' : '❌'} ${r.name}`);
  if (!r.passed) {
    console.log(`   Built-in: ${r.builtInEquivalent}, Deep: ${r.deepEqual}, DSL: ${r.dslIdentical}`);
    if (r.differences.length > 0) console.log(`   Differences: ${r.differences.join('; ')}`);
    if (r.deepDiff) console.log(`   Deep diff: ${r.deepDiff}`);
  }
}

const allPassed = results.every(r => r.passed);
console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
process.exit(allPassed ? 0 : 1);
