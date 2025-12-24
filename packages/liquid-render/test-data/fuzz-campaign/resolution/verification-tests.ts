// Verification Tests for Bug Fixes
// Run with: npx tsx test-data/fuzz-campaign/resolution/verification-tests.ts

import { parseUI, compileUI, roundtripUI } from '../../../src/compiler/ui-compiler';
import type { LiquidSchema } from '../../../src/compiler/ui-emitter';

function testBug001LabelPreservation() {
  console.log('\n=== BUG-001: Label Preservation ===');

  const dsl = `Kp :revenue "Total Revenue" !h #green`;
  const schema = parseUI(dsl);
  const result = roundtripUI(schema);

  console.log('Original:', dsl);
  console.log('Roundtrip:', result.dsl);
  console.log('Equivalent:', result.isEquivalent);

  if (!result.isEquivalent) {
    console.log('Differences:', result.differences);
  }

  return result.isEquivalent;
}

function testBug002TextareaTypeCode() {
  console.log('\n=== BUG-002: Textarea Type Code ===');

  const dsl = `Ta :description`;
  const schema = parseUI(dsl);
  const result = roundtripUI(schema);

  console.log('Original:', dsl);
  console.log('Roundtrip:', result.dsl);
  console.log('Schema type:', schema.layers[0]?.root.type);

  const typeMatch = schema.layers[0]?.root.type === 'textarea';
  console.log('Type preserved:', typeMatch);

  return typeMatch;
}

function testBug003ConditionalColor() {
  console.log('\n=== BUG-003: Conditional Color ===');

  const dsl = `Tg :status #?=delivered:green,=shipped:blue,=pending:yellow`;
  const schema = parseUI(dsl);

  console.log('Original:', dsl);
  console.log('Color condition:', schema.layers[0]?.root.style?.colorCondition);

  const fullCondition = schema.layers[0]?.root.style?.colorCondition?.includes('pending');
  console.log('Full condition preserved:', fullCondition);

  return fullCondition;
}

function testBug004ConditionalEmission() {
  console.log('\n=== BUG-004: Conditional Emission ===');

  // Create a schema with condition
  const schema: LiquidSchema = {
    version: '1.0',
    signals: [{ name: 'tab' }],
    layers: [{
      id: 0,
      visible: true,
      root: {
        uid: 'b1',
        type: 'kpi',
        binding: { kind: 'field', value: 'revenue' },
        condition: { signal: 'tab', signalValue: '0' },
      }
    }]
  };

  const dsl = compileUI(schema);
  console.log('Compiled DSL:', dsl);

  const hasCondition = dsl.includes('?@tab=0');
  console.log('Condition emitted:', hasCondition);

  return hasCondition;
}

function testBug005MultipleReceivers() {
  console.log('\n=== BUG-005: Multiple Signal Receivers ===');

  const dsl = `Tb :results <search <role <dateRange [:name :email]`;
  const schema = parseUI(dsl);

  console.log('Original:', dsl);
  console.log('Signals.receive:', schema.layers[0]?.root.signals?.receive);

  const receive = schema.layers[0]?.root.signals?.receive;
  const multipleReceivers = Array.isArray(receive) && receive.length === 3;
  console.log('Multiple receivers preserved:', multipleReceivers);

  return multipleReceivers;
}

// Run all tests
console.log('='.repeat(60));
console.log('VERIFICATION TESTS FOR BUG FIXES');
console.log('='.repeat(60));

const results = {
  'BUG-001': testBug001LabelPreservation(),
  'BUG-002': testBug002TextareaTypeCode(),
  'BUG-003': testBug003ConditionalColor(),
  'BUG-004': testBug004ConditionalEmission(),
  'BUG-005': testBug005MultipleReceivers(),
};

console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));

let allPassed = true;
for (const [bug, passed] of Object.entries(results)) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${bug}: ${status}`);
  if (!passed) allPassed = false;
}

console.log('\nOverall:', allPassed ? '✅ ALL FIXES VERIFIED' : '❌ SOME FIXES FAILED');
process.exit(allPassed ? 0 : 1);
